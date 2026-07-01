---
title: Loading & queries
description: query for async data, and .suspense — a loading obligation the type system won't let you forget.
group: Core
order: 5
---

Async data goes through **`query`**. It suspends the render for the value, refetches when its key
changes, and interrupts the in-flight fiber if the component unmounts. And — mirroring `.catch` for
errors — a `query` records a **loading obligation** in the REC's type, so the loading state cannot be
silently forgotten.

## `query`

```tsx
import { rec, query } from '@tmonier/effract';

const Profile = rec(function* () {
  const user = yield* query(fetchUser(id), id); // refetch when `id` changes
  return <Card user={user} />;
});
```

- **Suspends** for the value through React's `use` — no `isLoading` flag, no `useEffect`.
- **Refetches** when the second argument (the key, compared by value) changes; an unchanged key reuses
  the running or settled request.
- **Cancels** on unmount: the in-flight Effect fiber is interrupted, so its finalizers run.
- **Deduped** across every render attempt — including React's pre-commit retries — so a query runs its
  effect once, not twice, on mount.

Retries, timeouts and cancellation policies are not query options — they're ordinary Effect combinators
on the effect you pass:

```tsx
yield* query(fetchUser(id).pipe(Effect.retry(policy), Effect.timeout('2 seconds')), id);
```

A query's failures ride the same error channel as everything else, so `.catch` renders them (see
[Typed errors](/docs/errors/)).

## `suspend` — the primitive

You are not forced to use `query`. It is built on a lower-level primitive, **`suspend`**, which is
exported too. `suspend(effect)` opts an effect into Suspense and the loading obligation — load-once,
deduped, cancelled on unmount — without query's keyed refetch:

```tsx
const config = yield* suspend(loadConfig());   // load-once
const user = yield* query(fetchUser(id), id);  // suspend + refetch when id changes
```

Reach for `suspend` for one-shot loads, or to build your own async abstractions (a `mutation`, a
poller, your own cache) on top of it. `query` is just `suspend` with a refetch key.

## The loading obligation

A REC that yields a `suspend` or `query` carries a loading obligation, `S`, in its type. It bubbles up
the tree the way service requirements do, and `mount` **will not compile** until it is discharged:

```tsx
mount(App, Profile);                          // ✗ compile error: loading not handled
mount(App, Profile.suspense(<Spinner />));    // ✓ handled in the tree
mount(App, Profile, { loading: <Spinner /> }); // ✓ handled at the boundary
```

`.suspense(fallback)` wraps the REC in a real `<Suspense>` boundary and discharges the obligation,
returning a plain REC. One boundary covers the whole subtree beneath it (React Suspense's own
semantics), so a single `.suspense` — or `{ loading }` at `mount` — satisfies an obligation the type
otherwise bubbles all the way to the root.

### Loading is catch-all, not per-source

Unlike the error channel — a union of tagged types that `.catch` handles per `_tag` — the loading
channel is **binary**: `S` is `Suspends` or `never`. A pending effect has no tag, so there is nothing to
route a per-source fallback on; one `.suspense` shows one fallback for everything beneath it. For
**separate** loading UIs, place a boundary per child — each `.suspense` is its own `<Suspense>`:

```tsx
const Page = rec(function* () {
  return (
    <div>
      {yield* Profile.suspense(<ProfileSkeleton />)}
      {yield* Feed.suspense(<FeedSkeleton />)}
    </div>
  );
});
// Page: REC<…, never> — both children discharged, each with its own fallback
```

This is exactly how you place multiple `<Suspense>` boundaries in plain React; the type just tracks
whether anything below is still undischarged.

## Server

On the **server** there is no pending state — a `suspend`/`query` is awaited inline before the HTML is
sent — so the server `mount` imposes no loading obligation. Loading is a client concern, handled where
the tree renders interactively.

## Raw async is the escape hatch

A plain `yield* asyncEffect` still suspends at runtime — but the compiler cannot tell a synchronous
`Effect` from an asynchronous one (they are the *same type*, right down to `Effect.sleep` being
`Effect<void, never, never>`), so a raw async yield carries **no** loading obligation. You provide your
own `<Suspense>`, exactly as in [recipe 03](https://github.com/get-tmonier/effract/blob/main/examples/src/03-async-and-suspense.tsx).

Reach for `query` when you want the type to track it — plus refetch, de-duplication and cancellation.
Opting in is one word:

```tsx
yield* Effect.promise(() => fetchThing());        // suspends · S = never · your boundary
yield* query(Effect.promise(() => fetchThing())); // suspends · S = Suspends · tracked, deduped, cancelled
```
