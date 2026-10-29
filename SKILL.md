---
name: nerdalicous-presentation-skill
description: >
  Erik Zaadi's presentation style: voice, story arc, visual design, and Slidev workflow. Use when
  building or refining any talk, deck or slides Erik presents (Slidev, Google Slides, PPTX),
  including its speaker notes, rehearsal audio, slide images, and diagram / SVG slides.
---

# Erik Presentation Style Skill

This is your north star for any slide deck with Erik's name on it. The goal is not "polished corporate deck." The goal is: **a person talking to people, who happens to have slides**.

## Before Drafting

**Intake.** Ask once, in a single round, for whatever the request didn't already say. Use the host's structured question tool if it has one, otherwise a plain message:
- How many presenters, and their names. These become the `[Name]` tags in the speaker notes and one voice each in the rehearsal audio.
- The speaker-notes language. Erik usually writes notes in English; only Hebrew (or another RTL language) turns on RTL notes.
- The kind of talk (meetup, conference, keynote, internal). It sets the length and tone, and `OPENAI_TTS_TALK` in the deck's `.env` for the rehearsal voice.

**Draft order: story first.** The first pass uses visual placeholders (image prompts, GIF and meme placeholders) and plain Mermaid diagrams, so the flow is cheap to review and reshuffle. Generated images, picked GIFs, memes and native diagrams come after Erik agrees the flow, and image generation and GIF search run only when he opts in.

**New Slidev deck.** Run this skill's `new-deck.sh <deck-dir>` (`--no-install` to only copy). It copies `scripts/`, the kit (`references/kit/` components, utils and styles) and the templates into a new folder, downloads the fin GIF into `public/images/`, runs `npm install`, and installs Chromium for the notes PDF. It refuses a folder that isn't empty.

It also picks a free port (3100–3999) for the deck's `npm run dev`, and writes MCP configs for Slidev's built-in server at `http://localhost:<port>/__mcp` as `slidev`: `.mcp.json` (Claude Code), `.cursor/mcp.json` (Cursor) and `.codex/config.toml` (Codex; trusted projects only).

**Slidev MCP tools.** With the dev server running, the `slidev` tools (`slidev-get-info`, `slidev-list-slides`, `slidev-get-slide`, `slidev-update-slide`, `slidev-insert-slide`, `slidev-remove-slide`, `slidev-move-slide`, `slidev-goto-slide`) edit the deck by slide number, and `slidev-goto-slide` moves the open browser to a slide to check it after an edit. The agent loads them at startup, so start the dev server first. If it started later, reconnect (`/mcp` → Reconnect in Claude Code) or restart the agent. Without the tools, edit `slides.md` directly. `npx slidev mcp slides.md` is a stdio fallback for agents without HTTP MCP: same tools except `slidev-goto-slide`, no dev server needed.

It needs Node 24 or newer (`.nvmrc`). `templates/slides.md` is a starter with the headmatter defaults, the notes format, and the arc's key slides; `templates/style.css` holds the palette variables and imports the kit's styles. Replace the starter's content during the story pass.

