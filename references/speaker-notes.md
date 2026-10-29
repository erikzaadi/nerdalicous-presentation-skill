# Speaker notes, the notes PDF, and rehearsal audio

Read this when writing or revising a deck's speaker notes, or producing the notes PDF, rehearsal audio or rehearsal video.

## Writing the notes

Notes are the script; slides are cues. A slide's notes are its **last** `<!-- -->` comment block (Slidev's rule, which the scripts follow too), and they follow one shape:

```md
<!--
[Erik]
- beat one
- beat two

[click]

- beat three, after the reveal
Punchline: the line to land

Handoff: "the sentence that sets up the next slide"
-->
```

- **Beats**: 3 to 5 short `- ` bullets, in the presenter's voice.
- **Presenter tag**: the first line names who presents the slide, using the names from intake: `[Erik]`, `[Dana]`, `[Erik + Dana]`. Write it even for a solo talk, since both scripts read it. On shared slides, attribute single lines inline (`Dana: ...`). A `[Name]` line mid-block switches speaker until the next tag.
- **Handoff**: the last line, `Handoff: "..."`, leads into the next slide. Use `Handoff (Name): "..."` when a specific presenter says it. Read the notes slide after slide: each handoff must set up the next slide's opening.
- **Punchline**: `Punchline:` marks the line to land. The label is for the presenter; the rehearsal audio speaks only the line. One punchline per slide. When a photo slide drops its on-screen title, the notes open with that title as the first spoken line, as a plain beat, not as a second `Punchline:`.
- **Hebrew notes** use the same shape with `מעבר:` for the handoff and `הפאנץ':` for the punchline. The scripts accept both languages' markers.
- **Stage cues**: `[click]`, `[click:N]`, `[beat]`, `[BEAT - 2 seconds]` and `[small laugh]` on their own line are cues, not presenters. Any other standalone `[Name]` line is a presenter tag.

## Click markers

