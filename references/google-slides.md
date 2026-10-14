# Porting a Slidev deck to Google Slides (or PPTX)

Read this when a finished Slidev deck has to move to Google Slides or PowerPoint: co-presenters who want to edit together, or a conference that requires its own template.

Port late. The story, notes and images should be agreed in Slidev first, because every change after the port has to be made by hand. Decide up front which copy is the source of truth from then on, and say so in the deck's README.

## Pick a path

| Path | How | Editable? | Use when |
|---|---|---|---|
| **Image deck** | `npx slidev export --format pptx --with-clicks`, then import the PPTX into Google Slides | No: each slide is a picture | Only the organisers need the file, or the deck is final |
| **Rebuild** | Recreate each slide with native text boxes and shapes, reusing exported images for the hard parts | Yes | Co-presenters will edit, or the conference template is mandatory |

Most ports are a mix: native text for titles, cards and field notes, and exported images for diagrams and terminals.

## Decisions per element

- **Text**: native text boxes, so co-presenters can edit it. Montserrat, Comfortaa and Roboto Mono are Google Fonts, so Google Slides has them. PowerPoint needs them installed on the presenting machine, or embedded.
- **Diagrams (Vue/SVG)**: export them as images (`npx slidev export --format png --with-clicks --range N`) unless someone needs to edit them. Rebuilding wires as native connectors costs hours and rarely looks as good.
- **Click reveals**: one slide per reveal state, using the PNG for each state, beats re-creating the reveal as Slides animations. Animations behave differently across Google Slides, PowerPoint and Keynote, and break on conference machines. Re-create them as animations only for simple text reveals that co-presenters will edit.
- **Terminal / diff slides**: an image of the `TerminalWindow` for fidelity, or a native monospace text box on a `#0D1117` rectangle when the code has to stay editable.
- **Photo slides**: the image as the slide background (full-bleed), with the field note as a text box on a solid card.
- **GIFs**: insert from the deck's local `public/images/` copy (Google Slides plays animated GIFs). Never hotlink.
- **Conference template**: keep the structure, the voice and the one-idea-per-slide density. Accept their fonts and colours, and put the dark photo slides and diagrams in as full-bleed images.

## Speaker notes

Copy each slide's notes into that slide's speaker notes. When a reveal becomes several slides, split the notes at their `[click]` markers, so each slide carries what is said while it's on screen. Keep the `[Name]` presenter tags and the `Handoff:` lines.

## Tools

- **A Google Slides connector**, if the host has one: create the presentation, add slides, upload the exported images, write the notes. Read back each slide's thumbnail to check it.
- **No connector**: the image-deck PPTX import above, or build a `.pptx` with whatever PPTX tooling the host has, then import it into Google Slides.

## Verify

- The slide count and order match the Slidev deck, plus one slide per split reveal state.
- Fonts render as themselves, not a fallback.
- Images are sharp at full screen (export with `--scale 2` if they look soft).
- Every reveal state is there, in order.
- Every slide has its notes, and the notes match what's on screen.
- GIFs animate in presentation mode.
- Present it once on the actual machine, offline, before the talk.
