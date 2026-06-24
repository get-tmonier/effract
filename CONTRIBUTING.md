# Contributing to effract

Thanks for your interest! effract is an early, opinionated project — issues, ideas, and PRs are all welcome.

## Setup

effract uses [mise](https://mise.jdx.dev) to pin the toolchain (Node, pnpm, just, lefthook) and
[pnpm](https://pnpm.io) workspaces with a single version **catalog**.

```sh
mise install     # provision node, pnpm, just, lefthook
just install     # pnpm install
```

## The one command

```sh
just verify
```

This is the gate CI runs: **lint + format + typecheck + boundaries + knip + test**.

| Tool | Role |
| --- | --- |
| [oxlint](https://oxc.rs) | linting (no ESLint) |
| [oxfmt](https://oxc.rs) | formatting (no Prettier) |
| [tsgo](https://github.com/microsoft/typescript-go) | typechecking (`@typescript/native-preview`, no emit) |
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | hexagonal boundary enforcement |
| [knip](https://knip.dev) | dead-code / unused-dependency detection |
| [vitest](https://vitest.dev) | tests |

`just verify-fix` applies lint/format autofixes. `lefthook` runs lint/format/typecheck on commit.

## Conventions

- **Exact versions only.** Every dependency is pinned in the `catalog:` of `pnpm-workspace.yaml`. No `^`
  or `~`. Bump with `just bump`.
- **Hexagonal layering** inside each package: `domain` (pure protocol) → `application` (the React-free
  interpreter) → `infrastructure` (the React binding). Enforced by dependency-cruiser; cross-layer imports
  go through `index.ts`.
- **No abusive lint suppressions.** Fix the underlying code. A single targeted `// oxlint-disable-next-line
  <rule>` with a one-line reason is fine when the lint is genuinely wrong; file-wide disables are not.
- **React 19.2+ and Effect v4 only.**
- **Tests alongside logic.** Prefer behavioural tests (assert on outputs for inputs) that survive a
  semantics-preserving refactor. The interpreter is renderer-agnostic and should stay unit-testable.

## Examples

The four apps in [`apps/`](./apps) all render the shared components in [`apps/shared`](./apps/shared). The
typechecked recipes live in [`examples/`](./examples). If you add a public-API call site, add a recipe.

## Commits & PRs

- Keep PRs focused; describe the change and why.
- `just verify` must pass. New behaviour needs a test.
- Be kind — see the [Code of Conduct](./CODE_OF_CONDUCT.md).
