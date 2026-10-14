---
name: erik-presentation-style
description: >
  Personal presentation design skill for Erik Zaadi. Use this whenever creating or refining
  slide decks, Slidev presentations, Google Slides, or PPTX files for Erik. Captures the exact
  design language, voice, structural philosophy, and punny soul of his "Stop Managing Your Managers"
  talk and all presentations he builds. Trigger on: "make me a deck", "create slides", "Slidev
  presentation", "design slides like mine", "my presentation style", "Erik-style slides", or any
  request to build a talk, pitch, or presentation where Erik is the speaker.
---

# Erik Presentation Style Skill

This is your north star for any slide deck with Erik's name on it. The goal is not "polished corporate deck." The goal is: **a person talking to people, who happens to have slides**.

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
Every talk has a narrative arc. The shape of "Stop Managing Your Managers" was:

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
These are the real hex values extracted directly from the source PPTX - no guessing.

#### Foundation
| Role | Hex | Notes |
|------|-----|-------|
| **Slide background** | `#212121` | Near-black charcoal. Every slide. Non-negotiable. |
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
Cards use vertical gradients (top to bottom, 90°) and a 1.5pt border. Always rounded corners (`border-radius: 12px` or equivalent). All cards have a drop shadow:
- Color: `#000000`
- Opacity: 50%
- Angle: 90°
- Distance: 6px
- Blur radius: 4px

In CSS: `box-shadow: 0px 6px 4px rgba(0, 0, 0, 0.5);`

**Amber card** (used for "self/personal" topics - wellbeing, energy, life outside work):
- Gradient: `#4A300F` (top) -> `#CC8800` (bottom)
- Border: `#FFAB40`, 1.5pt
- Text: `#FFAB40` (matches border)

**Teal card** (used for "tools/systems" topics - trust, frameworks, peer feedback):
- Gradient: `#1A4A52` (top) -> `#4DD0E1` (bottom)
- Border: `#4DD0E1`, 1.5pt
- Text: `#E0F7FA` (very light teal - stays readable across the full dark-to-bright gradient)

**Neutral card** (used for general/mixed topics - group identity, relationships):
- Gradient: `#424242` (top) -> `#555555` (bottom)
- Border: `#E8E8E8`, 1.5pt
- Text: `#D1D1D1` (body text - never use muted `#727272` inside neutral cards, it disappears on the gray gradient)

**Red card** (used for warning/hard-truth topics - things to let go of):
- Gradient: `#3D1515` (top) -> `#CC0000` (bottom)
- Border: `#CC3333`, 1.5pt
- Text: `#FF6B6B` (lighter than the border - intentional, needed for contrast on the dark gradient)

Card text color always matches the card border color. Border is always 1.5pt - thinner than it looks. The gradient always runs top to bottom within the card.

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

The terminal has a visible title bar with the filename (e.g., `career.diff`) centered in muted text. The traffic light dots (red/amber/green) are in the top-left of the title bar.

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

**Section intro slide pattern:** Dark bg + colored left stripe + large teal/white heading + short gray subtext. No image needed. The restraint IS the design.

### What to Avoid
- Gradient backgrounds (never used in this deck - flat `#212121` throughout)
- Mixed card colors on the same slide (amber cards together, teal cards together - never mixed)
- Bullet point lists where each item is a single noun
- Slide titles that are just category labels ("Feedback", "Tools", "Conclusion")
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

### Front Matter Defaults
```yaml
---
theme: default
background: '#212121'
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: fade-out
css: unocss
---
```

### CSS Variables for Slidev
```css
:root {
  --color-bg: #212121;
  --color-text-primary: #F4F4F4;
  --color-text-body: #D1D1D1;
  --color-text-muted: #727272;
  --color-teal: #4DD0E1;
  --color-amber: #FFAB40;
  --color-card-amber-fill: #4A3010;
  --color-card-teal-fill: #1A4A52;
  --color-code-bg: #0D1117;
  --color-code-bar: #161B22;
  --color-diff-add: #3FB950;
  --color-diff-remove: #CC3333;
  --color-diff-add-bg: #002D00;
  --color-diff-remove-bg: #2D0000;
}
```

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