**Bundled scripts** (run through the npm scripts in `templates/package.json`; they read the deck with Slidev's own parser, and load keys (`OPENAI_API_KEY` for audio and images, `GIPHY_API_KEY` for GIF search) from a gitignored `.env` in the deck root, next to `slides.md`):
- `generate-speaker-notes-pdf.mjs`: one printable card per slide.
- `generate-speaker-notes-audio.mjs`: rehearsal MP3, one voice per presenter; `--verify` transcribes it back to catch skipped speech.
- `generate-slide-images.mjs`: turns image prompts into full-bleed 16:9 slide images, with the whole deck as context.
- `find-gifs.mjs`: Giphy candidates for GIF placeholders as a contact sheet Erik picks from, then downloads the picks.
- `generate-memes.mjs`: makes meme placeholders into images with memegen.link (no key).

---

## Voice & Tone

**The fundamental truth:** Erik writes like he talks. Warm, direct, a little punny, and self-aware. Never corporate. Never stiff.

### The Pun Rule
Puns are not decoration - they are structural. Every presentation should have:
- A punny title or subtitle (the talk was literally called "Stop Managing Your Managers")
- At least one pun that lands hard enough to groan
- Puns embedded in section names, tool names, slide titles - not just as garnish
- A meta-acknowledgment that puns are happening ("There might be wild puns busting through")

Pun quality bar: it should make a room simultaneously groan AND laugh. Puns that only make sense to engineers are fine, preferred even.

### Two Modes (and both show up in slides)
**Normal mode** - warm, curious, punny. This is the default register. Conversational. Like a good coffee-shop conversation that happens to have takeaways.

**Focused mode** - crisp, direct, no fluff. Used for the moments that need to land hard. "What would break if you were not here tomorrow? Start there." No softening.

Slides should carry this rhythm. Not every slide is the same intensity.

### What Erik does NOT sound like
- "In this presentation, we will explore..."
- Bullet points as sentences ending in nouns
- Corporate buzzword soup
- Fake humility ("I'm no expert but...")
- Hype language ("game-changing", "disruptive")

### Punctuation Rule
**Never use em dashes (--).** Not in slide text, not in speaker notes, not in any generated output. Use a hyphen (-) or restructure the sentence. This applies everywhere, no exceptions.

---

## Structural Philosophy

### Story Arc, Not Outline
Every talk has a narrative arc. As an example, the shape of "Stop Managing Your Managers" was (adapt the beats to the talk, keep the honest gaps and the clean close):

1. **Hook + credentials** (fast, punny, establishes who's talking)
2. **The gap nobody warns you about** (the real problem being solved)
3. **The honest diff** (what actually changes - show the code diff!)
4. **The hard things** (what you have to give up - this builds trust)
5. **YOU first, before the tools** (personal change before frameworks)
6. **The tools** (the actual substance - peer feedback, faucet, LEAP)
7. **What I still don't have figured out** (intentional vulnerability - this is signature Erik)
8. **The goal / north star** (a clean, memorable close)

"What I still don't have figured out" is a deliberate Erik move. It builds more credibility than a "here's what I nailed" ending. Always consider an honest-gaps slide.

### Slide Density Philosophy
- Slides are **memory cues and visual anchors**, not documents
- Speaker notes carry the full thought; slides carry the signal
- One idea per slide is the rule; sometimes half an idea
- If you could read the slides and skip the talk and get the same value... the slides failed
- Visuals > bullets. Always.
- On-screen text never repeats what is said aloud. A missing visual becomes a placeholder, never a sentence: a GIF (`<ImageTBD kind="gif" prompt="..." source="..." />`) or a meme (`<ImageTBD kind="meme" template="..." top="..." bottom="..." />`) when an off-the-shelf moment is the joke, otherwise an image prompt (`<ImageTBD prompt="..." />`).

Once an image, GIF or meme exists, its slide becomes a full-bleed photo slide (`layout: image`, `image: /images/<name>.png`, `class: photo-slide`, plus `backgroundSize: contain` for most GIFs and every meme): the `ImageTBD` and the on-screen title go, and the title moves into the notes as the first spoken line (a plain beat, not a second `Punchline:`; a slide keeps one punchline) and into the `title:` key. A slide that keeps its text gets a `split-photo` instead (an image composed with an empty left half for the text, never Slidev's cropping `image-right`). The scripts don't edit `slides.md`, so make this swap after generating or downloading.

**Missing visuals, slide images, GIFs, memes, or photo slides** → read `references/image-placeholders.md`.

**Rehearsing, or presenting from a static build** → point the presenter to `PRO-TIPS.md` (two-tab presenter view, editing notes live, rehearsal and the reset ceremony).

### Speaker Notes
Always include them. Slides are the memory cue; notes are the talk, written as 3 to 5 short beats in Erik's voice that close on a handoff line into the next slide.

**Writing speaker notes, click cues, the notes PDF, or rehearsal audio** → read `references/speaker-notes.md`.

### The Code Diff Slide
Erik uses code diff formatting (`career.diff`, `career_v2.diff`) to make abstract career transitions concrete and programmer-legible. This is a signature move. Replicate it when showing before/after, transitions, or mindset shifts.

```diff
- ship code, own the PR
+ review code, unblock the PR
- fast feedback: did it compile?
+ slow feedback: did the team grow this iteration?
```

Use this format whenever contrasting two states of anything.

---

## Visual Design Language

### Exact Color Palette
These are the real hex values extracted directly from the source PPTX - no guessing. The card fills below are the exception: they are tuned for a quieter default and for contrast.

#### Foundation
| Role | Hex | Notes |
|------|-----|-------|
| **Slide background** | `#121212` | Near-black (the source deck used charcoal `#212121`; `#121212` is darker while cards, shadows and the terminal still separate from it). Every slide. Non-negotiable. Set only as `--color-bg` in `style.css`, so a venue that suits pure black (an LED wall) is a one-line change. |
| **Primary title text** | `#F4F4F4` | Off-white, not pure white. Used for main headings. |
| **Body / subtitle text** | `#D1D1D1` | Light gray. Second-level text, descriptions. |
| **Muted / caption text** | `#727272` | Dark gray. De-emphasized text, metadata. |

#### Accent Colors
| Role | Hex | Notes |
|------|-----|-------|
| **Teal - primary accent** | `#4DD0E1` | Source XML value. Section titles, highlighted words, card borders, left stripe. Closest rendered value: `#50CDE9`. Use either. |
| **Amber - secondary accent** | `#FFAB40` | Source XML value. Used for the amber theme (cards, stripe). Rendered as `#FDAB3B`. Use either. |

#### Section Stripe (left-edge vertical bar)
Every section intro slide has a thin colored stripe on the left edge. Flat color only - gradients look muddy on a narrow vertical stripe:
- Amber sections: `#FFAB40` (flat)
- Teal sections: `#4DD0E1` (flat)
This is the ONLY decorative stripe that appears - it's intentional, not a generic AI-filler bar.

#### Card / Box Colors
Cards and anything button-like (a tool card, a call-to-action box, a link box on the close) share one treatment. Always rounded corners (`border-radius: 12px`). The kit's `references/kit/styles/slides.css` (imported by the template `style.css`) has it as classes: `<div class="card card-teal"><h3>Label</h3>One line.</div>`, with `card-amber`, `card-neutral` and `card-red` alongside.

**Default: quiet.** A dark fill with a hint of the accent, shaded only slightly top to bottom, a restrained accent border (1.5px), a light shadow (`0 2px 4px rgba(0, 0, 0, 0.3)`), the heading in the accent and the body text bright. Use it for every card unless one card is the point of the slide.

**Emphasis: opt-in.** Add `card-emphasis` for the one card the slide is about: the takeaway among the options, the single north-star card. It gets the strong gradient, a full-strength accent border, a firmer shadow (`0 4px 6px rgba(0, 0, 0, 0.4)`) and near-white text (`#FAFAFA`). At most one or two per slide, never a whole grid; if everything is emphasized, nothing is.

| Card | Topics | Default fill (top → bottom) | Border | Heading / body | Emphasis gradient |
|---|---|---|---|---|---|
| **Teal** `card-teal` | tools, systems: trust, frameworks, peer feedback | `#223234` → `#1B2425` | `#35848E` | `#4DD0E1` / `#E0F7FA` | `#1A4A52` → `#1E7380`, border `#4DD0E1` |
| **Amber** `card-amber` | self, personal: wellbeing, energy, life outside work | `#372D20` → `#27211A` | `#A06E2E` | `#FFAB40` / `#FFEBD1` | `#4A300F` → `#8F5A00`, border `#FFAB40` |
| **Neutral** `card-neutral` | general, mixed: group identity, relationships | `#2C2C2C` → `#202020` | `#666666` | `#F4F4F4` / `#D1D1D1` | `#424242` → `#555555`, border `#E8E8E8` |
| **Red** `card-red` | warnings, hard truths: things to let go of | `#311F1F` → `#241919` | `#A32B2B` | `#FF6B6B` / `#FFE0E0` | `#3D1515` → `#8F1414`, border `#CC3333` |

Text stays readable across the whole card: body text is above 9:1 on every default fill, and the emphasis gradients stop short of the bright accent so near-white text keeps 4.5:1 down to the bottom edge. Never put muted `#727272` text inside a card. For Google Slides or PPTX, use the same hex values (a two-stop gradient, or the top color as a flat fill).

#### Code / Terminal Block
The diff slides use a macOS-style terminal window:
| Element | Hex |
|---------|-----|
| Terminal window bg | `#0D1117` (very dark navy-black) |
| Terminal title bar | `#161B22` (slightly lighter) |
| Traffic light dots | Red `#FF5F57`, Amber `#FEBC2E`, Green `#28C840` |
| Code text (default) | `#E6EDF3` (light blue-white) |
| Comment / muted code | `#8B949E` (muted gray-blue) |
| Diff `+` added line | `#3FB950` (GitHub-style green) |
| Diff `-` removed line | `#CC3333` / `#D2011D` (GitHub-style red) |
| Diff `+` line bg | `#002D00` (very dark green tint) |
| Diff `-` line bg | `#2D0000` (very dark red tint) |

The terminal has a visible title bar with the filename (e.g., `career.diff`) centered in muted text. The traffic light dots (red/amber/green) are in the top-left of the title bar. In Slidev, start from `references/kit/components/TerminalWindow.vue`.

### Typography
Fonts embedded in the source deck:

| Role | Font | Weight |
|------|------|--------|
| Display / main title | `Montserrat Light` | Light (300) |
| Section titles, headlines | `Montserrat Medium` | Medium (500) |
| Subheadings, emphasis | `Montserrat SemiBold` | SemiBold (600) |
| Body text, labels | `Comfortaa Medium` | Medium |
| Code blocks, diffs | `Roboto Mono` | Regular |

Fallback stack for web/Slidev: `'Montserrat', 'Comfortaa', sans-serif` for UI; `'Roboto Mono', monospace` for code.

**Font sizes (from source XML, in points):**
| Element | Size |
|---------|------|
| Cover title | 44-45pt |
| Section title (large) | 48-52pt |
| Slide heading | 34pt |
| Subheading / body | 24pt |
| Body text | 20pt |
| Caption / small | 18-19pt |
| Code | 19-20pt |

### Layout Patterns
**Two-column:** concept left, visual/code right. Workhorse layout.

**Big statement + small subtext:** Used for punchy moments. Title dominates. Subtext is almost a whisper.

**The honest list:** Section headers as claims, not just labels. "The hardest things to let go of" is better than "Challenges."

**Visual metaphors made literal:** The faucet isn't described - it's drawn/visualized. The diff isn't explained - it's shown in diff format. Always ask: can this abstract thing be shown rather than said?

**Diagram / SVG slides** (flows, pipelines, lanes, matrices) → read `references/diagram-components.md`.

**Section intro slide pattern:** Dark bg + colored left stripe + large teal/white heading + short gray subtext. No image needed. The restraint IS the design. In Slidev: `class: section-teal` (or `section-amber`) in the slide's frontmatter.

### What to Avoid
- Gradient backgrounds (never used in this deck - flat `#121212` throughout)
- Strong gradients or heavy shadows on every card (the quiet card is the default; `card-emphasis` is for the one card that matters)
- Mixed card colors on the same slide (amber cards together, teal cards together - never mixed). Diagrams are the exception: there each color is a semantic role (see `references/diagram-components.md`), and mixing roles is the point.
- Bullet point lists where each item is a single noun
- Slide titles that are just category labels ("Feedback", "Tools", "Conclusion")
- Invented numbers that look real (a line count on a PR, a percentage, a survey result). Use a real number, leave it out, or label it on the slide as illustrative (`photo-tag` in `photo-slide.css`)
- Any slide that looks like it was made with a wizard
- White backgrounds (even for "light" moments - everything stays dark)

### Copyfitting
Erik has a strong preference for tight, intentional text flow. The rule: **no orphaned words**.

- If a title or card label wraps to a new line for a single word, rewrite it - shorten, rephrase, or redistribute across lines deliberately
- A two-line title is fine. A two-line title where the second line is one word is not
- Same applies inside cards - if the last line of card text is a single dangling word, fix the copy
- Preferred fix order: shorten the text first, adjust font size second, force a different line break third
- Never just accept the default wrap and move on

This applies everywhere: slide titles, card labels, subtitles, body text. If it orphans, it ships wrong.

---

## Slide Design Guidelines

### Space and Density
- Use screen estate properly - less empty is good, overcrowded is not. Slides should breathe but not feel sparse.
- Fewer elements per slide is almost always better. If you're debating whether to split a slide, split it.
- Single large elements (one big image, one big statement) beat a grid of small things. A slide with one thing on it is not a waste of space - it's a signal.
- If an image or visual will be on screen for more than ~2 minutes while talking, it will stop registering. Either move on or break it into smaller beats.

### Hooks and Momentum
- The opening slide has one job: make people put their phones down and want to know what comes next. Not "here's my agenda." Not "let me introduce myself." A hook.
- Build breadcrumbs across the talk - not a full agenda slide, but enough signposting that the audience always knows roughly where they are and that there's more coming.
- Every section transition should create mild anticipation for the next one. "Before the tools - YOU need to change" is a better section title than "Prerequisites" because it makes people lean in.
- The talk should have a clear buildup arc: problem established early, tension held through the middle, payoff earned at the end. If someone could leave after slide 5 and feel complete, the hook isn't working.
- Callbacks reward people who stayed. Reference something from the opening at the close.

### Headmatter and CSS Variables
`templates/slides.md` carries the headmatter defaults (dark-only `colorSchema`, the Montserrat / Comfortaa / Roboto Mono fonts, fade transitions, hash routing for static hosting). `templates/style.css` carries the palette above as `--color-*` variables, including the background, and sets the fonts per element. The kit's `references/kit/styles/fx-tokens.css` reads those variables, so diagrams, field notes and photo slides follow the palette. `TerminalWindow.vue` deliberately keeps its own GitHub-dark colors.

### Code Diffs in Slidev
Use Shiki's diff highlighting. Filename matters - use meaningful names like `career.diff` or `team-dynamics.diff`.

````md
```diff {career.diff}
- manage tasks directly
+ manage the manager managing tasks
```
````

### Slide Structure in Slidev
Use layout: `two-cols`, `center`, `default`, `cover`, `section` appropriately.

For the big punchy one-liner slides:
```md
---
layout: center
class: text-center
---

# The thing nobody warned you about

The mechanics change. The fundamentals do not.
```

For the honest-gaps slide, use a slightly muted treatment - visually different from the confident slides. Lower energy is intentional. In Slidev: `class: honest` in the slide's frontmatter.

**Click reveals, custom components, images, dark mode, or hosting a build** → read `references/slidev-gotchas.md`.

---

## For Google Slides / PPTX

**Porting a finished Slidev deck** (notes, reveals, diagrams, verification) → read `references/google-slides.md`. The patterns below apply either way.

### Slide 1 (Cover) Pattern
- Talk title (large, punny)
- Subtitle that either explains or undercuts the title
- Speaker name + minimal credentials (role, company, GitHub handle)
- A meta-joke or warmup note (e.g., "There might be wild puns busting through")

### Recurring Slide Patterns to Reuse
1. **The diff slide** - monospace font, diff colors (red/green), filename in corner
2. **The gap/problem slide** - two columns showing "looks similar" vs "is actually different"
3. **The tool card** - icon + name + one-liner on what it solves, clean card layout
4. **The honest-gaps slide** - intentionally lower energy, honest items, no claim of completeness
5. **The north-star close** - single bold statement + 3-4 supporting "each one solves X" items

---

## The GIF Language

GIFs are not decoration. Every GIF in an Erik deck is an argument. The image IS the point - either illustrating the concept directly or undercutting it with humor. If a GIF could be removed without losing meaning, it's the wrong GIF.

### The Fin GIF (mandatory closer)
**Every talk ends with this.** Always. Non-negotiable.

- **URL:** `https://media.giphy.com/media/11RgbBSgomKx6o/giphy.gif`
- **What it is:** A bird doing the dab. That's it. A bird. Dabbing.
- **Why it works:** It's absurd, it's committed, and it sticks the landing harder than any "thank you" slide ever could. The audience doesn't see it coming. That's the point.
- **Placement:** Bottom-left or bottom-center of the closing slide, alongside the north-star question and GitHub handle. Sized generously - not a thumbnail.
- **Ship it locally:** download it into `public/images/`, since venue Wi-Fi is unreliable.

### The GIF-as-Argument Pattern
Examples from "Stop Managing Your Managers". Each talk needs its own GIFs; the pattern is what carries over:

| Slide concept | GIF used | Why it works |
|---|---|---|
| The meta diff (manager in a manager) | Yo Dawg meme | The meme IS the point - "I heard you like managers" |
| Finally, the tools | Mandalorian walking in | Cinematic arrival energy - the tools are the hero |
| Trust / earned not given | Ned Flanders peering suspiciously | Skepticism visualized |
| The faucet model | Popeye operating two faucets simultaneously | The GIF *demonstrates* the framework. Literal illustration. |
| Faucet up/down | Rick & Morty + Family Guy plumber | Two different faucet-related gifs for two states |
| Closing slide | The dabbing bird | The fin GIF, see above |

### GIF, meme, or generated image
While drafting, offer a GIF or meme placeholder wherever an off-the-shelf moment is the argument, instead of defaulting to an image prompt: a famous film or TV moment is a GIF, a familiar template with the talk's own caption is a meme, and a visual only this talk could have is a generated image. Erik picks the actual GIF; `references/image-placeholders.md` has the placeholders and the scripts.

### Rules for GIF Selection
1. **The GIF must earn its place** - if you're reaching, don't use it
2. **Literal over metaphorical** - Popeye at faucets beats a stock "flexibility" image every time
3. **Pop culture over stock** - cartoons, memes, film/TV clips beat anything from a stock library
4. **One GIF per slide** - never two, unless the two GIFs are the point (two states side by side, like faucet up and faucet down)
5. **The fin GIF is the fin GIF** - don't substitute it with something "similar"
6. **Memes follow the same rules** - the caption is the talk's own line, short enough to read from the back of the room

---

## Past Talks

Erik's own frameworks from earlier talks (the Faucet Model, LEAP, peer feedback chains, First Team) → read `references/past-talks.md` when a talk touches management, or when Erik references one of them. Use them correctly; don't force them into unrelated talks.

---

## The Closing Slide Formula

Erik's talks end with a reflection question, not a summary. From "Stop Managing Your Managers":

> What would break if you were not here tomorrow? Start there.

The close should:
- Be a question or provocation, not a recap
- Be something the audience can act on within 48 hours
- Not be "thank you for listening"
- Often include a GitHub handle or a link to the talk's companion (a repo, a README, a blog post). Erik's: `github.com/erikzaadi`, and his public talks at `erikzaadi.com/slides`. Never guess a co-presenter's handle; ask.

---

## Quality Check Before Shipping

Before finalizing any deck, ask:

- [ ] Does it have at least one pun that earns a groan?
- [ ] Could someone read the slides alone and get the whole talk? (Bad if yes)
- [ ] Is there a "what I don't have figured out" / honest-gaps moment?
- [ ] Does the close leave the audience with a question or action, not a summary?
- [ ] Are there any slides that are just bullet point lists with no visual element?
- [ ] Do the slide titles read as **claims** or just **category labels**? (Claims are better)
- [ ] Is the diff format used anywhere it should be? (Before/after, mindset shifts)
- [ ] Are speaker notes present and written in Erik's voice?

---

## Sample Prompts This Skill Handles Well

- "Create a Slidev deck for my talk on [topic], Erik-style"
- "I'm giving a talk at [conference]. Make it punny and dark-background"
- "Turn my manager README into a deck"
- "Create slides for my hackathon kickoff presentation"
- "I want slides like the ones from "Stop Managing Your Managers""