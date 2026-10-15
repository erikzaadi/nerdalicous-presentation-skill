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

const PLACEHOLDER_KINDS = ["image", "gif", "meme"];

/**
 * Every <ImageTBD ... /> that renders, in order: { kind, number, name, attrs, slideNumber, title, slide }.
 * `kind` is image (the default), gif or meme, and `number` counts within the kind. Names are unique
 * across kinds, since every kind lands in public/images/. Placeholders inside code fences or comments
 * are examples, not requests, so they're skipped. Throws on a malformed placeholder.
 */
export function findPlaceholders(slides) {
  const seen = new Set();
  const counts = {};
  const found = [];
  for (const slide of slides) {
    for (const match of activeContent(slide.content).matchAll(/<ImageTBD\b([^>]*?)\/?>/gsu)) {
      const attrs = Object.fromEntries(
        [...match[1].matchAll(/([\w:.@-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)].map((m) => [m[1], decodeEntities(m[2] ?? m[3])]),
      );
      const where = `ImageTBD on slide ${slide.number}`;
      const bound = Object.keys(attrs).find((key) => key.startsWith(":") || key.startsWith("v-bind:"));
      if (bound) throw new Error(`${where} binds ${bound} dynamically; write it as a literal attribute`);
      const kind = attrs.kind ?? "image";
      if (!PLACEHOLDER_KINDS.includes(kind)) throw new Error(`${where}: kind="${kind}" must be one of ${PLACEHOLDER_KINDS.join(", ")}`);
      if (kind === "meme" && !attrs.template) throw new Error(`${where} is a meme with no template attribute`);
      if (kind !== "meme" && !attrs.prompt) throw new Error(`${where} has no prompt attribute`);
      // name="robot-strike" on the placeholder wins; otherwise a slug of its text
      if (attrs.name !== undefined && !/^[a-z0-9][a-z0-9-]*$/u.test(attrs.name)) {
        throw new Error(`${where}: name="${attrs.name}" must be kebab-case (a-z, 0-9, -), with no folders or extension`);
      }
      const number = (counts[kind] = (counts[kind] ?? 0) + 1);
      const text = kind === "meme" ? memeLines(attrs).join(" ") : attrs.prompt;
      let name = attrs.name || slugify(text) || `${kind}-${number}`;
      while (seen.has(name)) name += "-2";
      seen.add(name);
      found.push({
        kind,
        number,
        name,
        attrs,
        prompt: attrs.prompt ?? "",
        slideNumber: slide.number,
        title: slide.frontmatter.title?.toString() || slide.heading,
        slide: slide.markdown,
      });
    }
  }
  return found;
}

/** A meme placeholder's text lines: lines="a|b|c", or top="..." bottom="...". */
export function memeLines(attrs) {
  return attrs.lines !== undefined ? attrs.lines.split("|").map((line) => line.trim()) : [attrs.top ?? "", attrs.bottom ?? ""];
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gu, "")
    .split(/\s+/u)
    .filter((word) => word && !["a", "an", "the", "of", "with", "and", "in", "on", "at", "to"].includes(word))
    .slice(0, 4)
    .join("-");
}
