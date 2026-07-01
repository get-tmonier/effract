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
import { mount, rec, atom } from '@tmonier/effract';
import { createRoot } from 'react-dom/client';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

// A stateful service — the state *and* the logic over it live here, in Effect.
// The shape is inferred from `make`; the Live layer is a `static`.
class Counter extends Context.Service<Counter>()('app/Counter', {
  make: Effect.sync(() => {
    const count = atom(0);
    return { count, inc: () => count.update((n) => n + 1) };
  }),
}) {
  static readonly layer = Layer.effect(Counter, Counter.make);
}

// Card is a plain React component — an ordinary function, left untouched.
const Card = ({ children }: { children: React.ReactNode }) => <section className="card">{children}</section>;

// CounterView is a REC: it reaches for a service, so it's written with `rec(...)`.
const CounterView = rec(function* () {
  const counter = yield* Counter;
  const n = yield* counter.count; // reactive read — re-renders precisely when count changes
  return <button onClick={() => counter.inc()}>{n}</button>; // no useState, no logic — just render
});

// App places the plain Card as JSX and the CounterView REC by yielding it.
const App = rec(function* () {
  return <Card>{yield* CounterView}</Card>;
});

createRoot(document.getElementById('root')!).render(mount(Counter.layer, App));
```

The state lives in the `Counter` service; the component only reads it (`yield* counter.count`) and fires
an event (`counter.inc()`). A REC is **not** a JSX element — `<CounterView />` is a compile error. You
place a REC by `yield*`-ing it inside another component's returned JSX (`{yield* CounterView}`, or
`{yield* CounterView.with({ ... })}` to pass props), while plain components like `<Card>` stay normal
JSX. `mount(CounterLive, App)` builds the Effect runtime once and returns a `ReactNode`; it verifies _at
compile time_ that the layer provides every service the tree needs — a missing service is a type error
that names it.

## Where to next

- [The thesis](/docs/the-thesis/) — how Effect and React fibers reconcile.
- [The runtime](/docs/runtime/) — services, layers, and wiring it in with `mount`.
- [Components](/docs/components/) — `rec` and `hook`.
- [Signals](/docs/signals/) — `observe`, `atom`, and precise reactivity.
- [Client & server](/docs/client-and-server/) — one `mount`, interactive or on the server, no client JS.
