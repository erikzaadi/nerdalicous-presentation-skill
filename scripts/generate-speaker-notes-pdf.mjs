#!/usr/bin/env node

// Renders the deck's speaker notes (the <!-- ... --> block of every slide in
// slides.md) as a printable A4 PDF: one card per slide with its number, title
// and presenter. --lang he (or another RTL language) lays the notes out right to left.
//
//   node generate-speaker-notes-pdf.mjs [--input slides.md] [--output speaker-notes.pdf] [--lang en]

import { resolve } from "node:path";
import { chromium } from "playwright-chromium";
import { loadDeck } from "./deck.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, item, index, all) => {
    if (item.startsWith("--")) pairs.push([item.slice(2), all[index + 1]]);
    return pairs;
  }, []),
);
const inputPath = resolve(args.input ?? "slides.md");
const outputPath = resolve(args.output ?? "speaker-notes.pdf");
const lang = args.lang ?? "en";
const dir = ["he", "ar", "fa", "ur"].includes(lang) ? "rtl" : "ltr";

const deck = await loadDeck(inputPath);
const deckTitle = deck.title || "Speaker notes";
const cards = deck.slides.filter((slide) => slide.note).map(renderCard).join("\n");
if (!cards) {
  console.error("No speaker notes (<!-- ... -->) found in the deck");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(renderPage(deckTitle, cards), { waitUntil: "load" });
await page.pdf({ path: outputPath, format: "A4", printBackground: true });
await browser.close();
console.log(`Done: ${outputPath}`);

function slideTitle({ number, heading, frontmatter, content }) {
  // the first slide's frontmatter is the deck's headmatter, so its title is the deck's
  const title = heading || (number === 1 ? "" : frontmatter.title?.toString() ?? "");
  if (number === 1) return title ? `Cover: ${title.replace(/<br\s*\/?>/giu, " ")}` : "Cover";
  if (title) return title;
  const terminal = content.match(/<TerminalWindow[^>]*title="([^"]+)"/u)?.[1];
  if (terminal) return `Terminal: ${terminal}`;
  const image = `${frontmatter.image ?? ""}\n${content}`.match(/images\/([\w-]+)\.\w+/u)?.[1];
  if (image) return `${image.replace(/-/gu, " ").replace(/^./u, (c) => c.toUpperCase())} (image)`;
  return "";
}

function renderCard(slide) {
  const notes = slide.note.split("\n");
  const speaker = /^\[[^\]]+\]$/u.test(notes[0]?.trim() ?? "") ? notes.shift().trim() : "";
  let html = "";
  let inList = false;
  for (const raw of notes) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const isItem = /^\s*-\s/u.test(line);
    if (isItem && !inList) html += "<ul>";
    if (!isItem && inList) html += "</ul>";
    inList = isItem;
    const text = escapeHtml(line.replace(/^\s*-\s*/u, "").trim());
    if (isItem) html += `<li>${text}</li>`;
    else if (/^(?:Handoff|מעבר)/iu.test(line.trim())) html += `<p class="handoff">${text}</p>`;
    else html += `<p>${text}</p>`;
  }
  if (inList) html += "</ul>";
  return `<section>
  <header><span class="num">${slide.number}</span><span class="title" dir="ltr">${escapeHtml(slideTitle(slide))}</span><span class="who">${escapeHtml(speaker)}</span></header>
  ${html}
</section>`;
}

function renderPage(title, body) {
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} · speaker notes</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; font-size: 13pt; line-height: 1.55; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 8mm; direction: ltr; text-align: left; }
  section { break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; padding: 4mm 5mm; margin-bottom: 5mm; }
  header { display: flex; align-items: baseline; gap: 3mm; border-bottom: 1px solid #eee; padding-bottom: 2mm; margin-bottom: 2mm; }
  .num { font-weight: 800; font-size: 15pt; color: #0891b2; }
  .title { font-weight: 700; flex: 1; text-align: left; }
  .who { font-weight: 700; color: #7c3aed; }
  ul { margin: 0; padding-inline-start: 6mm; }
  li, p { margin: 1mm 0; }
  .handoff { margin-top: 2mm; color: #555; font-style: italic; }
</style>
</head>
<body>
<h1>${escapeHtml(title)} · speaker notes</h1>
${body}
</body>
</html>`;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/gu, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
