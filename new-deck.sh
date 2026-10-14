#!/usr/bin/env bash
# Creates a new Slidev deck from this skill's templates, scripts and kit.
#
#   ./new-deck.sh my-talk               # creates ./my-talk and runs npm install
#   ./new-deck.sh my-talk --no-install  # copy only
set -euo pipefail

usage() {
  echo "Usage: $0 <deck-dir> [--no-install]" >&2
  exit 1
}

[[ $# -ge 1 && $1 != -* ]] || usage
deck=$1
install=true
case ${2:-} in
  "") ;;
  --no-install) install=false ;;
  *) usage ;;
esac

skill_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

if [[ -e $deck && -n $(ls -A "$deck") ]]; then
  echo "$deck already exists and isn't empty; pick a new folder." >&2
  exit 1
fi

mkdir -p "$deck"
cd "$deck"

cp -r "$skill_dir/scripts" .
cp -r "$skill_dir/references/kit/components" "$skill_dir/references/kit/utils" "$skill_dir/references/kit/styles" .
cp "$skill_dir/templates/package.json" "$skill_dir/templates/slides.md" "$skill_dir/templates/style.css" .
cp "$skill_dir/templates/gitignore" .gitignore
cp "$skill_dir/templates/env.example" .env.example
cp "$skill_dir/templates/nvmrc" .nvmrc

# The closing GIF ships with the deck, since venue Wi-Fi is unreliable
mkdir -p public/images
if ! curl -sfL -o public/images/fin.gif https://media.giphy.com/media/11RgbBSgomKx6o/giphy.gif; then
  echo "Couldn't download the fin GIF; fetch it into public/images/fin.gif before the talk." >&2
fi

echo "Created $(pwd)"

node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
switched=""

if $install; then
  # an older default Node: switch to the deck's .nvmrc with fnm or nvm, when either is installed
  if (( $(node_major) < 24 )); then
    if command -v fnm >/dev/null; then
      eval "$(fnm env)"
      fnm use --install-if-missing >/dev/null && switched="fnm use"
    elif [[ -s ${NVM_DIR:-$HOME/.nvm}/nvm.sh ]]; then
      set +u
      source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
      nvm install >/dev/null && switched="nvm use"
      set -u
    fi
  fi
  if (( $(node_major) < 24 )); then
    echo "Slidev here needs Node 24 or newer (found $(node_major)). Switch with your version manager in $deck, then run 'npm install && npx playwright install chromium'." >&2
    exit 1
  fi
  npm install
  # newer npm skips playwright-chromium's install script, which downloads the browser
  # the notes PDF renders with, so fetch it explicitly (a no-op when it's cached)
  npx --no-install playwright install chromium
fi

if [[ -n $switched ]]; then
  echo "Your shell's default Node is older than 24; this script switched with '$switched'. Run '$switched' in $deck before npm commands."
fi
echo "Next: cd $deck && ${switched:+$switched && }npm run dev"