For the honest-gaps slide, use a slightly muted treatment - visually different from the confident slides. Lower energy is intentional.

---

## For Google Slides / PPTX

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

### Speaker Notes
Always include them. Slides are the memory cue; notes are the talk. The notes should read like Erik is actually saying it, not like a transcript of the slide.

---

## The GIF Language

GIFs are not decoration. Every GIF in an Erik deck is an argument. The image IS the point - either illustrating the concept directly or undercutting it with humor. If a GIF could be removed without losing meaning, it's the wrong GIF.

### The Fin GIF (mandatory closer)
**Every talk ends with this.** Always. Non-negotiable.

- **URL:** `https://media.giphy.com/media/11RgbBSgomKx6o/giphy.gif`
- **What it is:** A bird doing the dab. That's it. A bird. Dabbing.
- **Why it works:** It's absurd, it's committed, and it sticks the landing harder than any "thank you" slide ever could. The audience doesn't see it coming. That's the point.
- **Placement:** Bottom-left or bottom-center of the closing slide, alongside the north-star question and GitHub handle. Sized generously - not a thumbnail.

### The GIF-as-Argument Pattern
From the actual deck, the usage pattern:

| Slide concept | GIF used | Why it works |
|---|---|---|
| The meta diff (manager in a manager) | Yo Dawg meme | The meme IS the point - "I heard you like managers" |
| Finally, the tools | Mandalorian walking in | Cinematic arrival energy - the tools are the hero |
| Trust / earned not given | Ned Flanders peering suspiciously | Skepticism visualized |
| The faucet model | Popeye operating two faucets simultaneously | The GIF *demonstrates* the framework. Literal illustration. |
| Faucet up/down | Rick & Morty + Family Guy plumber | Two different faucet-related gifs for two states |
| Closing slide | Looney Tunes "That's All Folks!" | See above |

### Rules for GIF Selection
1. **The GIF must earn its place** - if you're reaching, don't use it
2. **Literal over metaphorical** - Popeye at faucets beats a stock "flexibility" image every time
3. **Pop culture over stock** - cartoons, memes, film/TV clips beat anything from a stock library
4. **One GIF per slide** - never two (slide 19 with two faucet GIFs is the exception that proves the rule)
5. **The fin GIF is the fin GIF** - don't substitute it with something "similar"

---

## Recurring Themes & Concepts to Know

These are Erik's actual frameworks. Use them correctly if they appear:

**The Faucet Model** - autonomy is a dial that goes up or down, manager-controlled. Faucet up = more space, more ownership. Faucet down = more support, more guidance. NOT a binary.

**LEAP** - bi-yearly two-way growth conversation. Not a performance review - bidirectional. Delivery, Project Management, Peopleware (in that order).

**Peer Feedback Chains** - structured lateral feedback between managers (not top-down). Creates mesh, not spokes. The key insight is horizontal trust.

**First Team** - the idea that managers should see their peer group as their primary team, not their own reports.

**Two Modes** - normal (warm, punny) vs. focused (crisp, direct). The pun is a signal; when it disappears, things are real.

**Bob-a-licious** - the actual name of Erik's team ritual when he ran the Builder team. Not required to reference, but useful color.

---

## The Closing Slide Formula

Erik's talks end with a reflection question, not a summary. From "Stop Managing Your Managers":

> What would break if you were not here tomorrow? Start there.

The close should:
- Be a question or provocation, not a recap
- Be something the audience can act on within 48 hours
- Not be "thank you for listening"
- Often include a GitHub handle or personal link (github.com/erikzaadi/manager-readme)

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
- "Build slides for my EMIL talk on [X]"
- "I'm giving a talk at [conference]. Make it punny and dark-background"
- "Turn my manager README into a deck"
- "Create slides for my hackathon kickoff presentation"
- "I want slides like the ones from my EMIL talk"