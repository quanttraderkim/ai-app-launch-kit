#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/bootstrap-project-docs.sh <project-root>"
  exit 1
fi

KIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$1"

mkdir -p "$PROJECT_ROOT/Docs"

copy_if_missing() {
  local source="$1"
  local target="$2"

  if [[ -e "$target" ]]; then
    echo "skip: $target already exists"
  else
    cp "$source" "$target"
    echo "create: $target"
  fi
}

copy_if_missing "$KIT_ROOT/02-product-prd/PRD.template.md" "$PROJECT_ROOT/Docs/PRD.md"
copy_if_missing "$KIT_ROOT/02-product-prd/Iteration.template.md" "$PROJECT_ROOT/Docs/Iteration-001.md"
copy_if_missing "$KIT_ROOT/04-app-store-connect-testflight/AppStoreConnectSetup.md" "$PROJECT_ROOT/Docs/AppStoreConnectSetup.md"
copy_if_missing "$KIT_ROOT/04-app-store-connect-testflight/TestFlightRunbook.md" "$PROJECT_ROOT/Docs/TestFlightRunbook.md"
copy_if_missing "$KIT_ROOT/05-release-runbooks/ReleaseChecklist.md" "$PROJECT_ROOT/Docs/ReleaseChecklist.md"
copy_if_missing "$KIT_ROOT/05-release-runbooks/GitSourceOfTruth.md" "$PROJECT_ROOT/Docs/GitSourceOfTruth.md"
copy_if_missing "$KIT_ROOT/08-security/SanitizationPolicy.md" "$PROJECT_ROOT/Docs/SanitizationPolicy.md"

echo "Project docs bootstrapped. Review placeholders before committing."
