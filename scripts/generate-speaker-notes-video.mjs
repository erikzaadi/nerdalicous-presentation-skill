#!/usr/bin/env node

// Renders the deck as a video narrated by the rehearsal audio: each slide stays on
// screen while its clips play, clicks advance where the notes say "Click", and GIF
// photo slides keep playing. Needs the audio's clip cache (npm run notes:audio first)
// and the ffmpeg binary on PATH (brew install ffmpeg); no extra npm packages.
//
//   node generate-speaker-notes-video.mjs [--input slides.md] [--audio speaker-notes.mp3]
//     [--output speaker-notes.mp4] [--frames <dir>] [--fps 24] [--gap 0.6] [--hold 3]

import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadDeck } from "./deck.mjs";

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input ?? "slides.md");
const audioPath = resolve(args.audio ?? "speaker-notes.mp3");
const outputPath = resolve(args.output ?? "speaker-notes.mp4");
const fps = Number(args.fps ?? 24);
// silence after each slide's narration, before the next slide
const gap = Number(args.gap ?? 0.6);
// how long a slide without notes stays on screen
const hold = Number(args.hold ?? 3);

for (const [name, value] of Object.entries({ fps, gap, hold })) {
  if (!Number.isFinite(value) || value < 0) fail(`--${name} must be a non-negative number`);
}
for (const tool of ["ffmpeg", "ffprobe"]) {
  try {
    execFileSync(tool, ["-version"], { stdio: "ignore" });
  } catch {
    fail(`${tool} is not on PATH. Install ffmpeg (brew install ffmpeg) and run again.`);
  }
}

// The audio script's clip cache, in playback order, each clip tagged with its slide.
const cacheDir = join(dirname(audioPath), `.${basename(audioPath, extname(audioPath))}-chunks`);
const indexPath = join(cacheDir, "chunks.json");
const clips = await readFile(indexPath, "utf8")
  .then(JSON.parse)
  .catch(() => fail(`No ${indexPath}; run npm run notes:audio first.`));
if (clips.some((clip) => !clip.slide)) fail(`${indexPath} has clips without a slide; regenerate the audio from slides.md.`);
if ((await stat(inputPath)).mtimeMs > (await stat(indexPath)).mtimeMs) {
  console.warn(`Warning: ${basename(inputPath)} changed after the audio was generated; run npm run notes:audio if the notes changed.`);
}

