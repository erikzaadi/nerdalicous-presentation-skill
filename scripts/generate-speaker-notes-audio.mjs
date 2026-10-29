#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { loadDeck, loadDotEnv } from "./deck.mjs";

// Speaker notes come from the deck itself (slides.md, exact) or from the
// exported speaker-notes PDF (best effort: PDF text extraction scrambles some
// mixed Hebrew/English punctuation). A plain .txt transcript still works too.
loadDotEnv();
const DEFAULT_INPUT = resolve("slides.md");
const DEFAULT_OUTPUT = resolve("speaker-notes.mp3");

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input ?? DEFAULT_INPUT);
const outputPath = resolve(args.output ?? DEFAULT_OUTPUT);
// The first presenter's voice, and the fallback for anyone without one.
const voice = args.voice ?? process.env.OPENAI_TTS_VOICE ?? "cedar";
// One voice per presenter, so a multi-presenter rehearsal is easy to follow.
// Presenters are the [Name] tags in the notes. Set voices in .env with
// OPENAI_TTS_VOICES=erik=cedar,dana=marin, or per run with --voice-<name>
// (e.g. --voice-dana onyx); see assignVoices for everyone else.
const speakerVoices = {
  ...Object.fromEntries(
    (process.env.OPENAI_TTS_VOICES ?? "")
      .split(",")
      .map((pair) => pair.split("=").map((part) => part.trim()))
      .filter(([name, v]) => name && v)
      .map(([name, v]) => [name.toLowerCase(), v]),
  ),
  ...Object.fromEntries(
    Object.entries(args)
      .filter(([key]) => key.startsWith("voice-"))
      .map(([key, value]) => [key.slice("voice-".length).toLowerCase(), value]),
  ),
};
const voiceFor = (speaker) => (speaker && speakerVoices[speaker.toLowerCase()]) || voice;
// Voice precedence: a presenter's own voice (OPENAI_TTS_VOICES or --voice-<name>),
// then the main voice for the first presenter, then the next unused voice, so handoffs stay audible.
const VOICE_ROTATION = ["cedar", "marin", "ash", "coral", "sage", "verse", "ballad", "echo"];
function assignVoices() {
  for (const [index, name] of presenters.entries()) {
    const key = name.toLowerCase();
    if (speakerVoices[key]) continue;
    const used = new Set(Object.values(speakerVoices));
    speakerVoices[key] = index === 0 && !used.has(voice) ? voice : VOICE_ROTATION.find((v) => !used.has(v)) ?? voice;
  }
}
const format = extname(outputPath).toLowerCase() === ".wav" ? "wav" : "mp3";
// gpt-4o-mini-tts and tts-1 shut down on 2027-01-06. gpt-audio-1.5 speaks through
// Chat Completions; the legacy speech models still go to /v1/audio/speech.
const model = args.model ?? process.env.OPENAI_TTS_MODEL ?? "gpt-audio-1.5";
const printOnly = Boolean(args.print);
const dryRun = Boolean(args["dry-run"]) || printOnly;
const force = Boolean(args.force);
const exactBeats = Boolean(args["exact-beats"]);
const verify = Boolean(args.verify);
const transcribeModel = args["transcribe-model"] ?? process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-transcribe";
// Below this share of expected words heard back, a clip probably skipped speech. A heuristic, not proof.
const minOverlap = Number(args["min-overlap"] ?? 0.75);
// Long requests make the voice silently skip passages (worse for Hebrew, which is
// token-heavy), so keep requests short; slide decks also get one request per slide.
const maxChars = Number(args["max-chars"] ?? 1_500);
const paceWpm = Number(args["pace-wpm"] ?? process.env.OPENAI_TTS_PACE_WPM ?? 112);
const beatScale = Number(args["beat-scale"] ?? process.env.OPENAI_TTS_BEAT_SCALE ?? 1);
const apiKey = process.env.OPENAI_API_KEY;
// The notes' language: the spoken slide announcement, the handoff marker and the voice direction.
const lang = args.lang ?? "en";
// What kind of talk this rehearses, for the voice direction: "keynote", "internal all-hands talk"...
const talk = args.talk ?? process.env.OPENAI_TTS_TALK ?? "tech talk";
const LANGUAGES = {
  en: {
    slide: "Slide",
    and: " and ",
    instructions: [
      `Read these speaker notes as a rehearsal of a ${talk}.`,
      "Speak natural, conversational English, the way an engineer talks to a room of peers.",
    ],
  },
  he: {
    slide: "שקף",
    and: " ו-",
    instructions: [
      `Read these speaker notes as a rehearsal of a Hebrew-language ${talk}.`,
      "Speak natural, conversational Israeli Hebrew. Read English technical terms in English, the way Israeli engineers say them.",
    ],
  },
};
const language = LANGUAGES[lang] ?? fail(`--lang must be one of: ${Object.keys(LANGUAGES).join(", ")}`);
// Filled from the notes' [Name] tags once the input is read.
let presenters = [];
// The deck's slide number for each "…"-separated block of the transcript (null for a plain .txt).
let slideNumbers = [];
// Between slides in the transcript. Not "…", which is also a spoken beat inside a slide's notes.
const SLIDE_BREAK = "\n\n⟦slide⟧\n\n";
// Standalone bracketed lines that are rehearsal cues, not presenters.
const STAGE_CUE = /^(?:click(?::\s*\d+)?|beat(?:\s*[—-]\s*[\d.]+\s*seconds?)?|beat,\s*click|click(?:,\s*click)+|small laugh|opening|pacing target:.*)$/iu;
const PRESENTER_TAG = /^\p{L}[\p{L} .'-]*(?:\s*\+\s*\p{L}[\p{L} .'-]*)*$/u;

