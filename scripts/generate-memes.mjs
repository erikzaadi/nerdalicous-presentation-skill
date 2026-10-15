#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { findPlaceholders, loadDeck, memeLines } from "./deck.mjs";

// Turns the deck's <ImageTBD kind="meme" template="..." top="..." bottom="..." /> placeholders
// into meme images with memegen.link: free, no account, no API key.
// --list first (it prints each meme's URL to preview), then --all or --only 2,5.
// --templates <word> searches memegen's template ids.

const api = "https://api.memegen.link";
const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input ?? "slides.md");
const outDir = resolve(args["out-dir"] ?? "public/images");
const format = args.format ?? "png";
const width = args.width ?? "1200";
const force = Boolean(args.force);

if (!["png", "jpg", "gif", "webp"].includes(format)) fail("--format must be png, jpg, gif (animated templates) or webp");
if (!/^\d+$/u.test(width)) fail("--width must be a number of pixels");

if (args.templates) {
  const templates = await getJson(`${api}/templates?filter=${encodeURIComponent(args.templates)}`);
  if (!templates.length) {
    console.log(`No memegen templates match "${args.templates}". Browse them all at ${api}/templates`);
    process.exit(0);
  }
  for (const t of templates) console.log(`  ${t.id.padEnd(16)} ${t.name} (${t.lines} line${t.lines === 1 ? "" : "s"})  ${t.example.url}`);
  process.exit(0);
}

const deckData = await loadDeck(inputPath);
let placeholders;
try {
  placeholders = findPlaceholders(deckData.slides).filter((p) => p.kind === "meme");
} catch (error) {
  fail(error.message);
}
if (!placeholders.length) {
  console.log(`No <ImageTBD kind="meme" ... /> placeholders left in ${inputPath}.`);
  process.exit(0);
}

// --only beats --all, so `npm run memes -- --only 2` (whose script passes --all) picks just #2
const selected = args.only
  ? args.only.split(",").map((n) => placeholders[Number(n) - 1] ?? fail(`No meme placeholder #${n}`))
  : args.all
    ? placeholders
    : [];

if (!selected.length || args.list) {
  console.log(`${placeholders.length} meme placeholders in ${inputPath}:\n`);
  for (const p of placeholders) {
    const done = (await exists(join(outDir, `${p.name}.${format}`))) ? "  [exists]" : "";
    console.log(`  ${String(p.number).padStart(2)}. ${p.name}.${format}  (slide ${p.slideNumber}: ${p.title || "untitled"})${done}`);
    console.log(`      ${p.attrs.template}: ${memeLines(p.attrs).map((line) => `"${line}"`).join(" / ")}`);
    console.log(`      ${memeUrl(p)}\n`);
  }
  console.log("Download the missing ones with --all, or pick with --only 1,3. Search template ids with --templates <word>.");
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
const made = [];
for (const p of selected) {
  const outPath = join(outDir, `${p.name}.${format}`);
  if (!force && (await exists(outPath))) {
    console.log(`#${p.number} ${p.name}.${format} exists, skipping (--force to remake)`);
    continue;
  }
  const template = await getJson(`${api}/templates/${encodeURIComponent(p.attrs.template)}`).catch(() =>
    fail(`Meme #${p.number} (slide ${p.slideNumber}): no memegen template "${p.attrs.template}". Search with: npm run memes -- --templates <word>`),
  );
  const lines = memeLines(p.attrs);
  if (lines.length > template.lines) {
    console.log(`  Warning: ${template.id} has ${template.lines} text line(s), but meme #${p.number} gives ${lines.length}; the extra ones are dropped.`);
  }
  console.log(`#${p.number} Making ${outPath}...`);
  const response = await fetch(memeUrl(p), { signal: AbortSignal.timeout(60_000) });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    fail(`memegen returned ${response.status} for ${memeUrl(p)}`);
  }
  await writeFile(outPath, Buffer.from(await response.arrayBuffer()));
  made.push(p);
}

if (made.length) {
  console.log(`\nMade ${made.length} meme(s):`);
  for (const p of made) console.log(`  slide ${p.slideNumber}: /images/${p.name}.${format}`);
  console.log(
    "\nLook at each one first (the text fits, the joke still lands). Then ask your agent:\n" +
      `  "I made the memes for slide${made.length > 1 ? "s" : ""} ${made.map((p) => p.slideNumber).join(", ")}. ` +
      `Swap their ImageTBD placeholders for meme slides."`,
  );
}

function memeUrl(p) {
  const lines = memeLines(p.attrs).map(escapeLine);
  return `${api}/images/${encodeURIComponent(p.attrs.template)}/${lines.join("/")}.${format}?width=${width}`;
}

/** memegen's path escaping: https://github.com/jacebrowning/memegen#special-characters */
function escapeLine(line) {
  if (!line) return "_";
  const escaped = line
    .replace(/_/gu, "__")
    .replace(/-/gu, "--")
    .replace(/\?/gu, "~q")
    .replace(/&/gu, "~a")
    .replace(/%/gu, "~p")
    .replace(/#/gu, "~h")
    .replace(/\//gu, "~s")
    .replace(/\\/gu, "~b")
    .replace(/</gu, "~l")
    .replace(/>/gu, "~g")
    .replace(/"/gu, "''")
    .replace(/\n/gu, "~n")
    .replace(/ /gu, "_");
  return encodeURIComponent(escaped);
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`memegen ${response.status}: ${url}`);
  return response.json();
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
  const flags = ["all", "list", "force"];
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
