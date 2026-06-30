#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for this check."
  exit 1
fi

echo "Scanning for common secret-shaped content in: $ROOT"

rg --hidden --no-ignore-vcs -n \
  -g '!scripts/check-no-secrets.sh' \
  -g '!.git/**' \
  -g '!*.png' \
  -g '!*.jpg' \
  -g '!*.jpeg' \
  -g '!*.gif' \
  -e '-----BEGIN (RSA |EC |OPENSSH |)?PRIVATE KEY-----' \
  -e 'gh[pousr]_[A-Za-z0-9_]{20,}' \
  -e 'sk-[A-Za-z0-9]{20,}' \
  -e 'xox[baprs]-[A-Za-z0-9-]{20,}' \
  -e 'AIza[0-9A-Za-z_-]{20,}' \
  -e 'PIXELLAB_API_KEY=[^<[:space:]]+' \
  -e 'ASC_PRIVATE_KEY=[^<[:space:]]+' \
  "$ROOT" && {
    echo "Potential secret-shaped content found. Review before publishing."
    exit 1
  }

echo "No common secret-shaped content found."
