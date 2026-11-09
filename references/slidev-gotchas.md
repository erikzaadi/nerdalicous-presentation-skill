# Slidev gotchas

Read this when building or debugging a Slidev deck: click reveals, custom Vue components, images, dark mode, or hosting and presenting a build.

## Clicks

- **`v-click="false"` means "always shown, outside the click sequence".** `undefined` and `0` both count as click 1. For step-0 elements in a computed reveal, write `v-click="step || false"`.
- **`v-click` targets must exist at mount.** An element created later (a wire rendered only once measured) logs "ClicksContext: Unexpected register after mounted" and breaks the slide's click count. Render every wire from the first frame with an empty `d`, and fill the path once measured (`references/kit/examples/GreenCheckGap.vue` shows the pattern). If a diagram's click count is off, check this first.
- **Note click markers are `[click]` and `[click:N]` only.** Any other form, such as `[CLICK, CLICK]`, shows as plain text with no highlight.

## Mermaid

- **Mermaid inside columns or grids renders small**, because it scales to its container. Use `` ```mermaid {scale: 1.5} `` and check the export; a draft diagram still has to be readable from the back row.

## Components

- **Refs inside `v-for` are unordered.** When order matters, use an index-keyed function ref: `:ref="el => els[i] = el"`.
- **SVG colours from CSS variables go in `style`** (`:style="{ stroke: 'var(--x)' }"`), not in presentation attributes such as `stroke="var(--x)"`.
- **Stacking**: a later sibling paints over an earlier one where they overlap (rails drawn over wheels). Give the front layer `position: relative; z-index: 1`.

## Images and styles

- **Absolute image paths in slide markdown are imports.** `<img src="/x.png">` builds only if the file is in the project's `public/`. A theme's `public/` isn't reachable that way, so point at the theme's file with a relative path.
- **Runtime asset paths ignore `--base`.** Slidev rewrites image paths in markdown, but not an absolute `/images/...` path in a Vue binding (`:src`), a `new Image()`, or a CSS background set from a component. Those 404 once the deck is served under a sub-path (`--base /my-talk/`, a PR preview at `/pr-N/`), while working fine in `npm run dev`. Wrap them in `assetUrl()` from the kit's `utils/assetUrl.ts`, which prefixes `import.meta.env.BASE_URL`.
- **Preflight caps images at their container.** UnoCSS's preflight sets `img { max-width: 100% }`, which silently breaks a component that sizes or zooms an image itself. Set `max-width: none` on those images (`ScreenFocus.vue` does).
- **A slide's `<style>` block isn't scoped to that slide on every export path.** It leaked into `export-notes`. Scope slide-specific rules (such as the cover's) under a slide class.
- **Soft, wide drop shadows** on near-black backgrounds read as a second ring around the element. Use a hairline ring instead (as `TerminalWindow.vue` does), or the light card shadow from `SKILL.md`. To override a component's shadow from outside, use an unscoped `<style>` block, since `:global()` inside a scoped block didn't apply.

## Hosting and presenting

Picking a host, the GitHub Pages workflow and `--base` are in `references/hosting.md`.

- **The static build ships your speaker notes.** Anyone can open `/#/presenter/1` on a hosted deck. Build with `--without-notes` to leave them out.
- **Headmatter for static hosting**:
  - `routerMode: hash` (or `slidev build --router-mode hash`). Presenter view still works at `/#/presenter/N`.
  - `favicon: /favicon.svg`, with the file in `public/`.
  - `exportFilename:` names exported PDFs.
- **Clicker support is the `logi-spotlight` addon** (`slidev-addon-logi-spotlight`, in the template's `package.json` and `addons:` headmatter): the Logitech Spotlight 2's start button toggles fullscreen, and its timer vibrates. Don't hand-roll a `keydown` listener for it. The button sends one `Enter` keydown with `metaKey: true` and no Cmd keydown, which Slidev's `'meta+enter'` shortcut format never matches, and Logi Options+ only vibrates when the window title ends with ` - Google Slides`; the addon handles both. Its Cmd+Enter toggle is a fallback until [slidevjs/slidev#2809](https://github.com/slidevjs/slidev/pull/2809) ships Cmd+Enter as a built-in fullscreen shortcut; it skips the toggle when Slidev already handled the key, so keep the addon either way (it also does the title). A deck whose `setup/shortcuts.ts` has the earlier hand-rolled listeners should drop them when it adds the addon. `PRO-TIPS.md` has the rehearsal check.
- **Presenter and audience windows of a static build sync only within one browser** (`BroadcastChannel`). Cross-device control needs `slidev --remote[=password]`. "Screen Mirror" in presenter view captures a local screen or window into the presenter pane, and transmits nothing between machines.

## Build environment

- **Node 24 or newer** (the deck's `.nvmrc` and `engines`). A plain `npm install` under an old Node 20 shell left Slidev's native bindings (rolldown, oxc) missing. `npm ci` with a current `node` first on `PATH` (check `which node` when a version manager or Homebrew is involved) fixed it.
- **`ERR_PACKAGE_PATH_NOT_EXPORTED ... markdown-it ... lib/token.mjs`** on `slidev build` or `dev`: `@comark/markdown-it` needs `markdown-it@14` as a peer, while `@shikijs/markdown-it@4.5.0` pulled in 15 (October 2026, Slidev 52.20 and 53.0). The template's `overrides` pin the shiki markdown-it packages to `4.4.3`. Drop the overrides once a Slidev release resolves it, and check with `npm ls markdown-it` (no `invalid`).
- **`npm warn install-scripts`** on install: newer npm versions skip install scripts that aren't approved, including `playwright-chromium`'s browser download, so `notes:pdf` can't find Chromium. Run `npx playwright install chromium` (`new-deck.sh` does).
- **`Executable doesn't exist at .../chromium_headless_shell-XXXX/...`** on `slidev export`: Playwright looks for the exact Chromium revision its `playwright-chromium` version expects, and that revision isn't installed. Before running `npx playwright install`, check for a preinstalled Chromium at `/opt/pw-browsers/chromium` (Claude Code cloud sessions ship one). If it exists, rerun with `SLIDEV_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run export`; the template's `export` script adds `--executable-path` only when that variable is set. For a direct `npx slidev export` call, pass `--executable-path /opt/pw-browsers/chromium` instead. Neither Slidev nor Playwright reads an environment variable for the browser path on its own. `docs/cloud-sessions.md` covers the rest of a cloud setup.
- **`The theme "@slidev/theme-default" was not found`** in a non-interactive build: the theme is a normal dependency (the template lists it), since Slidev can only offer to install it in a terminal.
