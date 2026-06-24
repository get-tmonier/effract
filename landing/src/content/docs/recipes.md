---
title: Recipes & examples
description: Copy-pasteable call sites and four full framework integrations.
group: Advanced
order: 2
---

The repository ships eight self-contained, typechecked **recipes** — one call-site pattern per file —
and four **example apps** that render the same shared components across environments.

## Recipes

Browse them in [`examples/`](https://github.com/get-tmonier/effract/tree/main/examples/src):

| | Recipe | Shows |
| --- | --- | --- |
| 01 | service | read a service with `yield*` |
| 02 | hooks-and-services | `useState` and a service, interleaved |
| 03 | async-and-suspense | async effect → Suspense |
| 04 | signals | `atom` / `observe` / `useAtom` |
| 05 | stateful-service | a REC wired to mutable service state |
| 06 | layer-composition | services that depend on services |
| 07 | resolve-up-front | `view` (the RSC-friendly mode) |
| 08 | server-component | drive a REC as RSC + stream Flight |

## Example apps

Four integrations in [`apps/`](https://github.com/get-tmonier/effract/tree/main/apps), each rendering
the same shared components:

| App | Environment |
| --- | --- |
| `spa-vite` | Vite SPA |
| `bun-ssr` | Plain Bun streaming SSR + hydration |
| `next-rsc` | Next.js App Router (RSC) |
| `tanstack-start` | TanStack Start (SSR) |

Clone the repo and run `just example bun-ssr` (or any of the four) to see the same React Effect
Components light up against a different runtime each time.