Put `[click]` in the notes where the presenter advances a `v-click`, and `[click:2]` for two clicks at once (case doesn't matter). Presenter view highlights the note text that belongs to the current click, so the presenter always sees what to say for what's on screen.

Slidev only parses `[click]` and `[click:N]`. Write two clicks as `[click:2]`, since `[CLICK, CLICK]` shows as plain text with no highlight.

Rehearse in presenter view with the dev server running (`npm run dev`, then `/presenter`). Notes are editable there and save back to `slides.md`, so fix beats and move click markers while rehearsing.

## RTL notes (Hebrew only)

Only when intake says the notes are in Hebrew (or another RTL language): uncomment the `rtl-notes.css` import in the deck's `style.css`, and add `--lang he` to the `notes:pdf` and `notes:audio` npm scripts. The PDF lays out `he`, `ar`, `fa` and `ur` right to left, but the audio script only knows English (`en`) and Hebrew (`he`); another language needs its entry in the script's `LANGUAGES` table first (slide announcement, "and", voice direction). A global `.slidev-note` rule beats wrapping each note in an RTL `<div>`, because markdown inside an HTML wrapper needs blank lines around it to keep its bullets.

## Notes PDF

`npm run notes:pdf` (`scripts/generate-speaker-notes-pdf.mjs`) renders one card per slide (number, title, presenter, notes) to `speaker-notes.pdf` via `playwright-chromium`.

- Image-only slides have no heading, so give them a `title:` key in the slide frontmatter. Slidev uses it for navigation and never draws it, and the PDF uses it as the card title.
- Use this script instead of `slidev export-notes`, which broke when a full-bleed cover background covered every page.

## Rehearsal audio

`npm run notes:audio` (`scripts/generate-speaker-notes-audio.mjs`) reads the notes from `slides.md` and writes `speaker-notes.mp3`. It needs `OPENAI_API_KEY` in the deck's `.env`.

1. Run with `--print` to see the exact text each voice will say, `⟦Name⟧`-marked, before spending money. `--dry-run` shows the requests and voices.
2. Run it for real. Each presenter gets their own voice, in this order of precedence: their entry in `OPENAI_TTS_VOICES` (e.g. `erik=cedar,dana=marin` in `.env`) or a `--voice-<name> <voice>` flag (e.g. `--voice-dana onyx`); then `--voice` / `OPENAI_TTS_VOICE` (default `cedar`) for the first presenter; then the next unused voice for everyone else. `--talk "keynote"` (or `OPENAI_TTS_TALK`) tells the voice what kind of talk it's rehearsing; the default is "tech talk".
3. Run `npm run notes:verify` (below).

How it works, and why:

- **Model**: `gpt-audio-1.5` through Chat Completions, overridable with `OPENAI_TTS_MODEL` in `.env` (or `--model`). `gpt-4o-mini-tts` and `tts-1` shut down on 2027-01-06 (OpenAI's deprecations page, checked 2026-10-14). OpenAI's named replacement, `gpt-realtime-2.1-mini`, is Realtime-only (WebSocket, raw PCM), which would mean a dependency and no MP3 without ffmpeg. `gpt-audio-1.5` keeps plain HTTPS, MP3 and the `cedar`/`marin` voices. Recheck the deprecations page before each new deck. `OPENAI_TTS_MODEL` swaps between models on the two HTTP routes the script knows: Chat Completions audio models (`gpt-audio-*`) and the legacy `/v1/audio/speech` models (`tts-*`, `gpt-4o-mini-tts`; `tts-1` takes no voice instructions and only the classic voices like `alloy` or `ash`, not `cedar`/`marin`). A Realtime-only model needs code changes, not just the variable.
- **It's a chat model, so its prompt pins it to verbatim reading**: "a text-to-speech engine, not an assistant; read word for word". Keep the voice instructions free of example phrases it could copy: a sentence describing slide announcements made it invent one for a chunk that had none.
- **Short requests**: one request per slide, and per speaker run within a slide, capped at `--max-chars` (1,500). Long requests make the voice silently skip passages: a 4,450-character Hebrew request dropped whole slides while returning a plausible-length file. Hebrew is token-heavy, which makes it worse.
- **MP3, joined by byte concatenation**: MP3 frames are self-contained, so no ffmpeg is needed. That's fine for rehearsal, but some players misreport the duration or seek imprecisely. When that matters, write `--output speaker-notes.wav` and encode it once with ffmpeg. The `.wav` output also enables `--exact-beats`, which inserts exact silences for plain `.txt` transcripts.
- **Per-clip cache** in `.speaker-notes-chunks/`: each clip's file name is a hash of its text, voice, model and instructions, so editing a slide regenerates only its clips, and inserting or moving slides regenerates nothing else. `chunks.json` there records the current order. Delete the folder to clear old clips.
- **Input**: `slides.md` is exact, including slides pulled in with `src:`. The notes PDF also works, but only as best effort, because `pdftotext` scrambles mixed Hebrew/English: brackets mirror, punctuation jumps sides, and about 8% of words come out of order.

### Verify by transcribing it back

Duration alone hides skipped passages, and many agents can't listen to audio at all. So verify by transcription, whether or not you can listen:

```sh
npm run notes:verify
```

It sends each clip to `/v1/audio/transcriptions` (`gpt-transcribe` by default, or `OPENAI_TRANSCRIBE_MODEL`; `gpt-4o-transcribe` shuts down on 2027-02-26) in the notes language, compares the words heard with the words sent, and lists every clip below 75% overlap (`--min-overlap 0.8` to change it) with its slide, expected and heard text. Regenerate those with `--force` or a lower `--max-chars`. It works per clip, because a transcriber skims one long file too. "Click" cues don't count, since the voice sometimes drops them and that's harmless.

Word overlap is a heuristic: it catches skipped passages, not reordered or repeated ones. Listen to the flagged slides, and to the opening and the close, before relying on the file.

## Rehearsal video

`npm run notes:video` (`scripts/generate-speaker-notes-video.mjs`) turns the deck and its rehearsal audio into `speaker-notes.mp4`: each slide stays on screen while its clips play. Run `notes:audio` first; the video reads its clip cache (`.speaker-notes-chunks/chunks.json`), not the joined MP3. It needs the `ffmpeg` binary on PATH (`brew install ffmpeg`) and nothing from npm: the frames come from `slidev export --format png --with-clicks`, which uses the deck's `playwright-chromium`.

- **Timing**: each slide lasts as long as its clips (measured with `ffprobe`), plus `--gap` seconds (0.6) before the next one. A slide without notes stays up for `--hold` seconds (3).
- **Clicks**: the export has one frame per click step, and the frame advances at each spoken "Click", placed by its word position within its clip. That's an estimate, not a measurement, so a click can land a word or two early or late. When a slide's click steps and its `Click` cues don't match, the script warns: with fewer cues, the last steps never show; with more, the extra cues are ignored. Fix the notes, not the script.
- **GIFs**: the PNG export freezes GIFs, so on a GIF photo slide (`layout: image` with a `.gif` `image:`) the GIF is laid over the frame and loops for as long as the slide is up, fitted the way `backgroundSize` says (`contain` or `cover`). A GIF anywhere else, like the fin GIF as an inline `<img>`, stays frozen, with a warning.
- **Not animated**: slide transitions and `v-click` fades; clicks are cuts.
- `--frames <dir>` reuses an earlier export instead of exporting again; `--fps` (24) sets the frame rate.
- The narration says the slide announcements ("Slide 4. Mor.") like the audio does, and it's an AI voice: the video is for rehearsing and reviewing the flow, not for publishing as the talk.
