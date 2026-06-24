---
title: Getting started
description: Install effract and render your first React Effect Component.
group: Start
order: 1
---

**effract** lets you write React components as Effect programs. A component body is a generator
that effract interprets _inside React's render pass_, so it can `yield*` both Effect services and
real React hooks. The same component then runs in a SPA, on a server, in a Web Worker, or as a
React Server Component.

## Install

```bash
npm i @tmonier/effract
```

> effract requires **React 19.2+** and **Effect v4** (installed automatically as peers). For the RSC
> renderer, also add `@tmonier/effract-rsc`.

## Your first component

A React Effect Component (REC) is a real React component. Define a service, read it in a component,
and provide a runtime near the root:

```tsx
import { Runtime, component, hook } from '@tmonier/effract';
import { useState } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

class Stats extends Context.Service<Stats, { total: number }>()('app/Stats') {}
const StatsLive = Layer.succeed(Stats)({ total: 1280 });

const Counter = component(function* () {
  const stats = yield* Stats; // an Effect service
  const [n, setN] = yield* hook(useState(0)); // a real React hook
  return (
    <button onClick={() => setN(n + 1)}>
      {n} · {stats.total} total
    </button>
  );
});

export const App = () => (
  <Runtime layer={StatsLive}>
    <Counter />
  </Runtime>
);
```

That's it — `<Counter />` is an ordinary React element. React renders it, holds its hook state, and
reconciles it like any other component. The `Stats` service is resolved synchronously from the
runtime supplied by `<Runtime>`.

## Where to next

- [The thesis](/docs/the-thesis/) — how Effect and React fibers reconcile.
- [The runtime](/docs/runtime/) — services, layers, and the `<Runtime>` boundary.
- [Components](/docs/components/) — `component`, `view`, and `hook`.
- [Signals](/docs/signals/) — `observe`, `atom`, and precise reactivity.
- [Server Components](/docs/server-components/) — drive RECs as RSC and stream Flight.
