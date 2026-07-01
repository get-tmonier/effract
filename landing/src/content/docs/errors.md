---
title: Typed errors
description: .catch — render an exhaustive, compile-checked fallback for each error a REC can fail with.
group: Core
order: 4
---

A REC's failures are part of its type. Effect's error channel `E` rides along with every `yield*`, so
effract knows exactly how a component can fail. `.catch` turns that knowledge into UI: an **exhaustive,
compile-checked** map of fallbacks — one per error `_tag`, each handed exactly that error.

## `.catch`

```tsx
import { rec } from '@tmonier/effract';

const Profile = rec(function* () {
  const user = yield* fetchUser(id); // E = NotFound | Unauthorized
  return <Card user={user} />;
}).catch({
  NotFound: () => <Empty />,
  Unauthorized: (e) => <Login reason={e.reason} />, // e is the Unauthorized error, fully typed
});
```

The handler map is exhaustive over the error channel and checked by the compiler:

- **Forget a tag** the body can fail with → it won't compile (a missing property).
- **Invent a tag** the body can't raise → it won't compile (an excess property).
- Each handler receives **exactly its own error**, so `e.reason` above is typed.

`.catch` returns a **plain REC** — its declared failures discharged — so you `yield*` or `mount` it like
any other. A REC that cannot fail with a tagged error takes `.catch({})`.

## Sync and async, uniformly

A failing effect surfaces the same tagged error whether it failed synchronously or asynchronously — a
sync failure is thrown during render, an async one is re-thrown through Suspense once its promise
settles. `.catch` renders the matching fallback either way. During the async wait the component simply
suspends, so a `<Suspense>` boundary above it shows its fallback until the value (or the failure) arrives.

## What `.catch` does not swallow

`.catch` handles a REC's **own** `yield*`ed failures. It deliberately leaves three things alone:

- **Suspense signals** — an async yield still suspends; `.catch` never turns a pending load into an error.
- **Defects** (`Effect.die`, thrown exceptions) — these are bugs, not typed failures, so they pass
  through to the nearest React error boundary.
- **A child REC's failures** — a child owns its own errors. Wrap the child in `.catch` too; a parent
  never silently swallows what a child failed to handle. This holds identically on the client and the
  server.

## On the server

`.catch` is the same value and the same API in a React Server Component graph — the server `mount`
honours it while driving the tree, so a service-only REC renders its typed fallback on the server with no
client JavaScript. Nothing to import, nothing to change.