const deck = await loadDeck(inputPath);
const tempDir = await mkdtemp(join(tmpdir(), "speaker-notes-video-"));
try {
  const framesDir = args.frames ? resolve(args.frames) : join(tempDir, "frames");
  if (!args.frames) {
    console.log("Exporting slides as PNGs, one per click step...");
    execFileSync("npx", ["slidev", "export", inputPath, "--format", "png", "--with-clicks", "--output", framesDir], {
      stdio: ["ignore", "ignore", "inherit"],
    });
  }
  // Slidev names them 001-01.png: slide 1 before any click, 001-02.png after the first.
  const frames = new Map();
  for (const file of (await readdir(framesDir)).filter((name) => /^\d+-\d+\.png$/u.test(name)).sort()) {
    const slide = Number(file.split("-")[0]);
    frames.set(slide, [...(frames.get(slide) ?? []), join(framesDir, file)]);
  }
  if (!frames.size) fail(`No NNN-NN.png frames in ${framesDir}`);
  const [width, height] = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", frames.values().next().value[0]],
    { encoding: "utf8" },
  ).trim().split(",").map(Number);

  const timeline = buildTimeline();
  const total = timeline.at(-1).end;
  console.log(`Video: ${timeline.length} segments, ${width}x${height} at ${fps} fps, ${formatDuration(total)}`);
  console.log(`Encoding ${outputPath}...`);
  execFileSync("ffmpeg", ffmpegArgs(timeline, width, height), { stdio: ["ignore", "ignore", "inherit"] });
  console.log(`Done: ${outputPath}`);
  console.log("Disclosure: this video's narration is an AI-generated voice.");

  /**
   * Segments in playback order, each one frame (a slide at one click step) from
   * `start` to `end` in seconds, plus the narration as clips and silences.
   */
  function buildTimeline() {
    const segments = [];
    const audio = [];
    let cursor = 0;
    for (const slide of deck.slides) {
      const states = frames.get(slide.number);
      if (!states) {
        console.warn(`Warning: slide ${slide.number} has no exported frame (hidden?); skipped.`);
        continue;
      }
      const gif = gifOverlay(slide);
      const slideClips = clips.filter((clip) => clip.slide === slide.number);
      const start = cursor;
      // when each "Click" cue is spoken, estimated by its word position within its clip
      const clickTimes = [];
      for (const clip of slideClips) {
        const file = join(cacheDir, clip.file);
        const duration = clipDuration(file);
        const words = clip.text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*\.?/gu) ?? [];
        words.forEach((word, index) => {
          if (word === "Click.") clickTimes.push(cursor + (duration * index) / words.length);
        });
        audio.push({ file, duration });
        cursor += duration;
      }
      const silence = slideClips.length ? gap : hold;
      audio.push({ silence });
      cursor += silence;

      const clicks = states.length - 1;
      if (clickTimes.length !== clicks) {
        console.warn(
          `Warning: slide ${slide.number} has ${clicks} click(s) but its notes say Click ${clickTimes.length} time(s);` +
            (clickTimes.length < clicks ? " the last click step(s) won't show." : " the extra cues are ignored."),
        );
      }
      const changes = [start, ...clickTimes.slice(0, clicks)];
      changes.forEach((time, step) =>
        segments.push({ frame: states[step], gif, slide: slide.number, start: time, end: changes[step + 1] ?? cursor }),
      );
    }
    segments.audio = audio;
    return segments;
  }

  function ffmpegArgs(timeline, width, height) {
    const inputs = [];
    const filters = [];
    let input = 0;
    // Snap every boundary to the frame grid on the absolute timeline, so rounding
    // never accumulates and the slides stay in sync with the narration.
    const snap = (seconds) => Math.round(seconds * fps) / fps;
    const videoLabels = timeline.map((segment, index) => {
      const duration = Math.max(1 / fps, snap(segment.end) - snap(segment.start));
      inputs.push("-loop", "1", "-framerate", String(fps), "-t", duration.toFixed(4), "-i", segment.frame);
      const frame = input++;
      let chain = `[${frame}:v]`;
      if (segment.gif) {
        inputs.push("-ignore_loop", "0", "-i", segment.gif.path);
        const gif = input++;
        const fit =
          segment.gif.size === "contain"
            ? `scale=${width}:${height}:force_original_aspect_ratio=decrease`
            : `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
        filters.push(`[${gif}:v]${fit}[g${index}]`);
        filters.push(`${chain}[g${index}]overlay=(W-w)/2:(H-h)/2:shortest=1[o${index}]`);
        chain = `[o${index}]`;
      }
      filters.push(`${chain}fps=${fps},setsar=1,format=yuv420p[v${index}]`);
      return `[v${index}]`;
    });
    const audioLabels = timeline.audio.map((part, index) => {
      if (part.silence !== undefined) {
        inputs.push("-f", "lavfi", "-t", part.silence.toFixed(4), "-i", "anullsrc=r=48000:cl=stereo");
      } else {
        inputs.push("-i", part.file);
      }
      filters.push(`[${input++}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}]`);
      return `[a${index}]`;
    });
    filters.push(`${videoLabels.join("")}concat=n=${videoLabels.length}:v=1:a=0[video]`);
    filters.push(`${audioLabels.join("")}concat=n=${audioLabels.length}:v=0:a=1[audio]`);
    // the graph is too long for a command line on big decks, so it goes through a file
    const graphPath = join(tempDir, "graph.txt");
    writeFileSync(graphPath, filters.join(";\n"));
    return [
      "-y", "-v", "error", "-stats",
      ...inputs,
      "-/filter_complex", graphPath,
      "-map", "[video]", "-map", "[audio]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart",
      outputPath,
    ];
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

/**
 * The GIF of a GIF photo slide (`layout: image` with a .gif `image:`), which
 * the PNG export freezes on its first frame. Other GIFs stay frozen, with a warning.
 */
function gifOverlay(slide) {
  const { layout, image, backgroundSize } = slide.frontmatter;
  if (layout === "image" && /\.gif$/iu.test(image ?? "")) {
    if (/^https?:/iu.test(image)) {
      console.warn(`Warning: slide ${slide.number}'s GIF is a URL; download it into public/images to animate it.`);
      return null;
    }
    // Slidev serves public/ at the root, so /images/x.gif is public/images/x.gif
    const path = image.startsWith("/") ? join(dirname(inputPath), "public", image) : resolve(dirname(inputPath), image);
    return { path, size: backgroundSize === "contain" ? "contain" : "cover" };
  }
  if (/\.gif\b/iu.test(slide.content)) {
    console.warn(`Warning: slide ${slide.number} has a GIF outside a layout: image slide; it stays frozen in the video.`);
  }
  return null;
}

function clipDuration(file) {
  const output = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {
    encoding: "utf8",
  });
  const duration = Number(output.trim());
  if (!Number.isFinite(duration)) fail(`Can't read the duration of ${file}; regenerate the audio.`);
  return duration;
}

function formatDuration(seconds) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function parseArgs(items) {
  const result = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) fail(`Unexpected argument: ${item}`);
    const value = items[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for ${item}`);
    result[item.slice(2)] = value;
    index += 1;
  }
  return result;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
