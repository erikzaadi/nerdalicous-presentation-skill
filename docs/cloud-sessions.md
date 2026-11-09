# Claude Code cloud sessions

A deck works in a [Claude Code cloud session](https://code.claude.com/docs/en/claude-code-on-the-web) (claude.ai/code, `claude --cloud`), but the default cloud environment is missing a few things the scripts need: Node 24, `ffmpeg`, network access to most of the APIs, and your keys. This page lists what works out of the box and how to set up an environment for the rest. Environment settings are described in [Configure cloud environments](https://code.claude.com/docs/en/cloud-environments).

## What works where

"Default" means the **Default** environment with **Trusted** network access and nothing added.

| Command | Default cloud environment | Needs |
|---|---|---|
| `npm run dev`, `npm run build` | Only with Node 24 | [Node 24](#node-24) |
| `npm run export`, `npx slidev export` | With the preinstalled Chromium | [`SLIDEV_CHROMIUM_PATH`](#chromium) |
| `npm run notes:pdf` | No | Launches `playwright-chromium`'s own Chromium revision, which isn't installed, and `npx playwright install` can't download it (the Playwright CDN isn't on the Trusted list) |
| `npm run notes:audio`, `notes:verify` | No | [`OPENAI_API_KEY`](#keys), [`api.openai.com`](#network-access) |
| `npm run notes:video` | No | `ffmpeg` and the rehearsal audio; it also runs its own `slidev export` without `--executable-path`, so it can't use the preinstalled Chromium yet |
| `npm run images` (OpenAI) | No | [`OPENAI_API_KEY`](#keys), [`api.openai.com`](#network-access) |
| `npm run images` (Gemini) | Only with the key | [`GEMINI_API_KEY`](#keys); `generativelanguage.googleapis.com` is already on the Trusted list |
| `npm run gifs:search`, `npm run gifs` | No | [`GIPHY_API_KEY`](#keys) for search, [`api.giphy.com` and `media.giphy.com`](#network-access) |
| `npm run memes` | No | [`api.memegen.link`](#network-access) (no key) |
| `--list`, `--print`, `--dry-run` modes | Yes | Nothing |

`new-deck.sh` also downloads the fin GIF from `media.giphy.com`. Without that host it warns and carries on; fetch `public/images/fin.gif` later.

## Set up an environment for decks

Open the environment for editing at [claude.ai/code](https://claude.ai/code), or make a separate one for decks so other repos keep the default.

### Node 24

Cloud sessions ship Node 20, 21 and 22 under `/opt/node<version>`, with 22 on `PATH`. Add Node 24 the same way in the environment's **Setup script**:

```bash
#!/bin/bash
N_PREFIX=/opt/node24 npx -y n 24
apt update && apt install -y ffmpeg || true   # only for notes:video
```

The setup script runs once and is cached for later sessions. In a session, put `/opt/node24/bin` first on `PATH` before running npm commands (ask Claude to).

### Chromium

The session ships a Chromium at `/opt/pw-browsers/chromium`, but not the exact revision `playwright-chromium` expects. Add this to the environment's **Environment variables** so `npm run export` uses it:

```text
SLIDEV_CHROMIUM_PATH=/opt/pw-browsers/chromium
```

For a direct `npx slidev export`, pass `--executable-path /opt/pw-browsers/chromium`.

### Network access

Set **Network access** to **Custom**, check **Also include default list of common package managers** (npm and Node downloads need it), and add the hosts for the scripts you use:

```text
api.openai.com
api.giphy.com
media.giphy.com
api.memegen.link
```

### Keys

Add the keys you use to the environment's **Environment variables**, in the same `KEY=value` format as the deck's `.env` ([docs/api-keys.md](api-keys.md) lists them):

```text
OPENAI_API_KEY=sk-...
GIPHY_API_KEY=...
```

The scripts read exported variables the same way as `.env`, so nothing else changes. Anyone who uses the environment can read these values, so keep a deck environment personal rather than organization-shared.

Cloud environments also have **Network secrets**, which keep a key out of the session entirely. The scripts don't support them yet: they stop when the key's variable isn't set.
