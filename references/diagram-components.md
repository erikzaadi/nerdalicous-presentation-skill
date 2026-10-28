# Diagram slides: Mermaid first, then native SVG/Vue components

Read this when a slide needs a diagram: a flow, a pipeline, lanes, a matrix, anything with boxes and connectors.

## The flow

1. **Draft with Mermaid.** In the first pass a diagram is a plain ` ```mermaid ` block, just enough to check that the story flows. Slides move, merge and disappear during the storytelling pass, so build native components only after the flow is agreed.
2. **Build one reference slide.** Start by reading `references/kit/examples/GreenCheckGap.vue`: a complete, working diagram (a station pipeline plus a two-wire loop revealed on click) that gets the measuring, the wires and the click registration right. Copy its structure, not its content. Turn the most important diagram into a polished component first, for example a horizontal line of stations with an SVG feedback loop. Derive the shared vocabulary below from it, so later diagrams read as one family instead of separate designs.
3. **Derive the rest from the shared primitives.** Each slide's layout stays one component per slide. A diagramming framework would cost more than the slides it saves.
4. **Add progressive reveals**, then **verify every click state** (below).

## Shared primitives

A deck made from the templates already has `references/kit/` copied in (`components/`, `utils/`, and `styles/` imported from `style.css`):

| File | What it is |
|---|---|
| `components/FxStation.vue` | A station card: icon, uppercase `name`, optional `sub`, `tone`, `size`. |
| `components/FxContract.vue` | An artifact handed between stations. Deliberately a different shape (flat, wide, tinted), so things and steps never look alike. |
| `components/FxWires.vue` | An SVG connector layer in the diagram's pixel space. Each `Wire` has a path `d`, a `tone`, an optional click `step`, and `ghost` (default true). |
| `utils/fx.ts` | `useBoxes()` measures registered elements relative to the diagram root; `wire(points, radius)` draws orthogonal paths with rounded corners. |
| `styles/fx-tokens.css` | The `--fx-*` colour tokens, read from the deck palette in `SKILL.md` (dark only), plus the `.fx-ghost` / `.fx-reveal` reveal states. Every kit component uses them, so append this first. |
| `components/TerminalWindow.vue` | The macOS-style terminal for diff and code slides: tinted diff rows, an optional `command` prompt line, one hairline ring, no drop shadow. |
| `components/FieldNote.vue` | The "Pro tip" note: a keyword-length lesson, sized to its text. |
| `styles/slides.css` | Cards (`card-teal`, `card-amber`, `card-neutral`, `card-red`, plus the opt-in `card-emphasis`), section intros (`section-teal`, `section-amber`) and the muted `honest` slide. |
| `examples/GreenCheckGap.vue` | A complete diagram to copy the structure from. Read-only reference: `new-deck.sh` doesn't copy it into decks. |

## Semantic colour

The `--fx-*` tokens carry meaning, and the same role gets the same colour on every slide. Teal, amber and green come from the deck palette; the others are muted companions picked to sit next to them on `#121212`. Change the values if a deck needs to, and keep the roles.

| Token | Role |
|---|---|
| blue | normal operations |
| teal | feedback, key relationships |
| green | contracts, good outcomes |
| amber | risk, human decisions |
| red | hard boundaries (policy, limits, blast radius) |
| purple | platform, config |

## Layout and wires

- **Cards in a CSS grid, connectors in SVG.** Cards stay editable HTML text. Wires are computed from the rendered cards.
- **Measure with layout offsets** (`offsetLeft`/`offsetTop` relative to the diagram root, as `useBoxes()` does). Slidev scales the slide with a transform, which skews `getBoundingClientRect`.
- **Re-measure** on a `ResizeObserver` and after `document.fonts.ready`.
- **Centre absolutely positioned elements** with `left: 0; right: 0; margin-inline: auto`. Layout offsets ignore `transform`, so a transform-centred card puts its wires in the wrong place.

## Progressive reveals

- **2 to 4 meaningful states per slide**, each click introducing one concept, with a matching `[click]` in the notes (see `references/speaker-notes.md`).
- **Unrevealed parts stay as a faint blueprint** (`.fx-ghost`, opacity 0.14 while hidden), so every intermediate state looks intentional. Use `.fx-reveal` for what should be fully hidden until its click, such as a punchline loop.
- **Fades only**, no movement.

## Text on diagrams

Labels, not sentences: the spoken content lives in the notes. A diagram slide carries at most one `FieldNote`, with a keyword-length lesson.

## Verify every click state

A diagram is done when every click state has been rendered and inspected:

```sh
npx slidev export --format png --with-clicks --range N --output /tmp/slide-N
```

Montage the PNGs and check each state for overflow, wire alignment, and orphaned words (the copyfitting rule in `SKILL.md`).

## Shapes that work

The same primitives cover most diagram shapes. Each stays one component per slide:

- **Pipeline**: a station line with a feedback loop wired back to the start (the usual reference slide).
- **Zig-zag**: stations alternating with the artifacts (`FxContract`) handed between them.
- **Router**: a decision diamond fanning out to coloured lanes that converge again.
- **Boundaries**: dashed enforcement lines drawn around groups of stations.
- **2×2 matrix**: four quadrants with labelled axes.
- **Foundation**: a platform base with things running on top of it (trains on rails).
- **Swimlanes**: lanes plus a dependency graph across them.
- **Loop**: two lanes joined by a feedback wire.
- **Agenda strip**: a numbered row of parts, revisited as a breadcrumb between sections.
- **Who we are**: an ID badge per presenter, sharing speaker data with the closing slide through a small `utils/speakers.ts`.
