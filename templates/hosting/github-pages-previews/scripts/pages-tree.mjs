#!/usr/bin/env node
// Keeps the assembled Pages site (main at the root, each open PR in pr-<n>/) on the
// gh-pages branch, which is storage only: the workflow publishes the tree with
// actions/deploy-pages. Every change is a single orphan commit, force-pushed, so the
// branch never accumulates old builds. Run it from .github/workflows/pages.yml.
//
//   node scripts/pages-tree.mjs deploy . dist        # main's build at the root, keeping pr-*/
//   node scripts/pages-tree.mjs deploy pr-12 dist    # replace pr-12/ with this build
//   node scripts/pages-tree.mjs remove 12            # drop pr-12/
//
// Env: GITHUB_REPOSITORY and GITHUB_TOKEN (or PAGES_TREE_REMOTE, a git URL, for testing),
// RUNNER_TEMP for the work folder. Writes dir=<tree> to GITHUB_OUTPUT for the upload step.
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const BRANCH = 'gh-pages'
const PREVIEW_DIR = /^pr-\d+$/

function fail(message) {
  console.error(`pages-tree: ${message}`)
  process.exit(1)
}

function usage() {
  fail('usage: pages-tree.mjs deploy <. | pr-<n>> <dist-dir> | remove <pr-number>')
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
}

function remoteUrl() {
  if (process.env.PAGES_TREE_REMOTE) {
    return process.env.PAGES_TREE_REMOTE
  }
  const repo = process.env.GITHUB_REPOSITORY
  const token = process.env.GITHUB_TOKEN
  if (!repo || !token) {
    fail('GITHUB_REPOSITORY and GITHUB_TOKEN must be set (run it from GitHub Actions)')
  }
  const server = new URL(process.env.GITHUB_SERVER_URL ?? 'https://github.com')
  return `${server.protocol}//x-access-token:${token}@${server.host}/${repo}.git`
}

// Exit code 2 from ls-remote --exit-code means "no such branch": a first run starts from
// an empty tree. Anything else (auth, network) is a real failure and stops the job.
function branchExists(remote) {
  const result = spawnSync('git', ['ls-remote', '--exit-code', '--heads', remote, BRANCH], {
    encoding: 'utf8',
  })
  if (result.status === 0) {
    return true
  }
  if (result.status === 2) {
    return false
  }
  fail(`couldn't read the ${BRANCH} branch: ${result.stderr.trim() || `git exited ${result.status}`}`)
}

const [command, target, distArg] = process.argv.slice(2)
let folder
if (command === 'deploy') {
  if (!target || !distArg || (target !== '.' && !PREVIEW_DIR.test(target))) {
    usage()
  }
  folder = target
} else if (command === 'remove') {
  if (!/^\d+$/.test(target ?? '')) {
    usage()
  }
  folder = `pr-${target}`
} else {
  usage()
}

const dist = distArg ? resolve(distArg) : undefined
if (dist && !existsSync(join(dist, 'index.html'))) {
  fail(`${dist} has no index.html; build the deck first`)
}

const remote = remoteUrl()
const tree = join(process.env.RUNNER_TEMP ?? tmpdir(), 'pages-tree')
rmSync(tree, { recursive: true, force: true })

const existed = branchExists(remote)
if (existed) {
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', BRANCH, '--single-branch', remote, tree], {
    stdio: 'inherit',
  })
} else {
  console.log(`No ${BRANCH} branch yet; starting from an empty site.`)
  mkdirSync(tree, { recursive: true })
  git(tree, 'init', '--quiet')
  git(tree, 'remote', 'add', 'origin', remote)
}

if (command === 'deploy' && folder === '.') {
  // main's build replaces everything at the root except the open PRs' previews
  for (const name of readdirSync(tree)) {
    if (name !== '.git' && !PREVIEW_DIR.test(name)) {
      rmSync(join(tree, name), { recursive: true, force: true })
    }
  }
  cpSync(dist, tree, { recursive: true })
} else {
  // A preview is replaced whole, so hashed assets from its previous build don't linger
  rmSync(join(tree, folder), { recursive: true, force: true })
  if (command === 'deploy') {
    cpSync(dist, join(tree, folder), { recursive: true })
  }
}

// One orphan commit: same tree as before means nothing to push
git(tree, 'checkout', '--quiet', '--orphan', 'pages-tree-next')
git(tree, 'add', '--all')
const newTree = git(tree, 'write-tree')
const oldTree = existed ? git(tree, 'rev-parse', `origin/${BRANCH}^{tree}`) : undefined
if (newTree === oldTree) {
  console.log(`${BRANCH} already has this tree; nothing to push.`)
} else {
  const label = command === 'remove' ? `Remove ${folder}` : `Deploy ${folder === '.' ? 'main' : folder}`
  const sha = process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'
  git(
    tree,
    '-c',
    'user.name=github-actions[bot]',
    '-c',
    'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    'commit',
    '--quiet',
    '--message',
    `${label} (${sha})`,
  )
  git(tree, 'push', '--quiet', '--force', 'origin', `HEAD:refs/heads/${BRANCH}`)
  console.log(`${label}: pushed ${BRANCH} as a single commit.`)
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `dir=${tree}\n`)
}
console.log(`Site tree: ${tree}`)
