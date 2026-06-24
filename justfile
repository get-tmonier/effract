set positional-arguments

default: help

help:
    @just --list

# --- setup ---

install:
    pnpm install

# --- individual checks ---

lint:
    pnpm run lint

lint-fix:
    pnpm run lint --fix

format:
    pnpm run format

format-fix:
    pnpm run format:fix

typecheck:
    pnpm run typecheck

boundaries:
    pnpm run boundaries

knip:
    pnpm run knip

test:
    pnpm run test

# --- combined ---

# The canonical gate. lint + format + typecheck + boundaries + knip + test.
verify: lint format typecheck boundaries knip test
    @echo "✓ all checks passed"

verify-fix: lint-fix format-fix typecheck boundaries knip test
    @echo "✓ all checks passed (auto-fixes applied)"

# --- packages ---

build:
    pnpm run build

# --- examples ---

# Run one of the example apps: just example spa-vite | next-rsc | tanstack-start | bun-ssr
example name:
    pnpm --filter "@effract/example-{{name}}" dev

build-examples:
    pnpm -r --if-present --filter "./apps/*" run build

# --- maintenance ---

bump:
    pnpm run ncu -- -u && pnpm install

# --- release ---

# Bump every published package to <version>, commit, tag, and push.
# The tag triggers .github/workflows/release.yml, which publishes to npm.
release version:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ "$(git branch --show-current)" != "main" ]; then
        echo "Error: must be on main to release" >&2; exit 1
    fi
    if [ -n "$(git status --porcelain)" ]; then
        echo "Error: working tree is dirty — commit or stash first" >&2; exit 1
    fi
    for dir in packages/effract packages/effract-rsc packages/effract-vite; do
        (cd "$dir" && npm pkg set version="{{version}}")
    done
    npm pkg set version="{{version}}"
    git add package.json packages/*/package.json
    # Only commit when the version actually changed (the first release may already match).
    git diff --cached --quiet || git commit -m "chore: release v{{version}}"
    git tag "v{{version}}"
    git push origin main "v{{version}}"
    @echo "Released v{{version}} — CI builds and publishes to npm"
