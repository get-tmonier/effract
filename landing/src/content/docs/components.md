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
  const stats = yield* Stats;
  const [tab, setTab] = yield* hook(useState('overview'));
  return <Panel tab={tab} total={stats.total} onTab={setTab} />; // Panel is plain React
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

## Async and Suspense

Reading an asynchronous effect suspends the component through React Suspense and resumes inline when
the value is ready — no `useEffect`, no `isLoading` flag:

```tsx
const Profile = rec(function* () {
  const api = yield* Api;
  const user = yield* api.fetchUser(); // suspends here
  return <h2>Welcome, {user.name}</h2>;
});

// <Suspense> is a host element (plain JSX); the Profile REC is placed by yielding it
const Account = rec(function* () {
  return <Suspense fallback={<Spinner />}>{yield* Profile}</Suspense>;
});
```

That raw form is the escape hatch: it suspends, but nothing tracks it. For real async data, wrap the
effect in [`query`](/docs/loading/) — it dedupes, refetches on key, cancels on unmount, and records a
loading obligation the type system makes you handle. See [Loading & queries](/docs/loading/).

A REC's typed failures can be rendered as UI with [`.catch`](/docs/errors/) — one fallback per error
`_tag`, checked exhaustively. Anything you don't handle is thrown to the nearest React error boundary.
