#!/usr/bin/env node

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { deckMarkdown, findPlaceholders, loadDeck, loadDotEnv } from './deck.mjs'

// Turns the deck's <ImageTBD prompt="..." /> placeholders into slide images.
// The whole deck goes along as context (like uploading slides.md to ChatGPT),
// so every image knows the talk's story, tone and recurring characters.
// Opt in per image: --list first, then --only 2,5 or --all. GIF and meme placeholders
// (kind="gif" / kind="meme") belong to find-gifs.mjs and generate-memes.mjs.
// Two providers: OpenAI (default) and Gemini. Pick with --provider or IMAGE_PROVIDER.

loadDotEnv()
const args = parseArgs(process.argv.slice(2))
const inputPath = resolve(args.input ?? 'slides.md')
const outDir = resolve(args['out-dir'] ?? 'public/images')
const providerName = args.provider ?? process.env.IMAGE_PROVIDER ?? 'openai'
// Slidev slides are 16:9. 2560x1440 is OpenAI's largest non-experimental size;
// Gemini takes it as aspect ratio 16:9 at its "2K" tier.
const size = args.size ?? '2560x1440'
const quality = args.quality ?? 'high'
// Gemini always answers in JPEG (its API has no output-format option), so it defaults to .jpg
const format = args.format ?? (providerName === 'gemini' ? 'jpg' : 'png')
const style = args.style ?? process.env.IMAGE_STYLE ?? process.env.OPENAI_IMAGE_STYLE ?? ''
const styleRefs = (args['style-ref'] ?? '')
  .split(',')
  .map((path) => path.trim())
  .filter(Boolean)
const withContext = !args['no-context']
const force = Boolean(args.force)
const dryRun = Boolean(args['dry-run'])

const providers = { openai: openaiProvider(), gemini: geminiProvider() }
const provider = providers[providerName] ?? fail(`--provider must be one of: ${Object.keys(providers).join(', ')}`)

if (!/^\d+x\d+$/u.test(size) || size.split('x').some((edge) => Number(edge) % 16)) {
  fail('--size must be WIDTHxHEIGHT with both edges divisible by 16, e.g. 2560x1440')
}

const deckData = await loadDeck(inputPath)
const deck = deckMarkdown(deckData)
let placeholders
try {
  placeholders = findPlaceholders(deckData.slides).filter((p) => p.kind === 'image')
} catch (error) {
  fail(error.message)
}
if (!placeholders.length) {
  console.log(`No <ImageTBD prompt="..." /> placeholders left in ${inputPath}.`)
  process.exit(0)
}

// --only beats --all, so `npm run images -- --only 2` (whose script passes --all) picks just #2
const selected = args.only
  ? args.only.split(',').map((n) => placeholders[Number(n) - 1] ?? fail(`No placeholder #${n}`))
  : args.all
    ? placeholders
    : []

if (!selected.length || args.list) {
  console.log(`${placeholders.length} image placeholders in ${inputPath}:\n`)
  for (const p of placeholders) {
    const existing = await existingImage(p.name)
    const done = existing ? `  [exists: ${existing}]` : ''
    console.log(
      `  ${String(p.number).padStart(2)}. ${p.name}.${format}  (slide ${p.slideNumber}: ${p.title || 'untitled'})${done}`,
    )
    console.log(`      ${p.prompt}\n`)
  }
  console.log('Generate the missing ones with --all, or pick with --only 1,3. Add --dry-run to see the requests first.')
  process.exit(0)
}

const todo = []
for (const p of selected) {
  const existing = await existingImage(p.name)
  if (!force && existing) {
    console.log(`#${p.number} ${existing} exists, skipping (--force to regenerate)`)
  } else {
    todo.push(p)
  }
}
if (!todo.length) {
  console.log('\nNothing new to generate. --force regenerates existing images.')
  process.exit(0)
}

if (!dryRun && !provider.apiKey) {
  fail(`${provider.keyVar} is not set. Put it in .env next to slides.md (see docs/api-keys.md in the skill repo).`)
}

console.log(`Provider: ${providerName}, ${provider.describe()}`)
console.log(`Context: ${withContext ? `whole deck (${deck.length.toLocaleString()} chars)` : 'slide only'}`)
if (styleRefs.length) {
  console.log(`Style refs: ${styleRefs.join(', ')}`)
}

const refImages = await Promise.all(styleRefs.map(readRef))
if (!dryRun) {
  await mkdir(outDir, { recursive: true })
}