if (!Number.isInteger(maxChars) || maxChars < 500 || maxChars > 6_000) {
  fail("--max-chars must be an integer between 500 and 6000");
}
if (!Number.isFinite(paceWpm) || paceWpm < 40 || paceWpm > 180) {
  fail("--pace-wpm must be a number between 40 and 180");
}
if (!Number.isFinite(beatScale) || beatScale < 0.5 || beatScale > 4) {
  fail("--beat-scale must be a number between 0.5 and 4");
}

if (exactBeats && format !== "wav") {
  fail("--exact-beats inserts silence into WAV audio; use a .wav --output with it");
}

if (!dryRun && !apiKey) {
  fail("OPENAI_API_KEY is not set. Put it in .env next to slides.md (see .env.example).");
}

const instructions =
  args.instructions ??
  process.env.OPENAI_TTS_INSTRUCTIONS ??
  [
    ...language.instructions,
    "Sound warm, confident, and distinctly human, not like an audiobook announcer.",
    `Speak deliberately at an average pace of about ${paceWpm} words per minute, and never rush lists, contrasts, acronyms, or punchlines.`,
    "Preserve dry humor, rhetorical contrast, and punchlines. Leave room after jokes, and use short natural pauses at paragraph breaks.",
    "When an ellipsis appears alone as its own paragraph, treat it as silent stage time: do not vocalize it, and hold a clear pause before continuing.",
    "Say the word Click briefly and neutrally every time it appears, including repeats; it is a rehearsal cue, not a dramatic line.",
    "This is speaker-only rehearsal audio: do not add explanations, scene descriptions, or commentary that is not present in the input.",
    "Spell out acronyms such as PR, CVE and API letter by letter.",
  ].join(" ");

const cacheDir = resolve(
  dirname(outputPath),
  `.${basename(outputPath, extname(outputPath))}-chunks`,
);
const indexPath = join(cacheDir, "chunks.json");
if (verify) {
  await verifyChunks();
  process.exit(0);
}

const source = await loadTranscript(inputPath);
assignVoices();
if (printOnly) {
  // the exact text that would be sent to the voices, ⟦Speaker⟧ marking who says it
  console.log(prepareForSpeech(source));
  process.exit(0);
}
if (exactBeats && hasSpeakers(source)) {
  fail("--exact-beats works on a plain .txt transcript, not on speaker notes");
}
const timing = estimateTiming(stripSpeakers(source), paceWpm, beatScale);
const spokenText = prepareForSpeech(source);
const timeline = exactBeats ? buildExactBeatTimeline(source, maxChars, beatScale) : null;
const chunks = exactBeats
  ? timeline.filter((item) => item.type === "speech").map((item) => ({ speaker: null, text: item.text }))
  : chunkBySlide(spokenText, maxChars);


