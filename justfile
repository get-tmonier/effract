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

changeset:
    @echo "Update CHANGELOG.md and bump catalog/package versions, then: just release <version>"

release version:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ "$(git branch --show-current)" != "main" ]; then
        echo "Error: must be on main to release" >&2; exit 1
    fi
    if [ -n "$(git status --porcelain)" ]; then
        echo "Error: working tree is dirty" >&2; exit 1
    fi
    git tag "v{{version}}"
    git push origin main "v{{version}}"
    echo "Tagged v{{version}} — CI publishes to npm"
