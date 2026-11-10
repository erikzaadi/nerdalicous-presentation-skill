# Hosting a deck

Read this when publishing a deck: picking a host, adding the GitHub Pages workflow, or debugging a build that 404s once deployed.

A deck is a static site: `npm run build` writes it to `dist/`, and any static host can serve that folder. Nothing here is the default. `new-deck.sh` makes a deck with no CI, and you opt into hosting per deck.

Slidev's own [hosting guide](https://sli.dev/guide/hosting) covers the build flags and the common hosts. This file covers what the skill adds: a ready-made GitHub Pages workflow, and the gotchas that bit us.

## Pick one

| Option | Setup | Good for |
|---|---|---|
| [GitHub Pages](#github-pages) | Copy one workflow, flip one setting | Most public talks. Try this first. |
| [GitHub Pages with PR previews](#github-pages-with-pr-previews) | A workflow and a script, two settings | Decks you iterate on through PRs, co-presenters reviewing a change |
| [Netlify, Vercel, Cloudflare Pages, others](#netlify-vercel-cloudflare-pages-and-others) | Connect the repo in their UI | When you already use one of them. Previews per PR come built in. |
| [S3 + CloudFront](#s3--cloudfront) | Your own bucket and distribution, plus the skill's deploy script | Many decks under one custom domain, when you already run AWS |

## Before you publish

- **Speaker notes ship with the build.** The static build includes the presenter view, so anyone who opens `/#/presenter/1` can read your notes. To publish without them, build with `slidev build --without-notes`.
- **Hash routing makes a plain static host work.** The starter headmatter has `routerMode: hash`, so deep links and `/#/presenter` work without server-side fallback rules. Keep it.
- **A sub-path needs `--base`, with a leading and trailing slash.** A deck served at `https://example.com/my-talk/` builds with `--base /my-talk/`, or every asset 404s.
- **Download every GIF and image into the deck** (`npm run gifs`, `npm run images`). A hosted deck that hotlinks Giphy breaks the day Giphy does.

## GitHub Pages

The workflow builds the deck on every push to `main` (or by hand from the Actions tab) and publishes it with GitHub's own Pages actions. No secrets, no extra branches.

**New deck:**

```sh
./new-deck.sh my-talk --host github-pages
```

**Existing deck:** copy `templates/hosting/github-pages/.github/workflows/pages.yml` from the skill into the deck's `.github/workflows/`. If the deck already has a `pages.yml`, look at it before overwriting.

**One-time setup**, in the deck's GitHub repo:

1. Settings → Pages → Source: **GitHub Actions**. Do this before the first run, or the `configure-pages` step fails.
2. Commit `package-lock.json`. The workflow runs `npm ci`, which fails without it. The starter `.gitignore` keeps it.
3. Push to `main`. The deck appears at the URL shown under Settings → Pages, and on the workflow run.

**Where the deck lands.** `actions/configure-pages` reports the site's base path, and the workflow builds with it, so the same file works for every kind of Pages site:

| Repo | Deck URL | Built with |
|---|---|---|
| `<user>/my-talk` | `https://<user>.github.io/my-talk/` | `--base /my-talk/` |
| `<user>/<user>.github.io` | `https://<user>.github.io/` | `--base /` |
| Any repo with a custom domain | `https://slides.example.com/` | `--base /` |

**Things to know:**

- **Pages on a private repo isn't necessarily private.** Access-controlled Pages needs GitHub Enterprise Cloud. Otherwise the site is public, even when the repo isn't. With Enterprise Cloud, the site is served at a random `https://<random>.pages.github.io/` host, and an unauthenticated `curl` gets a `302` to the GitHub sign-in page. Check the deck in a signed-in browser, not with `curl`.
- **Leaving out the notes:** add `--without-notes` to the build line in `pages.yml` (there's a comment next to it).
- **A deck in a subfolder** of a bigger repo: set `defaults.run.working-directory` on the job, and point `cache-dependency-path`, `node-version-file` and the upload `path` at that folder.

## GitHub Pages with PR previews

An advanced take on the workflow above: `main` stays at the site root, and every open PR gets its own copy of the deck at `pr-<n>/`, linked from a comment on the PR. Pushing to the PR updates it; closing the PR removes it.

Not offered by `new-deck.sh --host` yet, until it has run on a real repo. Copy it by hand from the skill:

- `templates/hosting/github-pages-previews/.github/workflows/pages.yml` → the deck's `.github/workflows/pages.yml` (it replaces the simple workflow; don't run both)
- `templates/hosting/github-pages-previews/scripts/pages-tree.mjs` → the deck's `scripts/`

**One-time setup**, in the deck's GitHub repo:

1. Settings → Pages → Source: **GitHub Actions**. Or: `gh api -X PUT repos/<owner>/<repo>/pages -f build_type=workflow`
2. Settings → Environments → `github-pages` → Deployment branches and tags: **No restriction**. Or: `echo '{"deployment_branch_policy":null}' | gh api -X PUT repos/<owner>/<repo>/environments/github-pages --input -`

   Pages creates this environment limited to the default branch, which rejects the preview deploys. Don't narrow it to a list of branches either: PR runs deploy from `refs/pull/<n>/merge`, not from the PR's branch, so a list of `main` and `gh-pages` still fails the PR's `publish` job with:

   ```
   Branch "refs/pull/<n>/merge" is not allowed to deploy to github-pages due to environment protection rules.
   ```
3. Commit `package-lock.json`, as for the simple workflow.

**Moving from a `gh-pages` branch source.** If the deck already keeps previews on `gh-pages` with Pages set to **Deploy from a branch**, every push to `gh-pages` starts GitHub's own `pages-build-deployment` run. Two pushes seconds apart (say `main` and a PR) overlap: GitHub cancels one build and the other fails with:

```
Deployment request failed for <sha> due to in progress deployment. Please cancel <other sha> first or wait for it to complete.
```

A later build republishes the branch, so the site recovers, but CI shows red. `concurrency` in your own workflow can't fix it: you can't add it to `pages-build-deployment`, and that run starts after your push has finished. The fix is this workflow's model: keep `gh-pages` as storage, switch the source to **GitHub Actions**, and publish with `actions/upload-pages-artifact` + `actions/deploy-pages` from one concurrency group. Do both setup steps above. If you flip the source before the new workflow is merged, nothing gets published in between: pushes to `gh-pages` no longer publish anything.

**How it works.** A Pages deployment publishes one folder, so the workflow keeps the whole site, `main` plus every open preview, on a `gh-pages` branch and publishes that:

1. `build` builds `main` with `--base <base>`, or a PR with `--base <base>pr-<n>/`. A newer push to the same PR cancels it.
2. `publish` puts the build into the `gh-pages` tree (`scripts/pages-tree.mjs`), force-pushes it as a single commit, and publishes the tree with `actions/deploy-pages`. For a PR, it adds or updates one comment with the links (marked `<!-- deck-preview -->`). On close, it removes `pr-<n>/` and says so in the comment.
3. Every publish runs one at a time, in arrival order, with none dropped (`concurrency` with `queue: max`). Before acting, it checks the run still matches reality: a build whose PR or `main` has moved on is skipped, a build for a PR that closed meanwhile is skipped, and a close for a PR that was reopened keeps the preview.

**Things to know:**

- **The trigger is `pull_request`, never `pull_request_target`.** `pull_request_target` runs with a write token, so building a PR's code with it hands that code write access to your site. Fork PRs get no preview; the workflow skips them rather than failing.
- **The publish job runs `pages-tree.mjs` from the default branch**, never from the PR, since that job can write to the repo.
- **`gh-pages` is rewritten on every publish.** It always holds one commit, so it doesn't grow with each build. That breaks if the branch is protected or your org blocks force pushes: exempt it, or use the simple workflow. There's no history to roll back to; roll back by reverting on `main`.
- **Keep `cancel-in-progress: false` and `queue: max` on `publish`.** Without them, overlapping pushes, previews and closes can drop each other.
- **Relaxing the environment rule** means anyone who can push a branch to the repo can publish a preview to your site. For a repo only you push to, that's fine.
- **Every publish uploads the whole site.** Many open, image-heavy previews add up, and a Pages site is capped at 1 GB. Close stale PRs.
- **Leaving out the notes:** add `--without-notes` to the build line, as in the simple workflow.

## Netlify, Vercel, Cloudflare Pages and others

The Slidev guide has a section for each of Netlify, Vercel, Zephyr Cloud and Docker. Cloudflare Pages isn't in it, but it works the same way; see [Cloudflare's Pages docs](https://developers.cloudflare.com/pages/).

For all of them:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 24 (from the deck's `.nvmrc`; set it explicitly if the host doesn't read that file)
- No SPA redirect rules needed, thanks to hash routing.

They build a preview for every PR without extra setup, which is the main reason to pick one over GitHub Pages.

## S3 + CloudFront

This is what serves my own talks, at `slides.erikzaadi.com/<deck>/`. For a single talk it's overkill. It earns its keep when you host many decks under one domain, want your own caching rules, or already run AWS.

The skill ships the deploy script, not the infrastructure. You set up:

- A private S3 bucket, with CloudFront in front reading it through Origin Access Control. Each deck lives under its own prefix.
- A CloudFront Function that rewrites requests ending in `/` to `.../index.html`. CloudFront doesn't serve `index.html` for `/<deck>/` from a private bucket on its own.

Terraform or the console both work.

**New deck:**

```sh
./new-deck.sh my-talk --host s3-cloudfront
```

**Existing deck:** copy `templates/hosting/s3-cloudfront/scripts/deploy-s3.sh` from the skill into the deck's `scripts/`.

**Deploying:**

```sh
export DECK_BUCKET=slides.example.com
export DECK_DISTRIBUTION_ID=E123EXAMPLE
export DECK_BASE_URL=https://slides.example.com   # optional, to print the deck's URL

./scripts/deploy-s3.sh                       # build, sync to s3://$DECK_BUCKET/<slug>/, invalidate /<slug>/*
./scripts/deploy-s3.sh -- --without-notes    # anything after -- goes to slidev build
./scripts/deploy-s3.sh speaker-notes.pdf     # upload one file next to the deck (notes PDF, rehearsal video)
```

- **The slug** (S3 prefix and URL path) is the deck folder's name in lowercase. Set `DECK_SLUG` to keep the URL stable when you rename the folder. It must be lowercase letters, digits and dashes.
- It builds with the deck's own Slidev and `--base /<slug>/`, and works from any directory: the deck is the folder the script sits in.
- Credentials come from the AWS CLI's usual sources (`AWS_PROFILE`, environment variables, SSO).
- **No `--delete` on the sync**, on purpose: it would also remove files uploaded next to the deck with the single-file mode. Assets dropped from the deck stay in the bucket until you remove them.
- **From CI**, authenticate with GitHub's OIDC provider (`aws-actions/configure-aws-credentials` with a role that can write to the bucket and create invalidations), never long-lived access keys. Then run the script with the same environment variables.
