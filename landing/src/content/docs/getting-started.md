---
title: Getting started
description: Install effract and render your first React Effect Component.
group: Start
order: 1
---

**effract** lets you write React components as Effect programs. A component body is a generator
that effract interprets _inside React's render pass_, so it can `yield*` both Effect services and
real React hooks. The same component then runs in a SPA, during SSR, or as a React Server
Component — the same `mount`, the same import, wherever it renders.

## Install

```bash
npm i @tmonier/effract
```

> effract requires **React 19.2+** and **Effect v4** (installed automatically as peers). One package
> covers everything — client, SSR, and React Server Components all come from `@tmonier/effract`.

## Incremental — not a rewrite

effract does **not** ask you to rewrite your app. There are two kinds of component, and the
distinction matters:

- **Plain React components** — buttons, cards, layout, anything presentational — stay _exactly_ as
  they are: ordinary functions used as `<Button />` JSX. You don't touch them.
- **RECs** are only for components that need the runtime (an Effect service, or a hook bridged
  through Effect). Those you write with `rec(...)`.

The two compose freely in the same tree. You convert a component to a REC _only_ when it actually
reaches for a service — never wholesale.

## Your first component

A React Effect Component (REC) is a real React component. Define a service, read it in a REC, and wire
the runtime in once with `mount`:

```tsx
import { mount, rec, hook } from '@tmonier/effract';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

class Stats extends Context.Service<Stats, { total: number }>()('app/Stats') {}
const StatsLive = Layer.succeed(Stats)({ total: 1280 });

// Card is a plain React component — an ordinary function, left untouched.
const Card = ({ children }: { children: React.ReactNode }) => <section className="card">{children}</section>;

// Counter is a REC: it reaches for a service, so it's written with `rec(...)`.
const Counter = rec(function* () {
  const stats = yield* Stats; // an Effect service
  const [n, setN] = yield* hook(useState(0)); // a real React hook
  return (
    <button onClick={() => setN(n + 1)}>
      {n} · {stats.total} total
    </button>
  );
});

// App places the plain Card as JSX and the Counter REC by yielding it.
const App = rec(function* () {
  return <Card>{yield* Counter}</Card>;
});

createRoot(document.getElementById('root')!).render(mount(StatsLive, App));
```

A REC is **not** a JSX element — `<Counter />` is a compile error. You place a REC by `yield*`-ing it
inside another component's returned JSX (`{yield* Counter}`, or `{yield* Counter.with({ ... })}` to
pass props), while plain components like `<Card>` stay normal JSX. `mount(StatsLive, App)` builds the
Effect runtime once and returns a `ReactNode`; it verifies _at compile time_ that the layer provides
every service the tree needs — a missing service is a type error that names it. The `Stats` service is
then resolved synchronously inside `Counter`.

## Where to next

- [The thesis](/docs/the-thesis/) — how Effect and React fibers reconcile.
- [The runtime](/docs/runtime/) — services, layers, and wiring it in with `mount`.
- [Components](/docs/components/) — `rec` and `hook`.
- [Signals](/docs/signals/) — `observe`, `atom`, and precise reactivity.
- [Client & server](/docs/client-and-server/) — one `mount`, interactive or on the server, no client JS.
