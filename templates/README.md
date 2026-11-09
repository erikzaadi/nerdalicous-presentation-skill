# __DECK_NAME__

> PUN-TBD: a pun on the deck name, written by the agent when the deck is created.

```
     .-----------------------------.
     |  ~ slides.md ~              |
     |                             |
     |    * hook                   |
     |    * honest diff            |
     |    * fin.gif                |
     '-----------------------------'
                  ||           \o/
                  ||            |
              ____||____       / \
```

A [Slidev](https://sli.dev) deck.

## Run it

| Command | What it does |
|---|---|
| `npm run dev` | Dev server; presenter mode at `/presenter`. |
| `npm run build` | Static build into `dist/`. |
| `npm run export` | PDF export. |

## Exporting without Playwright's Chromium

`npm run export` uses the Chromium revision that `playwright-chromium` expects. Where that revision isn't installed but another Chromium is (Claude Code cloud sessions ship one at `/opt/pw-browsers/chromium`), point the export at it:

```sh
SLIDEV_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run export
```

The script adds `--executable-path` only when `SLIDEV_CHROMIUM_PATH` is set, so a local export works as before. It uses POSIX shell syntax, so it doesn't work in Windows `cmd`.
