// Shared by the scripts: reads a Slidev deck with Slidev's own parser, so slide
// numbers, frontmatter, notes and `src:` imports match what Slidev shows.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { load } from "@slidev/parser/fs";

/** Loads .env from the working directory (the deck root) when there is one. Exported variables win. */
export function loadDotEnv() {
  try {
    process.loadEnvFile(resolve(".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

/**
 * Every slide in presentation order: { number, title, heading, frontmatter, content, note, markdown }.
 * `note` is the slide's speaker notes (Slidev uses the last comment block), `markdown` the slide
 * as written, and `heading` its first # or ## heading.
 */
export async function loadDeck(path) {
  const filepath = resolve(path);
  readFileSync(filepath); // fail early, with the path in the error, when the deck doesn't exist
  const root = dirname(filepath);
  const data = await load({ roots: [root], userRoot: root }, filepath);
  const slides = data.slides.map((slide, index) => ({
    number: index + 1,
    title: slide.title?.trim() || slide.frontmatter?.title?.toString().trim() || "",
    heading: slide.content.match(/^#{1,2}\s+(.+)$/mu)?.[1]?.trim() ?? "",
    frontmatter: slide.frontmatter ?? {},
    content: slide.content,
    note: slide.note?.trim() ?? "",
    markdown: [
      slide.frontmatterRaw?.trim() ? `---\n${slide.frontmatterRaw.trim()}\n---` : "",
      slide.content.trim(),
      slide.note?.trim() ? `<!--\n${slide.note.trim()}\n-->` : "",
    ].filter(Boolean).join("\n\n"),
  }));
  return { title: data.headmatter?.title?.toString() ?? "", slides };
}

/** The deck as one markdown text (imports inlined), for context. */
export function deckMarkdown(deck) {
  return deck.slides.map((slide) => slide.markdown).join("\n\n---\n\n");
}

/** Slide content that renders: code fences and HTML comments removed. */
export function activeContent(content) {
  return content
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gmu, "")
    .replace(/<!--[\s\S]*?-->/gu, "");
}

export function decodeEntities(text) {
  const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, code) => {
    if (code[0] === "#") {
      const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return String.fromCodePoint(point);
    }
    return named[code.toLowerCase()] ?? entity;
  });
}