const generated = []
for (const p of todo) {
  const outPath = join(outDir, `${p.name}.${format}`)
  const brief = buildBrief(p, refImages.length)
  if (dryRun) {
    console.log(`\n#${p.number} → ${outPath}`)
    console.log(`Request: ${provider.describe()}`)
    console.log(
      `Inputs: ${withContext ? `the whole deck (${deck.length.toLocaleString()} chars), ` : ''}${refImages.length} reference image(s), and this brief:\n`,
    )
    console.log(brief)
    continue
  }
  console.log(`#${p.number} Generating ${outPath}...`)
  let image
  try {
    image = await withRetries(() => provider.generate(brief, refImages))
  } catch (error) {
    if (generated.length) {
      console.log(
        `\nGenerated ${generated.length} image(s) before this failed: ${generated.map((g) => g.name).join(', ')}`,
      )
    }
    fail(error.message)
  }
  // save under the extension that matches what came back, so a JPEG never hides behind .png
  const file = `${p.name}.${image.ext}`
  if (image.ext !== format) {
    console.log(`  ${providerName} returned ${image.ext}, not ${format}: saving ${file}.`)
  }
  await writeFile(join(outDir, file), image.data)
  console.log(`  Saved.`)
  generated.push({ ...p, file })
}

if (generated.length) {
  console.log(`\nGenerated ${generated.length} image(s):`)
  for (const p of generated) {
    console.log(`  slide ${p.slideNumber}: /images/${p.file}`)
  }
  console.log(
    '\nLook at each one first (on-image spelling, a calm bottom-left corner). Then ask your agent:\n' +
      `  "I generated the images for slide${generated.length > 1 ? 's' : ''} ${generated.map((p) => p.slideNumber).join(', ')}. ` +
      `Swap their ImageTBD placeholders for full-bleed photo slides."`,
  )
}

