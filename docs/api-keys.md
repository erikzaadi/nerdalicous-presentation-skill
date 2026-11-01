# API keys and providers

The scripts that call paid or keyed APIs read their keys from a gitignored `.env` in the deck root, next to `slides.md` (an exported variable works too). Start from the template:

```sh
cp .env.example .env   # then paste the keys you have
```

You only need the keys for what you use. The free modes (`--list`, `--print`, `--dry-run`) need none.

| Key | Used by | Needed for |
|---|---|---|
| `OPENAI_API_KEY` | `npm run images` (default provider), `npm run notes:audio`, `npm run notes:verify` | Slide images through OpenAI, rehearsal audio |
| `GEMINI_API_KEY` | `npm run images` with `IMAGE_PROVIDER=gemini` | Slide images through Gemini |
| `GIPHY_API_KEY` | `npm run gifs:search` | GIF candidates (downloading a picked GIF needs no key) |

Memes need no key: [memegen.link](https://memegen.link) is free.

`.env.example` lists every optional override, commented out with its default.

## Slide images: OpenAI or Gemini

`npm run images` works with either provider. Pick one per deck in `.env`, or per run:

```sh
IMAGE_PROVIDER=gemini                     # in .env
npm run images -- --provider gemini       # or just this run
```

| | OpenAI (default) | Gemini |
|---|---|---|
| Models | `gpt-5.5` reads the deck and drives `gpt-image-2.5-flare` | `gemini-3-pro-image` ("Nano Banana Pro") reads the deck and draws |
| Override | `OPENAI_IMAGE_CONTEXT_MODEL`, `OPENAI_IMAGE_MODEL` | `GEMINI_IMAGE_MODEL` |
| Size | `--size 2560x1440`, exact pixels | `--size` becomes an aspect ratio (`16:9`) plus a size tier (`1K`, `2K` or `4K`); 2560x1440 gives 2752x1536. `--image-size 4K` forces a tier. |
| File type | PNG (`--format jpg` or `webp` also work) | Always JPEG, saved as `.jpg` (the API has no format option) |
| Style refs (`--style-ref`) | Borrows the look loosely | Stays very close to the reference, often copying its composition. Use refs that only share the look you want. |

Both send the whole deck as context, along with the same brief and style references, so switching providers keeps the story and characters. An image counts as done whatever its extension, so switching providers won't regenerate slides that already have one; `--force` does.

`IMAGE_STYLE` sets a deck-wide style for either provider (`OPENAI_IMAGE_STYLE` still works).

## OpenAI

1. Create a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). The account needs billing set up.
2. Add it to `.env`: `OPENAI_API_KEY=sk-...`

The default model names were current in October 2026. OpenAI retires models regularly, so check their [deprecations page](https://platform.openai.com/docs/deprecations) before a new deck and point `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_CONTEXT_MODEL`, `OPENAI_TTS_MODEL` and `OPENAI_TRANSCRIBE_MODEL` in `.env` at the replacements. `OPENAI_TTS_MODEL` covers the Chat Completions audio models and the classic speech endpoint; a Realtime-only model would need script changes (details in `references/speaker-notes.md`).

## Gemini

A Gemini subscription (the Gemini app, or Gemini in Google Workspace) doesn't include API access, and the Gemini CLI can't serve these scripts. You need an API key from Google AI Studio:

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and click **Create API key**. It belongs to a Google Cloud project; AI Studio can create one for you.
2. **Enable billing on that project** (**Set up billing** next to the key in AI Studio). Image models have no free-tier quota, so without billing every request fails with `429 ... limit: 0`. The script recognizes that error and says so.
3. Add it to `.env`: `GEMINI_API_KEY=...`

Work accounts: Workspace admins often turn AI Studio off. If you see "not available for your account", use a personal Google account, or ask IT for access.

To see which image models your key can use (names change; the default was current in November 2026):

```sh
curl -s -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000" | grep -o '"models/[^"]*image[^"]*"'
```

## Giphy

Only `gifs:search` needs a key, and it's free:

1. Sign in (or sign up) at the [Giphy developer dashboard](https://developers.giphy.com/dashboard/).
2. Click **Create an App**, choose **API** (not SDK), and give it a name and a one-line description, like "Slide GIF picker".
3. Add it to `.env`: `GIPHY_API_KEY=...`

New keys are rate-limited, which is plenty for a deck. `gifs:search` stops before doing anything when the key is missing, and says so when Giphy rejects it or the rate limit runs out. `GIPHY_RATING` in `.env` sets the content rating (default `pg-13`). Giphy's API terms ask for attribution, so the contact sheet carries a "Powered by GIPHY" line.
