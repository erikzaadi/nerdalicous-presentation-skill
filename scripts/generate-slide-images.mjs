#!/usr/bin/env node

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { deckMarkdown, findPlaceholders, loadDeck, loadDotEnv } from "./deck.mjs";

// Turns the deck's <ImageTBD prompt="..." /> placeholders into slide images.
// The whole deck goes along as context (like uploading slides.md to ChatGPT),
// so every image knows the talk's story, tone and recurring characters.
// Opt in per image: --list first, then --only 2,5 or --all. GIF and meme placeholders
// (kind="gif" / kind="meme") belong to find-gifs.mjs and generate-memes.mjs.

loadDotEnv();
const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input ?? "slides.md");
const outDir = resolve(args["out-dir"] ?? "public/images");
const model = args.model ?? process.env.OPENAI_IMAGE_CONTEXT_MODEL ?? "gpt-5.5";
const imageModel = args["image-model"] ?? process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-flare";
// Slidev slides are 16:9. 2560x1440 is the largest non-experimental size.
const size = args.size ?? "2560x1440";
const quality = args.quality ?? "high";
const format = args.format ?? "png";
const style = args.style ?? process.env.OPENAI_IMAGE_STYLE ?? "";
const styleRefs = (args["style-ref"] ?? "").split(",").map((path) => path.trim()).filter(Boolean);
const withContext = !args["no-context"];
const force = Boolean(args.force);
const dryRun = Boolean(args["dry-run"]);
const apiKey = process.env.OPENAI_API_KEY;

if (!/^\d+x\d+$/u.test(size) || size.split("x").some((edge) => Number(edge) % 16)) {
  fail("--size must be WIDTHxHEIGHT with both edges divisible by 16, e.g. 2560x1440");
}

const deckData = await loadDeck(inputPath);
const deck = deckMarkdown(deckData);
let placeholders;
try {
  placeholders = findPlaceholders(deckData.slides).filter((p) => p.kind === "image");
} catch (error) {
  fail(error.message);
}
if (!placeholders.length) {
  console.log(`No <ImageTBD prompt="..." /> placeholders left in ${inputPath}.`);
  process.exit(0);
}

// --only beats --all, so `npm run images -- --only 2` (whose script passes --all) picks just #2
const selected = args.only
  ? args.only.split(",").map((n) => placeholders[Number(n) - 1] ?? fail(`No placeholder #${n}`))
  : args.all
    ? placeholders
    : [];

if (!selected.length || args.list) {
  console.log(`${placeholders.length} image placeholders in ${inputPath}:\n`);
  for (const p of placeholders) {
    const done = (await exists(join(outDir, `${p.name}.${format}`))) ? "  [exists]" : "";
    console.log(`  ${String(p.number).padStart(2)}. ${p.name}.${format}  (slide ${p.slideNumber}: ${p.title || "untitled"})${done}`);
    console.log(`      ${p.prompt}\n`);
  }
  console.log("Generate the missing ones with --all, or pick with --only 1,3. Add --dry-run to see the requests first.");
  process.exit(0);
}

const todo = [];
for (const p of selected) {
  if (!force && (await exists(join(outDir, `${p.name}.${format}`)))) {
    console.log(`#${p.number} ${p.name}.${format} exists, skipping (--force to regenerate)`);
  } else {
    todo.push(p);
  }
}
if (!todo.length) {
  console.log("\nNothing new to generate. --force regenerates existing images.");
  process.exit(0);
}

if (!dryRun && !apiKey) fail("OPENAI_API_KEY is not set. Put it in .env next to slides.md.");

console.log(`Model:  ${model} → ${imageModel}, ${size}, quality ${quality}`);
console.log(`Context: ${withContext ? `whole deck (${deck.length.toLocaleString()} chars)` : "slide only"}`);
if (styleRefs.length) console.log(`Style refs: ${styleRefs.join(", ")}`);

const refImages = await Promise.all(styleRefs.map(toDataUrl));
if (!dryRun) await mkdir(outDir, { recursive: true });

