# Image placeholders: generated images, GIFs, memes, and photo slides

Read this when a slide needs a visual that doesn't exist yet, when generating slide images, finding GIFs or making memes, or when turning a finished visual into a slide.

## While drafting: pick the kind of visual

A missing visual is one of three kinds. Pick by where the joke comes from (the rules in SKILL.md's "The GIF Language" apply to all three):

| Kind | Use it when | Placeholder |
|---|---|---|
| **GIF** | A well-known film, TV or internet moment *is* the joke ("we need to go deeper") | `<ImageTBD kind="gif" prompt="we need to go deeper" source="Inception" name="go-deeper" />` |
| **Meme** | A familiar meme template, captioned for this talk, is the joke | `<ImageTBD kind="meme" template="yodawg" top="Yo dawg, I heard you like managers" bottom="so we put a manager in your manager" />` |
| **Generated image** | The visual is specific to this talk (its recurring characters, a literal picture of its idea), so nothing off the shelf exists | `<ImageTBD prompt="robots on a picket line" name="robot-strike" />` |

Offer the GIF or meme when one fits, rather than defaulting to an image prompt. Every kind takes `name="..."` and lands in `public/images/`, so names are unique across kinds.

## Generated images: an image prompt, never a sentence

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

## GIFs: the script finds candidates, Erik picks

`<ImageTBD kind="gif" prompt="..." source="..." />`: `prompt` is the search query (the quote or the moment), `source` the film, show or meme it's from, added to the search. Write the moment you mean, since the top search hit is often a near miss: the wrong scene, a reupload, or a reaction version with text burned in. The script never picks a GIF; picking takes taste. The placeholder box shows a giphy.com search link until a GIF is picked.

1. `npm run gifs:list` numbers the GIF placeholders, with their picks and giphy.com search links. It needs no key.
2. `npm run gifs:search` asks the Giphy API for candidates (`-- --limit 12`, `-- --only 2`) and writes `gif-picks.html` in the deck root (gitignored): a contact sheet grouped by slide, with each GIF's id, size and dimensions. Erik clicks one GIF per slide and pastes the prompt the sheet builds. It needs `GIPHY_API_KEY` in `.env` and fails before reading the deck without it; without a key, Erik browses the giphy.com links instead. `GIPHY_RATING` (default `pg-13`) sets the content rating.
3. Add each pick to its placeholder as `pick="<id>"`. A giphy.com page URL or a media URL works too.
4. `npm run gifs` downloads every picked GIF into `public/images/<name>.gif` (no key needed; `-- --force` downloads again). Then swap the placeholder for a GIF slide (below).

Offer `gifs:search` once the storytelling flow is agreed, like image generation. Watch the size the sheet shows: a 15 MB GIF bloats the build, so prefer a smaller candidate of the same moment.

## Memes: made with memegen.link

`<ImageTBD kind="meme" template="drake" top="..." bottom="..." />`: `template` is a [memegen.link](https://api.memegen.link/templates) template id. `lines="a|b|c"` replaces `top`/`bottom` for templates with more lines (Galaxy Brain, `gb`, has four). memegen.link is free and needs no account or key.

1. `npm run memes -- --templates brain` finds template ids, with each one's line count and an example URL. Use it, rather than guessing an id.
2. `npm run memes:list` numbers the meme placeholders, each with the URL of its finished meme, to preview in a browser.
3. `npm run memes` downloads every missing meme into `public/images/<name>.png` (`-- --only 2`, `-- --force`, `-- --format jpg`, `-- --width 1600`). An unknown template id fails with a pointer to `--templates`.

Look at each meme: the caption must stay short enough to read from the back of the room, and the joke must survive being read aloud.

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

**GIF or meme slide**: the same photo slide, with `backgroundSize: contain`, because GIFs and memes are rarely 16:9 and a cropped meme loses its text. The slide's dark background letterboxes it. A GIF that fills the frame well can keep the default `cover`.

```md
---
layout: image
image: /images/go-deeper.gif
backgroundSize: contain
class: photo-slide
title: We need to go deeper
---
```

The same rules apply: no title on screen, at most one field note, and the title moves into the notes.

**Inline image**: only when the slide also needs other content.

```html
<img src="./images/x.png" class="h-[19rem] mx-auto rounded-xl shadow-lg" />
```

**Cover image**: an absolutely positioned `<img class="cover-bg">` plus a gradient shade on the title side for contrast. Ask for empty sky or wall on that side in the prompt, so the title has room.
