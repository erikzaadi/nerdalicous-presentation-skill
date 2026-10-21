#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findPlaceholders, loadDeck, loadDotEnv } from "./deck.mjs";

// Finds GIFs for the deck's <ImageTBD kind="gif" prompt="..." source="..." /> placeholders.
// Picking a GIF takes taste, so the script never picks one:
//   --search    asks Giphy for candidates and writes gif-picks.html, a contact sheet to pick from
//               (needs GIPHY_API_KEY in .env)
//   --download  saves each placeholder's pick="<id or giphy URL>" into public/images/<name>.gif
//               (no key needed)
//   --list      (the default) shows every GIF placeholder, its pick, and a giphy.com search link

loadDotEnv();
const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input ?? "slides.md");
const outDir = resolve(args["out-dir"] ?? "public/images");
const sheetPath = resolve(args.sheet ?? "gif-picks.html");
const limit = Number(args.limit ?? 8);
const rating = args.rating ?? process.env.GIPHY_RATING ?? "pg-13";
const force = Boolean(args.force);
const apiKey = process.env.GIPHY_API_KEY;
const MAX_QUERY = 50; // Giphy's limit for the search query

if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail("--limit must be between 1 and 50");
if (!["g", "pg", "pg-13", "r"].includes(rating)) fail("--rating must be g, pg, pg-13 or r");
// fail before reading the deck, like the OpenAI scripts; only --search talks to the Giphy API
if (args.search && !apiKey) {
  fail(
    "GIPHY_API_KEY is not set. Put it in .env next to slides.md (see .env.example; free key: https://developers.giphy.com/dashboard/).\n" +
      "No key? Browse the giphy.com links from npm run gifs:list and paste a GIF's URL into pick=\"...\".",
  );
}

const deckData = await loadDeck(inputPath);
let placeholders;
try {
  placeholders = findPlaceholders(deckData.slides).filter((p) => p.kind === "gif");
} catch (error) {
  fail(error.message);
}
if (!placeholders.length) {
  console.log(`No <ImageTBD kind="gif" ... /> placeholders left in ${inputPath}.`);
  process.exit(0);
}
for (const p of placeholders) {
  p.query = searchQuery(p.prompt, p.attrs.source);
  p.pickId = p.attrs.pick ? (parsePick(p.attrs.pick) ?? fail(`GIF #${p.number} (slide ${p.slideNumber}): can't read a Giphy id from pick="${p.attrs.pick}"`)) : "";
  p.done = await exists(join(outDir, `${p.name}.gif`));
}

const selected = args.only
  ? args.only.split(",").map((n) => placeholders[Number(n) - 1] ?? fail(`No GIF placeholder #${n}`))
  : placeholders;

if (args.search) await search();
else if (args.download) await download();
else list();

function list() {
  console.log(`${placeholders.length} GIF placeholders in ${inputPath}:\n`);
  for (const p of placeholders) {
    const status = p.done ? "  [exists]" : p.pickId ? `  [picked ${p.pickId}]` : "";
    console.log(`  ${String(p.number).padStart(2)}. ${p.name}.gif  (slide ${p.slideNumber}: ${p.title || "untitled"})${status}`);
    console.log(`      "${p.prompt}"${p.attrs.source ? ` (${p.attrs.source})` : ""}  ${searchUrl(p.query)}\n`);
  }
  console.log(
    "Find candidates with --search (needs GIPHY_API_KEY), or browse the links above.\n" +
      'Add pick="<giphy id or URL>" to a placeholder, then --download saves it.',
  );
}

async function search() {
  // without --only, skip the placeholders that already have their GIF
  const todo = args.only ? selected : selected.filter((p) => !p.done);
  if (!todo.length) {
    console.log("Every GIF placeholder already has its file. --only 1,3 searches again for specific ones.");
    return;
  }
  for (const p of todo) {
    console.log(`#${p.number} Searching Giphy for "${p.query}"...`);
    let response = await giphySearch(p.query);
    // a 414 "Query Too Long" means Giphy still wants less; the prompt alone is the moment
    if (response.status === 414 && p.query !== searchQuery(p.prompt)) {
      console.log(`  Query too long for Giphy; retrying with the prompt only.`);
      response = await giphySearch(searchQuery(p.prompt));
    }
    if (response.status === 401 || response.status === 403) fail(`Giphy rejected GIPHY_API_KEY (${response.status}). Check the key in .env, or create a new one at https://developers.giphy.com/dashboard/`);
    if (response.status === 429) fail("Giphy's rate limit for this key is used up; wait an hour, or search fewer placeholders with --only.");
    if (!response.ok) fail(`Giphy API ${response.status}: ${await response.text()}`);
    p.results = (await response.json()).data.map((gif) => ({
      id: gif.id,
      title: gif.title || gif.slug,
      preview: gif.images.fixed_height.url,
      width: Number(gif.images.original.width),
      height: Number(gif.images.original.height),
      bytes: Number(gif.images.original.size),
    }));
  }
  await writeFile(sheetPath, contactSheet(todo));
  console.log(
    `\nWrote ${sheetPath}\nOpen it, click one GIF per slide, and paste the prompt it builds to your agent:\n  ${pathToFileURL(sheetPath)}`,
  );
}

