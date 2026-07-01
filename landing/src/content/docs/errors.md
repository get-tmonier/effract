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
import { rec, query } from '@tmonier/effract';

const Profile = rec(function* () {
  const user = yield* query(fetchUser(id), id); // E = NotFound | Unauthorized
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

## Errors and loading are separate channels

A REC's type carries failures in `E` and loading in `S`, and they discharge independently: `.catch`
handles the errors, [`.suspense`](/docs/loading/) handles the loading. The `query` above fetches async
data, so `Profile` carries **both** — chain the two, declaratively:

```tsx
const Profile = rec(function* () {
  const user = yield* query(fetchUser(id), id);
  return <Card user={user} />;
})
  .catch({ NotFound: () => <Empty />, Unauthorized: () => <Login /> }) // errors → UI
  .suspense(<Spinner />); // loading → UI
```

## Sync and async, uniformly

A failing effect surfaces the same tagged error whether it failed synchronously (a bare `yield* effect`,
thrown during render) or asynchronously (a `query`, re-thrown once its promise settles). `.catch`
renders the matching fallback either way. During an async wait the component suspends, so its
[`.suspense`](/docs/loading/) boundary — or a plain `<Suspense>` above it — shows the loading fallback
until the value, or the failure, arrives.

## Order: a catchable async yield goes last

When an async yield fails, `.catch` renders the fallback **in place** — the component stays mounted and
subscribed, so it recovers when its inputs change (navigate to a valid id and it refetches). For that to
hold, a **catchable async yield** (a `query` / `suspend`, or a raw async effect you `.catch`) must be the
**last hook-bearing yield** in the body: reads that don't depend on it — `yield*` an atom, `hook(...)` —
come _before_ it.

```tsx
const ProductView = rec(function* () {
  const id = yield* route.productId; // reactive reads first …
  const qty = yield* cart.qty;
  const product = yield* query(catalog.product(id), id); // … the catchable query last
  return <Panel product={product} qty={qty} />;
}).catch({ NotFound: () => <Empty /> });
```

Otherwise a failure skips the hooks after it, and on a re-render React's "rendered fewer hooks" invariant
tears the subtree down. If a later hook genuinely needs the fetched value, put it in a **child REC** and
pass the value as a prop — a placement (`yield* Child.with(...)`) is not a hook, so it may follow the query.

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