const generated = [];
for (const p of todo) {
  const outPath = join(outDir, `${p.name}.${format}`);
  const request = buildRequest(p, refImages);
  if (dryRun) {
    const { content } = request.input[0];
    console.log(`\n#${p.number} → ${outPath}`);
    console.log(`Request: ${request.model} with the image_generation tool (${JSON.stringify(request.tools[0])})`);
    console.log(`Inputs: ${withContext ? `the whole deck (${deck.length.toLocaleString()} chars), ` : ""}${refImages.length} reference image(s), and this brief:\n`);
    console.log(content.at(-1).text);
    continue;
  }
  console.log(`#${p.number} Generating ${outPath}...`);
  const image = await generate(request);
  await writeFile(outPath, image);
  console.log(`  Saved.`);
  generated.push(p);
}

if (generated.length) {
  console.log(`\nGenerated ${generated.length} image(s):`);
  for (const p of generated) console.log(`  slide ${p.slideNumber}: /images/${p.name}.${format}`);
  console.log(
    "\nLook at each one first (on-image spelling, a calm bottom-left corner). Then ask your agent:\n" +
      `  "I generated the images for slide${generated.length > 1 ? "s" : ""} ${generated.map((p) => p.slideNumber).join(", ")}. ` +
      `Swap their ImageTBD placeholders for full-bleed photo slides."`,
  );
}

function buildRequest(placeholder, refs) {
  const brief = [
    `Generate one image for slide ${placeholder.slideNumber}${placeholder.title ? ` ("${placeholder.title}")` : ""}.`,
    `Image prompt: ${placeholder.prompt}`,
    "It is a full-bleed 16:9 slide background: fill the whole frame edge to edge, with no borders, frames, captions, watermarks or slide titles.",
    "Keep any text the prompt asks for to a few short, correctly spelled words.",
    "No real company logos or brand marks.",
    "Leave the bottom-left corner calm, since a small caption card may sit there.",
    style ? `Visual style: ${style}` : null,
    refs.length ? "Match the visual style of the attached reference images (they are earlier slides of this deck), not their content." : null,
    "",
    "This slide's markdown, including its speaker notes:",
    placeholder.slide,
  ].filter((line) => line !== null).join("\n");

  const content = [
    withContext && {
      type: "input_text",
      text: `The full Slidev deck this image belongs to, for story, tone and recurring characters:\n\n${deck}`,
    },
    ...refs.map((url) => ({ type: "input_image", image_url: url })),
    { type: "input_text", text: brief },
  ].filter(Boolean);

  return {
    model,
    input: [{ role: "user", content }],
    tools: [{ type: "image_generation", model: imageModel, action: "generate", size, quality, output_format: format }],
    tool_choice: { type: "image_generation" },
  };
}

async function generate(body) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // high-quality images can take minutes; a hung request still gives up
        signal: AbortSignal.timeout(300_000),
      });
      if (!response.ok) {
        const error = new Error(`OpenAI API ${response.status}: ${await response.text()}`);
        if (response.status < 500 && response.status !== 429) throw error;
        lastError = error;
      } else {
        const result = (await response.json()).output?.find((item) => item.type === "image_generation_call")?.result;
        if (!result) throw new Error("OpenAI API returned no image");
        return Buffer.from(result, "base64");
      }
    } catch (error) {
      lastError = error;
      if (/OpenAI API 4(?!29)/u.test(String(error))) throw error;
    }
    if (attempt < 3) {
      const delay = 2_000 * 2 ** (attempt - 1);
      console.log(`  Retrying in ${delay / 1000}s...`);
      await new Promise((done) => setTimeout(done, delay));
    }
  }
  throw lastError;
}

async function toDataUrl(path) {
  const types = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
  const type = types[extname(path).toLowerCase()] ?? fail(`--style-ref must be png, jpg or webp: ${path}`);
  return `data:${type};base64,${(await readFile(resolve(path))).toString("base64")}`;
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
  const flags = ["all", "list", "force", "dry-run", "no-context"];
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
