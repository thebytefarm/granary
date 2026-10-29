#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

usage() {
  cat <<'EOF'
Usage: ./publish.sh [prepare|publish|--help]

  prepare   Consume changesets, bump versions, and update the lockfile.
            Review and commit those changes before publishing.
  publish   Validate, build, and publish to npm after confirmation (default).

Requires Node.js 26+, pnpm, Git, and a clean checkout.
Run npm login before publishing. This script never commits or pushes.
EOF
}

if [[ $# -gt 1 ]]; then
  usage >&2
  exit 1
fi

action="${1:-publish}"
case "$action" in
  --help|-h)
    usage
    exit 0
    ;;
  prepare|publish) ;;
  *)
    usage >&2
    exit 1
    ;;
esac

for executable in node pnpm git npm; do
  if ! command -v "$executable" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$executable" >&2
    exit 1
  fi
done

if ! node -e 'if (Number(process.versions.node.split(".")[0]) < 26) { process.exit(1) }'; then
  printf 'Node.js 26 or newer is required.\n' >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  printf 'Commit your changes before running ./publish.sh %s.\n' "$action" >&2
  exit 1
fi

pending=false
for changeset in .changeset/*.md; do
  if [[ -f "$changeset" && "$changeset" != '.changeset/README.md' ]]; then
    pending=true
    break
  fi
done

if [[ "$action" == prepare ]]; then
  if [[ "$pending" == false ]]; then
    printf 'No pending changesets. Add one with pnpm changeset first.\n' >&2
    exit 1
  fi
  pnpm version-packages
  pnpm install
  printf '\nReview and commit the version, changelog, and lockfile changes.\nThen run npm login and ./publish.sh.\n'
  exit 0
fi

if [[ "$pending" == true ]]; then
  printf 'Run ./publish.sh prepare, then review and commit its changes first.\n' >&2
  exit 1
fi

version="$(node -p "require('./packages/granary/package.json').version")"
printf 'Publish granary-ai@%s to npm? Type publish to continue: ' "$version"
read -r confirmation
if [[ "$confirmation" != publish ]]; then
  printf 'Cancelled. Nothing published.\n'
  exit 0
fi

if ! npm whoami; then
  printf 'Run npm login, then retry ./publish.sh.\n' >&2
  exit 1
fi

pnpm release
printf '\nRelease command completed. Review local release tags before pushing them.\n'
