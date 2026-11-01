#!/usr/bin/env bash
# Builds the deck and publishes it to an S3 bucket served by CloudFront, under /<slug>/.
# The bucket, the distribution and the rewrite that serves index.html for /<slug>/ are
# yours to set up; see references/hosting.md in the skill.
#
#   ./scripts/deploy-s3.sh                          # build slides.md, sync, invalidate
#   ./scripts/deploy-s3.sh -- --without-notes       # anything after -- goes to slidev build
#   ./scripts/deploy-s3.sh other.md                 # build a different entry file
#   ./scripts/deploy-s3.sh speaker-notes.pdf        # upload just this file next to the deck
#
# Settings (environment variables):
#   DECK_BUCKET           required, e.g. slides.example.com
#   DECK_DISTRIBUTION_ID  required, the CloudFront distribution in front of the bucket
#   DECK_BASE_URL         optional, e.g. https://slides.example.com, to print the deck's URL
#   DECK_SLUG             optional, the S3 prefix and URL path; defaults to the deck folder's
#                         name in lowercase. Set it to keep the URL when you rename the folder.
#   AWS_PROFILE, AWS_*    the usual AWS CLI credentials
set -euo pipefail

die() {
  echo "deploy-s3: $*" >&2
  exit 1
}

usage() {
  sed -n '6,9p' "${BASH_SOURCE[0]}" | sed 's/^# //' >&2
  exit 1
}

# An absolute path for a file given relative to where the script was called from
absolute() {
  echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
}

entry=""
file=""
build_args=()
if [[ $# -gt 0 && $1 != -- ]]; then
  [[ $1 != -* ]] || usage
  [[ -f $1 ]] || die "$1: no such file"
  if [[ $1 == *.md ]]; then
    entry=$(absolute "$1")
  else
    file=$(absolute "$1")
  fi
  shift
fi
if [[ $# -gt 0 ]]; then
  [[ $1 == -- && -z $file ]] || usage
  shift
  build_args=("$@")
fi

# The deck is the folder this script's scripts/ folder sits in, wherever it's called from
deck_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$deck_root"
entry=${entry:-$deck_root/slides.md}

[[ -n ${DECK_BUCKET:-} ]] || die "set DECK_BUCKET to the bucket's name"
[[ -n ${DECK_DISTRIBUTION_ID:-} ]] || die "set DECK_DISTRIBUTION_ID to the CloudFront distribution's ID"
command -v aws >/dev/null || die "the AWS CLI isn't installed (https://aws.amazon.com/cli/)"

slug=${DECK_SLUG:-$(basename "$deck_root" | tr '[:upper:]' '[:lower:]')}
[[ $slug =~ ^[a-z0-9][a-z0-9-]*$ ]] ||
  die "'$slug' isn't a usable URL path (lowercase letters, digits and dashes); set DECK_SLUG"
base_url=${DECK_BASE_URL:-}
base_url=${base_url%/}

invalidate() {
  echo "Invalidating $1"
  aws cloudfront create-invalidation --distribution-id "$DECK_DISTRIBUTION_ID" --paths "$1" \
    --query Invalidation.Status --output text
}

if [[ -n $file ]]; then
  name=$(basename "$file")
  aws s3 cp "$file" "s3://$DECK_BUCKET/$slug/$name"
  invalidate "/$slug/$name"
  [[ -z $base_url ]] || echo "Published $base_url/$slug/$name"
  exit 0
fi

[[ -f $entry ]] || die "$entry: no such file"
npm exec --no -- slidev --version >/dev/null 2>&1 || die "Slidev isn't installed in $deck_root; run npm install"

rm -rf dist
# The deck's own Slidev, so the build matches what you rehearsed with
npm exec --no -- slidev build "$entry" --base "/$slug/" ${build_args[@]+"${build_args[@]}"}

# No --delete, on purpose: it would also remove files uploaded next to the deck with the
# single-file mode above (the notes PDF, a rehearsal video). The tradeoff is that assets
# dropped from the deck stay in the bucket until you remove them.
aws s3 sync dist "s3://$DECK_BUCKET/$slug/"
invalidate "/$slug/*"
[[ -z $base_url ]] || echo "Published $base_url/$slug/"
