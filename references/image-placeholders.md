# Image placeholders, generated images, and photo slides

Read this when a slide needs a visual that doesn't exist yet, when generating slide images, or when turning a finished image into a slide.

## While drafting: an image prompt, never a sentence

A missing visual becomes `<ImageTBD prompt="..." />` (`references/kit/components/ImageTBD.vue`, already in a deck made from the templates). It is a dashed box showing the image-generation prompt. A prompt in a box beats a sentence that duplicates the voice track. Add `name="robot-strike"` (kebab-case, no folders or extension) to fix the generated file's name; otherwise the script slugs the prompt, or falls back to `image-N` for a prompt with no Latin letters. Write `prompt` as a literal attribute: the script doesn't evaluate `:prompt` bindings, and it ignores placeholders inside code blocks and comments.

Write prompts that generate well:

- **One literal visual joke per image**: robots on a picket line for "don't let your workers unionize".
- **Short on-image text**: a few words at most, because generators garble long text.
- **Composition**: say what sits in the foreground and which area stays empty (for a title on the cover, for the field note on a photo slide).
- **Style**: name the deck's existing image style, so the images read as one set.

## Generating the images (opt-in)

Offer generation once the storytelling flow is agreed, and run it only when Erik says yes. Before that, prompts stay prompts. It needs `OPENAI_API_KEY` in the deck's `.env`.

1. `npm run images:list` numbers the placeholders, with their file names and slides, and marks the ones that already exist.
2. `npm run images:dry-run` shows the request per missing image: models, inputs, and the exact brief. It writes nothing and needs no key.
3. `npm run images` generates every missing image into `public/images/`. Existing files are skipped, so it's safe to rerun; `-- --force` regenerates them, and `-- --only 2,5` picks specific placeholders (also with `images:dry-run`).
4. The script ends with a summary of what it generated and the slides they belong to. Look at each image, then swap each slide's `ImageTBD` for a photo slide (below).

What the script (`scripts/generate-slide-images.mjs`) does:

- **The deck is the context**, the way Erik uploads `slides.md` to ChatGPT. The whole deck, plus the slide's own markdown and notes, goes to the Responses API (`gpt-5.5` driving the `image_generation` tool on `gpt-image-2.5-flare`), so each image knows the talk's story, tone and recurring characters. `--no-context` sends only the slide. Override the models with `OPENAI_IMAGE_CONTEXT_MODEL` and `OPENAI_IMAGE_MODEL` in `.env` (or `--model` / `--image-model`).
- **Style consistency**: `--style-ref public/images/a.png,public/images/b.png` attaches earlier images as references. `--style "flat 3D cartoon, warm light"` (or `OPENAI_IMAGE_STYLE` in `.env`, to set it once per deck) names a style in words.
- **Full-bleed and high resolution**: 16:9 at `2560x1440` (the largest non-experimental size) and `--quality high`. The brief asks for edge-to-edge composition with no frames, captions, titles or real logos, and a calm bottom-left corner for the field note. `--size` takes any `WIDTHxHEIGHT` with both edges divisible by 16.

Look at every generated image before using it: check the on-image text spelling, and that the field-note corner is clear. Regenerate with `--force`, or tighten the prompt.

## Using the image

Images Erik makes by hand (for example in ChatGPT) get kebab-case names first, since spaces and commas in file names break builds.

**Full-bleed photo slide**: the default for generated images, and Erik's preferred end state. It replaces the slide's `ImageTBD` and its title:

```md
---
layout: image
image: /images/robot-strike.png
class: photo-slide
title: Don't let your workers unionize
---

<FieldNote class="photo-note">agent = requester ∩ task</FieldNote>
```

- The image must live in `public/images/`, because the `image:` frontmatter path is not bundled from `./images/`.
- **No title, and no text overlay beyond at most one field note.** The title moves into the notes as the first spoken line (a plain beat, not a second `Punchline:`), and into the `title:` key for navigation and the notes PDF.
- `references/kit/styles/photo-slide.css` (imported by the template `style.css`) does the styling. It adds layout padding (the built-in image layout has none) and turns a `FieldNote` (`references/kit/components/FieldNote.vue`) with `class="photo-note"` into a solid card pinned bottom left. Add `photo-right` or `photo-center` to move it, sized `width: max-content` so it covers as little of the image as possible.

**Inline image**: only when the slide also needs other content.

```html
<img src="./images/x.png" class="h-[19rem] mx-auto rounded-xl shadow-lg" />
```

**Cover image**: an absolutely positioned `<img class="cover-bg">` plus a gradient shade on the title side for contrast. Ask for empty sky or wall on that side in the prompt, so the title has room.