function buildBrief(placeholder, refCount) {
  return [
    `Generate one image for slide ${placeholder.slideNumber}${placeholder.title ? ` ("${placeholder.title}")` : ''}.`,
    `Image prompt: ${placeholder.prompt}`,
    'It is a full-bleed 16:9 slide background: fill the whole frame edge to edge, with no borders, frames, captions, watermarks or slide titles.',
    'Keep any text the prompt asks for to a few short, correctly spelled words.',
    'No real company logos or brand marks.',
    'Leave the bottom-left corner calm, since a small caption card may sit there.',
    style ? `Visual style: ${style}` : null,
    refCount
      ? 'Match the visual style of the attached reference images (they are earlier slides of this deck), not their content.'
      : null,
    '',
    "This slide's markdown, including its speaker notes:",
    placeholder.slide,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

function deckIntro() {
  return `The full Slidev deck this image belongs to, for story, tone and recurring characters:\n\n${deck}`
}

// OpenAI Responses API: a text model drives the image_generation tool.
function openaiProvider() {
  const model = args.model ?? process.env.OPENAI_IMAGE_CONTEXT_MODEL ?? 'gpt-5.5'
  const imageModel = args['image-model'] ?? process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2.5-flare'
  const apiKey = process.env.OPENAI_API_KEY
  const tool = {
    type: 'image_generation',
    model: imageModel,
    action: 'generate',
    size,
    quality,
    output_format: format === 'jpg' ? 'jpeg' : format,
  }
  return {
    apiKey,
    keyVar: 'OPENAI_API_KEY',
    describe: () => `${model} → ${imageModel}, ${size}, quality ${quality}`,
    async generate(brief, refs) {
      const content = [
        withContext && { type: 'input_text', text: deckIntro() },
        ...refs.map((ref) => ({ type: 'input_image', image_url: `data:${ref.type};base64,${ref.data}` })),
        { type: 'input_text', text: brief },
      ].filter(Boolean)
      const body = {
        model,
        input: [{ role: 'user', content }],
        tools: [tool],
        tool_choice: { type: 'image_generation' },
      }
      const json = await post(
        'OpenAI',
        'https://api.openai.com/v1/responses',
        { Authorization: `Bearer ${apiKey}` },
        body,
      )
      const result = json.output?.find((item) => item.type === 'image_generation_call')?.result
      if (!result) {
        throw new Error('OpenAI API returned no image')
      }
      return { data: Buffer.from(result, 'base64'), ext: format }
    },
  }
}

// Gemini API: the image model itself reads the deck (long context), so there's no separate text model.
function geminiProvider() {
  const imageModel = args['image-model'] ?? process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3-pro-image'
  const apiKey = process.env.GEMINI_API_KEY
  const [width, height] = size.split('x').map(Number)
  const ratios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
  const gcd = (a, b) => (b ? gcd(b, a % b) : a)
  const aspectRatio = `${width / gcd(width, height)}:${height / gcd(width, height)}`
  // Gemini sizes by tier, not pixels: pick the smallest tier whose long edge covers --size.
  const longEdge = Math.max(width, height)
  const imageSize = args['image-size'] ?? (longEdge <= 1408 ? '1K' : longEdge <= 2816 ? '2K' : '4K')
  return {
    apiKey,
    keyVar: 'GEMINI_API_KEY',
    describe: () => `${imageModel}, ${aspectRatio} at ${imageSize}`,
    async generate(brief, refs) {
      if (!ratios.includes(aspectRatio)) {
        throw new Error(`Gemini supports aspect ratios ${ratios.join(', ')}; --size ${size} is ${aspectRatio}`)
      }
      const parts = [
        withContext && { text: deckIntro() },
        ...refs.map((ref) => ({ inline_data: { mime_type: ref.type, data: ref.data } })),
        { text: brief },
      ].filter(Boolean)
      const body = {
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio, imageSize } },
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent`
      const json = await post('Gemini', url, { 'x-goog-api-key': apiKey }, body)
      const candidate = json.candidates?.[0]
      const image = candidate?.content?.parts?.find((part) => part.inlineData)?.inlineData
      if (!image) {
        // a safety block or a text-only answer: say why instead of "no image"
        const said = candidate?.content?.parts
          ?.map((part) => part.text)
          .filter(Boolean)
          .join(' ')
        const reason = json.promptFeedback?.blockReason ?? candidate?.finishReason ?? 'unknown'
        throw new Error(`Gemini API returned no image (${reason})${said ? `: ${said}` : ''}`)
      }
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[image.mimeType] ?? format
      return { data: Buffer.from(image.data, 'base64'), ext }
    },
  }
}

async function post(label, url, headers, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // high-quality images can take minutes; a hung request still gives up
    signal: AbortSignal.timeout(300_000),
  })
  if (response.ok) {
    return response.json()
  }
  const text = await response.text()
  let detail = text
  let retryable = response.status >= 500 || response.status === 429 // other 4xx won't fix itself
  try {
    const { error } = JSON.parse(text)
    detail = error?.message ?? text
    // Gemini says how long to wait; a quota that resets tomorrow isn't worth retrying
    const wait = error?.details?.find((d) => d.retryDelay)?.retryDelay
    if (wait && parseFloat(wait) > 60) {
      retryable = false
    }
  } catch {
    // not JSON: keep the raw text
  }
  if (/free_tier/u.test(text) && /limit: 0\b/u.test(text)) {
    detail =
      "this model has no free-tier quota. Enable billing on the key's Google Cloud project (docs/api-keys.md in the skill repo)."
    retryable = false
  }
  throw Object.assign(new Error(`${label} API ${response.status}: ${detail}`), { retryable })
}

async function withRetries(attemptOnce) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await attemptOnce()
    } catch (error) {
      if (error.retryable === false) {
        throw error
      }
      lastError = error
    }
    if (attempt < 3) {
      const delay = 2_000 * 2 ** (attempt - 1)
      console.log(`  Retrying in ${delay / 1000}s...`)
      await new Promise((done) => setTimeout(done, delay))
    }
  }
  throw lastError
}

async function readRef(path) {
  const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
  const type = types[extname(path).toLowerCase()] ?? fail(`--style-ref must be png, jpg or webp: ${path}`)
  return { type, data: (await readFile(resolve(path))).toString('base64') }
}

// any earlier image for this placeholder counts, whichever provider made it
async function existingImage(name) {
  for (const ext of [format, 'png', 'jpg', 'jpeg', 'webp']) {
    if (await exists(join(outDir, `${name}.${ext}`))) {
      return `${name}.${ext}`
    }
  }
  return null
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function parseArgs(items) {
  const flags = ['all', 'list', 'force', 'dry-run', 'no-context']
  const result = {}
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (!item.startsWith('--')) {
      fail(`Unexpected argument: ${item}`)
    }
    const key = item.slice(2)
    if (flags.includes(key)) {
      result[key] = true
      continue
    }
    const value = items[index + 1]
    if (!value || value.startsWith('--')) {
      fail(`Missing value for --${key}`)
    }
    result[key] = value
    index += 1
  }
  return result
}

function fail(message) {
  console.error(`Error: ${message}`)
  process.exit(1)
}