console.log(`Input:  ${inputPath}`);
console.log(`Output: ${outputPath}`);
console.log(`Format: ${format}`);
console.log(`Model:  ${model}`);
console.log(`Voices: ${Object.entries(speakerVoices).map(([name, v]) => `${name}=${v}`).join(", ")}, anyone else=${voice}`);
console.log(`Pace:   ${paceWpm} target words/minute`);
console.log(`Beats:  ${exactBeats ? `exact silence × ${beatScale}` : "voice-directed"}`);
console.log(`Requests: ${chunks.length} (${stripSpeakers(spokenText).length.toLocaleString()} spoken characters)`);
console.log(`Estimated audio: ${formatDuration(timing.estimatedSeconds)} (${timing.words} spoken words, ${timing.beats} beats, ${timing.clicks} clicks)`);

if (dryRun) {
  if (exactBeats) {
    console.log(`  ${timeline.filter((item) => item.type === "silence").length} deterministic silence segments`);
  } else {
    chunks.forEach((chunk, index) =>
      console.log(`  ${String(index + 1).padStart(2, "0")}: ${chunk.text.length} chars, ${chunk.speaker ?? "default"} (${voiceFor(chunk.speaker)})`),
    );
  }
  process.exit(0);
}

await mkdir(cacheDir, { recursive: true });

// Clips are stored under a hash of what they say and how, so inserting or moving
// slides reuses every unchanged clip. chunks.json records the current order for --verify.
const wavFiles = [];
const index = [];
for (let position = 0; position < chunks.length; position += 1) {
  const { speaker, text, slide } = chunks[position];
  const chunkVoice = voiceFor(speaker);
  const signature = sha256(JSON.stringify({ model, voice: chunkVoice, format, instructions, input: text }));
  const chunkPath = join(cacheDir, `${signature.slice(0, 16)}.${format}`);
  wavFiles.push(chunkPath);
  index.push({ slide, speaker, voice: chunkVoice, file: basename(chunkPath), text });
  const label = `[${position + 1}/${chunks.length}]${slide ? ` slide ${slide}` : ""}`;

  if (!force && (await isUsableAudio(chunkPath))) {
    console.log(`${label} Reusing cached clip`);
    continue;
  }

  console.log(`${label} Generating ${text.length} characters (${speaker ?? "default"}, ${chunkVoice})...`);
  const audio = await requestSpeech({
    apiKey,
    model,
    voice: chunkVoice,
    input: text,
    instructions,
    format,
  });
  await writeFile(chunkPath, audio);
}
await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);

const parts = await Promise.all(wavFiles.map((path) => readFile(path)));
// MP3 is a stream of self-contained frames, so chunks can be joined end to end. Good enough
// for rehearsal; some players report the wrong duration or seek imprecisely. Use a .wav
// output and encode it once (ffmpeg) when that matters.
const merged =
  format === "mp3"
    ? Buffer.concat(parts)
    : exactBeats
      ? mergeExactTimeline(timeline, parts)
      : mergeWavFiles(parts);
await writeFile(outputPath, merged);

console.log(`Done: ${outputPath}`);
if (format === "wav") console.log(`Actual audio: ${formatDuration(wavDurationSeconds(merged))}`);
console.log("Disclosure: this file contains an AI-generated voice.");
if (!exactBeats) console.log("Check it with --verify, which transcribes every clip back and flags skipped speech.");

