---
title: The thesis
description: How Effect and React fibers reconcile — 100% real React, no forked reconciler.
group: Start
order: 2
---

React schedules work on units it calls **fibers**. Effect schedules work on units it also calls
**fibers**. effract is the loom between the two.

## The body is a generator

A REC body is a plain generator — _not_ an `Effect`. If it were an `Effect.gen`, it would run on an
Effect fiber, asynchronously, **outside** React's render pass — and any hook called there would
break the Rules of Hooks. So instead, effract drives the generator **synchronously, during render**,
and answers each `yield*` based on what it is:

| You write | effract does |
| --- | --- |
| `yield* SomeService` | resolves it synchronously from the runtime's `Context` |
| `yield* hook(useState(0))` | the hook already ran inline — keeps its place in React's hook order |
| `yield* someAsyncEffect` | suspends through React's `use`, resumes inline on the retry |
| a typed failure | renders a [`.catch`](/docs/errors/) fallback for its `_tag` — else throws to the nearest boundary |

Because the walk is synchronous and deterministic, your hooks stay valid React hooks with a stable
order across renders. effract cooperates with React's reconciler; it never replaces it.

## Why `hook(...)`

`hook(value)` lifts an already-evaluated React hook result into the `yield*` channel, so a component
body reads as one uniform stream of `yield*` whether the value comes from Effect or from React:

```tsx
const [tab, setTab] = yield* hook(useState('overview'));
const ref = yield* hook(useRef<HTMLDivElement>(null));
```

The hook is called _inline_ — `hook` only makes the result yieldable. Since the body runs inside the
render pass, the call obeys the Rules of Hooks like any other.

## Tradeoffs

effract inherits React's constraints — a body must yield hooks in a stable order. A raw `yield*
asyncEffect` suspends at runtime but is neither type-tracked nor deduped; for loading tracking,
refetch and cancellation reach for [`query`](/docs/loading/), and for reactive state
[signals](/docs/signals/).

The full design is written up as an architecture decision record:
[ADR 0001 — Fiber reconciliation](https://github.com/get-tmonier/effract/blob/main/docs/adr/0001-fiber-reconciliation.md).
