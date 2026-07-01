---
title: Components
description: rec and hook — write a component as an Effect program, and place it with yield*.
group: Core
order: 2
---

effract has **one** component constructor: `rec`. It produces a **REC** (React Effect Component). You
write a REC _only_ for a component that reaches for the runtime — a service, or a hook bridged through
Effect. **Plain React components stay plain**: ordinary functions used as `<Panel />` JSX, untouched.
The two compose freely in the same tree.

## `rec` — write a component as an Effect program

The body yields Effect services and effects, and `yield* hook(...)` for React hooks, all interpreted
inside the render pass. Note that `Panel` below is a plain React component placed as ordinary JSX —
effract never asks you to rewrite it.

```tsx
const Dashboard = rec(function* () {
  const stats = yield* Stats; // an Effect service
  const online = yield* stats.online; // reactive service state — read + subscribe
  const box = yield* hook(useRef<HTMLDivElement>(null)); // a genuine React hook — a DOM ref
  return <Panel ref={box} online={online} />; // Panel is plain React
});
```

The component's required services are inferred from what it yields, so `mount` can verify the layer
provides them.

## Placing a REC

A REC is **not** a JSX element — `<Dashboard />` is a compile error. You place a REC by `yield*`-ing
it inside another component's returned JSX:

```tsx
const Page = rec(function* () {
  return (
    <main>
      {yield* Dashboard /* no props */}
      {yield* Greet.with({ name: 'Ada' }) /* with props */}
    </main>
  );
});
```

Plain components stay normal JSX, so a REC and a plain component sit side by side:
`<Card>{yield* Counter}</Card>`.

## Resolve up front (no hooks)

A REC whose body only reads services — no `hook(...)` — is the simpler, RSC-friendly shape: ideal near
the root for flags, the current user, or permissions. It's the same `rec`, and because it never touches
a hook it renders on the server with the same [`mount`](/docs/client-and-server/).

```tsx
const Banner = rec(function* () {
  const flags = yield* Flags;
  return flags.beta ? <aside>You're on the beta.</aside> : null;
});
```

## Beyond reading a service

A REC does more than read a service synchronously — but each of those concerns has its own page, so a
component body stays about structure:

- **Reactive state** — hold `atom`s in a service and read them with `yield*`; the component re-renders
  precisely when one changes. See [Reactivity](/docs/signals/).
- **Async data** — `query` suspends for a value, refetches when its key changes, and records a loading
  obligation the type system makes you handle. See [Loading & queries](/docs/loading/).
- **Typed failures** — render an exhaustive, compile-checked fallback per error `_tag` with `.catch`.
  See [Typed errors](/docs/errors/).