function parseArgs(items) {
  const result = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) fail(`Unexpected argument: ${item}`);
    const key = item.slice(2);
    if (["dry-run", "print", "force", "exact-beats", "verify"].includes(key)) {
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

function prepareForSpeech(text) {
  return text
    .replace(/^\[PACING TARGET:.*?\]\s*$/gimu, "")
    .replace(/^\[Opening\]\s*$/gmu, "")
    .replace(/\[beat, CLICK\]/giu, "…\n\nClick.")
    .replace(/\[CLICK(?:,\s*CLICK)+\]/giu, (cue) => cue.match(/CLICK/giu).map(() => "Click.").join(" "))
    .replace(/\[BEAT\s*[—-]\s*([0-9.]+)\s*seconds?\]/giu, (_, seconds) =>
      Array.from({ length: Math.max(1, Math.round(Number(seconds))) }, () => "…").join("\n\n"),
    )
    .replace(/\[CLICK:(\d+)\]/giu, (_, count) => Array.from({ length: Number(count) }, () => "Click.").join(" "))
    .replace(/\[CLICK\]/giu, "Click.")
    .replace(/\[(?:beat|small laugh)\]/giu, "…")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function estimateTiming(text, wordsPerMinute, scale = 1) {
  const beatMatches = [...text.matchAll(/\[BEAT\s*[—-]\s*([0-9.]+)\s*seconds?\]/giu)];
  const beatSeconds = beatMatches.reduce((total, match) => total + Number(match[1]) * scale, 0);
  const clicks = (text.match(/\bCLICK\b/giu) ?? []).length;
  const words = prepareForSpeech(text)
    .replace(/\bClick\./gu, "")
    .match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return {
    beats: beatMatches.length,
    clicks,
    words,
    estimatedSeconds: (words / wordsPerMinute) * 60 + beatSeconds + clicks * 0.45,
  };
}

function buildExactBeatTimeline(text, limit, scale) {
  const cue = /\[BEAT\s*[—-]\s*([0-9.]+)\s*seconds?\]/giu;
  const timeline = [];
  let cursor = 0;
  for (const match of text.matchAll(cue)) {
    appendSpeechTimeline(timeline, prepareForSpeech(text.slice(cursor, match.index)), limit);
    timeline.push({ type: "silence", seconds: Number(match[1]) * scale });
    cursor = match.index + match[0].length;
  }
  appendSpeechTimeline(timeline, prepareForSpeech(text.slice(cursor)), limit);
  return timeline;
}

function appendSpeechTimeline(timeline, text, limit) {
  if (!text.trim()) return;
  for (const chunk of chunkText(text, limit)) timeline.push({ type: "speech", text: chunk });
}

function formatDuration(seconds) {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, "0")}`;
}

// Speaker notes mark each paragraph with who says it: "⟦Name⟧ text".
function hasSpeakers(text) {
  return /⟦[^⟧]+⟧/u.test(text);
}

function stripSpeakers(text) {
  return text.replace(/⟦[^⟧]+⟧\s*/gu, "");
}

/**
 * One request per slide (split at SLIDE_BREAK), and within a slide
 * one per run of paragraphs by the same speaker, each split further if too long.
 */
function chunkBySlide(text, limit) {
  // a plain .txt transcript has no slides; its "…" paragraphs still split requests
  const slides = slideNumbers.length ? text.split(SLIDE_BREAK) : text.split(/\n\s*\n…\s*\n\s*\n/u);
  return slides.flatMap((slide, slideIndex) => {
    const runs = [];
    for (const paragraph of slide.split(/\n\s*\n/u).map((part) => part.trim()).filter(Boolean)) {
      const speaker = paragraph.match(/^⟦([^⟧]+)⟧/u)?.[1] ?? runs.at(-1)?.speaker ?? null;
      const body = stripSpeakers(paragraph);
      if (runs.at(-1)?.speaker === speaker) runs.at(-1).paragraphs.push(body);
      else runs.push({ speaker, paragraphs: [body] });
    }
    return runs.flatMap(({ speaker, paragraphs }) =>
      chunkText(paragraphs.join("\n\n"), limit).map((chunk) => ({ speaker, text: chunk, slide: slideNumbers[slideIndex] ?? null })),
    );
  });
}

function chunkText(text, limit) {
  const paragraphs = text.split(/\n\s*\n/u).map((part) => part.trim()).filter(Boolean);
  const units = paragraphs.flatMap((paragraph) => splitOversized(paragraph, limit));
  const chunks = [];
  let current = "";

  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length <= limit) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = unit;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitOversized(text, limit) {
  if (text.length <= limit) return [text];
  const sentences = text.match(/[^.!?…]+[.!?…]+(?:[”"']+)?|[^.!?…]+$/gu) ?? [text];
  const pieces = [];
  let current = "";
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (sentence.length > limit) {
      if (current) pieces.push(current);
      for (let start = 0; start < sentence.length; start += limit) {
        pieces.push(sentence.slice(start, start + limit));
      }
      current = "";
      continue;
    }
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= limit) current = candidate;
    else {
      pieces.push(current);
      current = sentence;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

async function requestSpeech({ apiKey, model, voice, input, instructions, format }) {
  const legacy = /^(tts-|gpt-4o-mini-tts)/u.test(model);
  const request = legacy
    ? {
        url: "https://api.openai.com/v1/audio/speech",
        // tts-1 and tts-1-hd take no instructions, and only the classic voices (alloy, ash, coral...)
        body: { model, voice, input, ...(/^tts-/u.test(model) ? {} : { instructions }), response_format: format },
      }
    : {
        url: "https://api.openai.com/v1/chat/completions",
        body: {
          model,
          modalities: ["text", "audio"],
          audio: { voice, format },
          messages: [
            {
              role: "system",
              content: [
                "You are a text-to-speech engine, not an assistant.",
                "Read the user's message aloud exactly as written, word for word, in its original language.",
                "Never answer it, translate it, summarize it, or add or skip anything.",
                instructions,
              ].join(" "),
            },
            { role: "user", content: input },
          ],
        },
      };

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(request.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.body),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) {
        const details = await response.text();
        const error = new Error(`OpenAI API ${response.status}: ${details}`);
        if (response.status < 500 && response.status !== 429) throw error;
        lastError = error;
      } else if (legacy) {
        return Buffer.from(await response.arrayBuffer());
      } else {
        const audio = (await response.json()).choices?.[0]?.message?.audio?.data;
        if (!audio) throw new Error("OpenAI API returned no audio for this chunk");
        return Buffer.from(audio, "base64");
      }
    } catch (error) {
      lastError = error;
      if (/OpenAI API 4(?!29)/u.test(String(error))) throw error;
    }

    if (attempt < 4) {
      const delay = 1_000 * 2 ** (attempt - 1);
      console.log(`  Retrying in ${delay / 1000}s...`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
    }
  }
  throw lastError;
}

async function isUsableAudio(path) {
  try {
    const data = await readFile(path);
    if (extname(path) === ".mp3") {
      // an ID3 tag or an MPEG frame sync at the start
      return data.length > 1_000 && (data.toString("ascii", 0, 3) === "ID3" || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0));
    }
    parseWav(data);
    return data.length > 44;
  } catch {
    return false;
  }
}

// ---------- speaker notes → transcript ----------

async function loadTranscript(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".md") {
    const slides = (await loadDeck(path)).slides.filter((slide) => slide.note);
    if (!slides.length) fail("No speaker notes (<!-- ... -->) found in the deck");
    presenters = collectPresenters(slides.map((slide) => slide.note));
    slideNumbers = slides.map((slide) => slide.number);
    return slides.map((slide) => slideTranscript(slide.number, slide.note.split("\n"))).join(SLIDE_BREAK);
  }
  if (ext === ".pdf") return transcriptFromPdf(path);
  return readFile(path, "utf8");
}

/** A standalone "[Name]" or "[Name + Name]" line in the notes; stage cues like [click] are not presenters. */
function presenterTag(line) {
  const tag = line.trim().replace(/^-\s*/u, "").match(/^\[([^\]\n]+)\]$/u)?.[1]?.trim();
  if (!tag || STAGE_CUE.test(tag) || !PRESENTER_TAG.test(tag)) return null;
  return tag.split(/\s*\+\s*/u).map((name) => name.trim());
}

/** Every presenter named in a note's presenter-tag line, in order of appearance. */
function collectPresenters(notes) {
  return [...new Set(notes.flatMap((note) => note.split("\n").flatMap((line) => presenterTag(line) ?? [])))];
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** "Name:" at the start of a line, for any known presenter. */
function presenterPrefix() {
  return presenters.length ? new RegExp(`^(${presenters.map(escapeRegExp).join("|")})\\s*:\\s*`, "u") : null;
}

/** The speaker-notes PDF: one card per slide, "N" then "[Speaker] Title" then the notes. */
function transcriptFromPdf(path) {
  let raw;
  try {
    raw = execFileSync("pdftotext", ["-enc", "UTF-8", path, "-"], { encoding: "utf8" });
  } catch {
    fail("Reading a PDF needs pdftotext (brew install poppler), or pass --input slides.md");
  }
  const lines = raw.replace(/\f/gu, "\n").split("\n").map(cleanPdfLine);
  const slides = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\d+$/u.test(lines[index])) continue;
    let header = index + 1;
    while (header < lines.length && !lines[header]) header += 1;
    // the card header: "[Speaker] Title"; its punctuation may still be shuffled around
    const speaker = (lines[header] ?? "").match(/\[([^\[\]]+)\]/u)?.[1];
    if (!speaker) continue;
    slides.push({ number: Number(lines[index]), start: header, speaker });
  }
  if (!slides.length) fail("No slide cards found in the PDF; is it the speaker-notes export?");
  presenters = [...new Set(slides.flatMap((slide) => slide.speaker.split(/\s*\+\s*/u)))];
  slideNumbers = slides.map((slide) => slide.number);
  return slides
    .map((slide, i) => {
      const end = slides[i + 1] ? slides[i + 1].start - 1 : lines.length;
      // the header's title is for humans reading the PDF; keep only the [Speaker] tag
      const body = [`[${slide.speaker}]`, ...lines.slice(slide.start + 1, end)];
      // a slide number line of the next card sits just above its header
      if (/^\d+$/u.test(body.at(-1) ?? "")) body.pop();
      return slideTranscript(slide.number, joinWrappedLines(body));
    })
    .join(SLIDE_BREAK);
}

/**
 * pdftotext emits left-to-right runs inside Hebrew text in visual order:
 * brackets come out mirrored and trailing punctuation lands in front.
 */
function cleanPdfLine(line) {
  const mirror = { "(": ")", ")": "(", "[": "]", "]": "[" };
  return line
    .replace(/\u202A([^\u202C]*)\u202C/gu, (_, run) => {
      let fixed = [...run].map((char) => mirror[char] ?? char).join("");
      const lead = fixed.match(/^[\s.,:;?!"'״(]+/u)?.[0] ?? "";
      if (lead) {
        const moved = [...lead].reverse().map((char) => (char === "(" ? ")" : char)).join("");
        fixed = fixed.slice(lead.length) + moved;
      }
      return fixed;
    })
    .replace(/[\u202A-\u202E]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** PDF lines wrap mid-sentence; a new note line starts with a cue, a name, or a quote. */
function joinWrappedLines(lines) {
  const out = [];
  for (const line of lines) {
    if (!line) continue;
    const startsNew = /^(\[|Handoff|מעבר|")/iu.test(line) || presenterPrefix()?.test(line) || !out.length;
    if (startsNew) out.push(line);
    else out[out.length - 1] += ` ${line}`;
  }
  return out;
}

/**
 * One slide's notes as spoken paragraphs, each marked with its presenter:
 * the slide's [Name] tag sets who speaks, "Name: line" and "Handoff (Name):"
 * hand a single line to someone, and a later [Name] tag switches speaker.
 */
function slideTranscript(number, rawLines) {
  let names = [];
  let current = null;
  const spoken = [];
  for (const raw of rawLines) {
    let line = raw.trim().replace(/^-\s*/u, "");
    if (!line) continue;
    const tagged = presenterTag(line);
    if (tagged) {
      if (!names.length) names = tagged;
      current = tagged[0];
      continue;
    }
    // editorial labels mark a line for the presenter; only the line itself is spoken
    line = line.replace(/^(?:Punchline|הפאנץ['׳]?)\s*:\s*/iu, "");
    let speaker = current;
    const handoff = line.match(/^(?:Handoff|מעבר)\s*(?:\(([^)]*)\))?\s*:\s*/iu);
    if (handoff) {
      // say the quoted handoff line itself, in the voice of whoever it names
      if (handoff[1]?.trim()) speaker = handoff[1].trim();
      line = line.slice(handoff[0].length);
    }
    const named = presenterPrefix() && line.match(presenterPrefix());
    if (named) {
      speaker = named[1];
      line = line.slice(named[0].length);
    }
    if (line) spoken.push(`⟦${speaker ?? "narrator"}⟧ ${line}`);
  }
  const lead = names[0] ?? "narrator";
  const who = names.join(language.and);
  const announcement = `⟦${lead}⟧ ${who ? `${language.slide} ${number}. ${who}.` : `${language.slide} ${number}.`}`;
  return [announcement, ...spoken].join("\n\n");
}

// ---------- --verify: transcribe every clip back ----------

async function verifyChunks() {
  if (!apiKey) fail("--verify needs OPENAI_API_KEY to transcribe the clips.");
  const index = await readJson(indexPath, null);
  if (!index) fail(`No ${indexPath}; generate the audio first.`);
  console.log(`Transcribing ${index.length} clips with ${transcribeModel} (language ${lang})...`);
  const flagged = [];
  for (const [position, clip] of index.entries()) {
    const form = new FormData();
    form.append("model", transcribeModel);
    form.append("language", lang);
    form.append("file", new Blob([await readFile(join(cacheDir, clip.file))]), clip.file);
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) fail(`OpenAI API ${response.status}: ${await response.text()}`);
    const heard = (await response.json()).text ?? "";
    const overlap = wordOverlap(clip.text, heard);
    const where = `${clip.slide ? `slide ${clip.slide}, ` : ""}${clip.speaker ?? "default"}`;
    console.log(`[${position + 1}/${index.length}] ${(overlap * 100).toFixed(0)}%  ${where}`);
    if (overlap < minOverlap) flagged.push({ ...clip, overlap, heard, where });
  }
  if (!flagged.length) {
    console.log(`\nEvery clip is at or above ${minOverlap * 100}% word overlap.`);
    return;
  }
  console.log(`\n${flagged.length} clip(s) below ${minOverlap * 100}%, probably skipped speech:`);
  for (const clip of flagged) {
    console.log(`\n${clip.where} (${clip.file}, ${(clip.overlap * 100).toFixed(0)}%)\n  expected: ${clip.text}\n  heard:    ${clip.heard}`);
  }
  console.log("\nRegenerate with --force, or a lower --max-chars.");
  process.exitCode = 1;
}

/** Share of the expected words that were heard, counting repeats. */
function wordOverlap(expected, heard) {
  const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const pool = new Map();
  for (const word of words(heard)) pool.set(word, (pool.get(word) ?? 0) + 1);
  // "Click" cues are sometimes dropped, which is harmless, so they don't count
  const want = words(expected).filter((word) => word !== "click");
  let hits = 0;
  for (const word of want) {
    if (pool.get(word)) {
      hits += 1;
      pool.set(word, pool.get(word) - 1);
    }
  }
  return want.length ? hits / want.length : 1;
}

function parseWav(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("The API response was not a RIFF/WAVE file");
  }

  let offset = 12;
  let fmt;
  let data;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    // Streaming WAV responses commonly use 0xFFFFFFFF as an unknown RIFF/data
    // length because the header is sent before synthesis finishes. Once the
    // response is downloaded, the bytes remaining in the file are the real
    // data length.
    const hasStreamingLength = size === 0xffffffff;
    const end = hasStreamingLength && id === "data" ? buffer.length : start + size;
    if (end > buffer.length) throw new Error(`Malformed WAV chunk: ${id}`);
    if (id === "fmt ") fmt = buffer.subarray(start, end);
    if (id === "data") data = buffer.subarray(start, end);
    if (hasStreamingLength && id === "data") break;
    offset = end + (size % 2);
  }
  if (!fmt || !data) throw new Error("WAV is missing fmt or data chunk");
  return { fmt, data };
}

function mergeWavFiles(buffers) {
  const parsed = buffers.map(parseWav);
  const format = parsed[0].fmt;
  for (const item of parsed.slice(1)) {
    if (!item.fmt.equals(format)) {
      throw new Error("Generated WAV chunks use different audio formats; cannot merge safely");
    }
  }

  return composeWav(format, parsed.map((item) => item.data));
}

function mergeExactTimeline(timeline, speechBuffers) {
  const parsedSpeech = speechBuffers.map(parseWav);
  if (!parsedSpeech.length) throw new Error("No speech was generated");
  const format = parsedSpeech[0].fmt;
  for (const item of parsedSpeech.slice(1)) {
    if (!item.fmt.equals(format)) {
      throw new Error("Generated WAV chunks use different audio formats; cannot merge safely");
    }
  }

  const byteRate = format.readUInt32LE(8);
  const blockAlign = format.readUInt16LE(12);
  let speechIndex = 0;
  const audioParts = timeline.map((item) => {
    if (item.type === "speech") return parsedSpeech[speechIndex++].data;
    const requestedBytes = Math.round(item.seconds * byteRate);
    const alignedBytes = Math.ceil(requestedBytes / blockAlign) * blockAlign;
    return Buffer.alloc(alignedBytes);
  });
  return composeWav(format, audioParts);
}

function composeWav(format, audioParts) {
  const audio = Buffer.concat(audioParts);
  const fmtPadding = format.length % 2;
  const totalSize = 4 + (8 + format.length + fmtPadding) + (8 + audio.length);
  const output = Buffer.alloc(8 + totalSize);
  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(totalSize, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(format.length, 16);
  format.copy(output, 20);
  const dataHeader = 20 + format.length + fmtPadding;
  output.write("data", dataHeader, "ascii");
  output.writeUInt32LE(audio.length, dataHeader + 4);
  audio.copy(output, dataHeader + 8);
  return output;
}

function wavDurationSeconds(buffer) {
  const { fmt, data } = parseWav(buffer);
  const byteRate = fmt.readUInt32LE(8);
  return data.length / byteRate;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}