async function download() {
  const todo = selected.filter((p) => p.pickId && (force || !p.done));
  const unpicked = selected.filter((p) => !p.pickId && !p.done);
  if (!todo.length) {
    console.log(`Nothing new to download.${unpicked.length ? ` ${unpicked.length} GIF placeholder(s) have no pick="..." yet; run --search or --list.` : " --force downloads existing GIFs again."}`);
    return;
  }
  await mkdir(outDir, { recursive: true });
  for (const p of todo) {
    const outPath = join(outDir, `${p.name}.gif`);
    console.log(`#${p.number} Downloading ${p.pickId} → ${outPath}...`);
    // the plain media URL needs no API key
    const response = await fetch(`https://media.giphy.com/media/${p.pickId}/giphy.gif`, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok || response.headers.get("content-type") !== "image/gif") {
      fail(`Giphy returned ${response.status} for GIF ${p.pickId}; check pick="${p.attrs.pick}" on slide ${p.slideNumber}`);
    }
    const gif = Buffer.from(await response.arrayBuffer());
    await writeFile(outPath, gif);
    console.log(`  Saved (${megabytes(gif.length)}).`);
  }
  console.log(`\nDownloaded ${todo.length} GIF(s):`);
  for (const p of todo) console.log(`  slide ${p.slideNumber}: /images/${p.name}.gif`);
  if (unpicked.length) console.log(`Still unpicked: ${unpicked.map((p) => `#${p.number} (slide ${p.slideNumber})`).join(", ")}`);
  console.log(
    "\nThen ask your agent:\n" +
      `  "I downloaded the GIFs for slide${todo.length > 1 ? "s" : ""} ${todo.map((p) => p.slideNumber).join(", ")}. ` +
      `Swap their ImageTBD placeholders for GIF slides."`,
  );
}

function giphySearch(query) {
  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.search = new URLSearchParams({ api_key: apiKey, q: query, limit: String(limit), rating, lang: "en" });
  return fetch(url, { signal: AbortSignal.timeout(30_000) });
}

/**
 * Giphy caps q at 50 characters and answers 414 "Query Too Long" past it.
 * The prompt is the moment, so `source` is trimmed first (whole words from the end), then the prompt.
 */
function searchQuery(prompt, source = "", max = MAX_QUERY) {
  const fit = (text, room) => {
    const words = [];
    for (const word of text.split(/\s+/u).filter(Boolean)) {
      if ([...words, word].join(" ").length > room) break;
      words.push(word);
    }
    return words.join(" ");
  };
  const query = fit(prompt, max) || prompt.slice(0, max);
  const prefix = source ? fit(source, max - query.length - 1) : "";
  return [prefix, query].filter(Boolean).join(" ");
}

/** A Giphy id from an id, a giphy.com/gifs/<slug>-<id> page, or a media.giphy.com / i.giphy.com URL. */
function parsePick(pick) {
  const value = pick.trim();
  if (/^[A-Za-z0-9]+$/u.test(value)) return value;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!/(^|\.)giphy\.com$/u.test(url.hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const media = parts.indexOf("media");
  if (media !== -1) return parts.at(media + 1)?.match(/^[A-Za-z0-9]+$/u)?.[0] ?? null;
  if (url.hostname === "i.giphy.com") return parts.at(-1)?.replace(/\.\w+$/u, "") ?? null;
  return parts.at(-1)?.split("-").at(-1) ?? null;
}

function searchUrl(query) {
  return `https://giphy.com/search/${encodeURIComponent(query.toLowerCase().replace(/\s+/gu, "-"))}`;
}

function megabytes(bytes) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function contactSheet(items) {
  const sections = items.map((p) => {
    const cards = p.results.length
      ? p.results.map((gif) => `
        <button class="card" data-slot="${p.number}" data-id="${escapeHtml(gif.id)}">
          <img src="${escapeHtml(gif.preview)}" alt="${escapeHtml(gif.title)}" loading="lazy">
          <span class="meta">${escapeHtml(gif.title)}<br><code>${escapeHtml(gif.id)}</code> · ${gif.width}×${gif.height} · ${megabytes(gif.bytes)}</span>
        </button>`).join("")
      : `<p class="empty">No results. Try a different prompt, or <a href="${escapeHtml(searchUrl(p.query))}">search giphy.com</a>.</p>`;
    return `
    <section data-slot="${p.number}" data-slide="${p.slideNumber}" data-name="${escapeHtml(p.name)}">
      <h2>#${p.number} · slide ${p.slideNumber} · <code>${escapeHtml(p.name)}.gif</code></h2>
      <p class="query">“${escapeHtml(p.prompt)}”${p.attrs.source ? ` (${escapeHtml(p.attrs.source)})` : ""} ·
        <a href="${escapeHtml(searchUrl(p.query))}" target="_blank" rel="noopener">more on giphy.com</a></p>
      <div class="grid">${cards}</div>
    </section>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GIF picks</title>
<style>
  :root { color-scheme: dark; --bg: #121212; --card: #1e1e1e; --line: #3a3a3a; --text: #f2f2f2; --muted: #a8a8a8; --accent: #2dd4bf; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 1.5rem 1rem 12rem; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 72rem; margin: 0 auto; }
  h1 { margin: 0 0 0.25rem; }
  h2 { margin: 2.5rem 0 0.25rem; font-size: 1.15rem; }
  a { color: var(--accent); }
  code { font-family: ui-monospace, monospace; font-size: 0.9em; }
  .query, .lead, .empty { color: var(--muted); margin: 0 0 1rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.75rem; }
  .card { display: flex; flex-direction: column; padding: 0; border: 2px solid var(--line); border-radius: 12px; background: var(--card); color: inherit; font: inherit; text-align: left; cursor: pointer; overflow: hidden; }
  .card:hover { border-color: var(--muted); }
  .card[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
  .card img { width: 100%; height: 11rem; object-fit: cover; background: #000; }
  .meta { padding: 0.5rem 0.75rem; font-size: 0.8rem; color: var(--muted); overflow-wrap: anywhere; }
  footer { margin-top: 3rem; color: var(--muted); font-size: 0.8rem; }
  .tray { position: fixed; inset: auto 0 0 0; padding: 0.75rem 1rem; background: var(--card); border-top: 1px solid var(--line); }
  .tray div { max-width: 72rem; margin: 0 auto; display: flex; gap: 0.75rem; align-items: flex-start; }
  textarea { flex: 1; min-height: 4.5rem; padding: 0.5rem; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--text); font: 0.85rem/1.4 ui-monospace, monospace; resize: vertical; }
  .copy { padding: 0.5rem 1rem; border: 0; border-radius: 8px; background: var(--accent); color: #062a26; font: inherit; font-weight: 700; cursor: pointer; }
</style>
</head>
<body>
<main>
  <h1>GIF picks</h1>
  <p class="lead">Click one GIF per slide. The box at the bottom turns your picks into a prompt for your agent. Previews are small; the size shown is the full GIF that lands in the deck.</p>
  ${sections}
  <footer>Powered by GIPHY. Rating: ${escapeHtml(rating)}.</footer>
</main>
<div class="tray"><div>
  <textarea id="prompt" readonly placeholder="Pick a GIF and the prompt for your agent appears here."></textarea>
  <button class="copy" id="copy">Copy</button>
</div></div>
<script>
  const picks = {};
  const promptBox = document.getElementById("prompt");
  document.querySelectorAll(".card").forEach((card) => {
    card.setAttribute("aria-pressed", "false");
    card.addEventListener("click", () => {
      const slot = card.dataset.slot;
      document.querySelectorAll('.card[data-slot="' + slot + '"]').forEach((other) => other.setAttribute("aria-pressed", String(other === card)));
      picks[slot] = card.dataset.id;
      const lines = Object.entries(picks).map(([n, id]) => {
        const section = document.querySelector('section[data-slot="' + n + '"]');
        return "- slide " + section.dataset.slide + " (" + section.dataset.name + "): pick=\\"" + id + "\\"";
      });
      promptBox.value = "Set these GIF picks on the ImageTBD placeholders, run npm run gifs, and swap them for GIF slides:\\n" + lines.join("\\n");
    });
  });
  document.getElementById("copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(promptBox.value); } catch { promptBox.select(); document.execCommand("copy"); }
  });
</script>
</body>
</html>
`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(items) {
  const flags = ["search", "download", "list", "force"];
  const result = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) fail(`Unexpected argument: ${item}`);
    const key = item.slice(2);
    if (flags.includes(key)) {
      result[key] = true;
      continue;
    }
    const value = items[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for --${key}`);
    result[key] = value;
    index += 1;
  }
  return result;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
