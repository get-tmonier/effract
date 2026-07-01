---
title: Recipes & examples
description: Copy-pasteable call sites and four full framework integrations.
group: Advanced
order: 2
---

The repository ships twelve self-contained, typechecked **recipes** — one call-site pattern per file —
and four **example apps** that render the same shared components across environments. The whole public
API is three primitives — **`rec`**, **`hook`**, **`mount`** — and recipes 01–02 already use all three.

## Recipes

Browse them in [`examples/`](https://github.com/get-tmonier/effract/tree/main/examples/src):

| | Recipe | Shows |
| --- | --- | --- |
| 01 | service | read a service with `yield*` — `rec` + `mount` |
| 02 | hooks-and-services | a service for data, `hook` for an ephemeral UI flag |
| 03 | async-and-suspense | async effect → Suspense |
| 04 | signals | `atom` / `atom.derive` / `useAtomValue` / `<Observe>` |
| 05 | stateful-service | state **and** derived state, in the service |
| 06 | layer-composition | services that depend on services |
| 07 | server | render a REC on the server — the same `mount`, the same import |
| 08 | typed-errors | exhaustive `.catch` over the error channel |
| 09 | query-and-loading | `query` — loading obligation, refetch, cancellation |
| 10 | derived-state | `derive` / `derive.writable` — computed & two-way |
| 11 | async-derived | `derive.effect` — async computed that suspends |
| 12 | atom-collections | `atomFamily` / `batch` |

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
