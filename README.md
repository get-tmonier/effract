<p align="center">
  <img src="./assets/wordmark.svg" alt="effract" width="380" />
</p>

<p align="center">
  <strong>Write React components as Effect programs.</strong><br/>
  The same component runs in a SPA, on a server, in a Web Worker, or as a React Server Component —<br/>
  <em>"server vs client" becomes an Effect runtime detail, not an architectural fork.</em>
</p>

<p align="center">
  <a href="https://effract.tmonier.com"><strong>effract.tmonier.com</strong></a> · <a href="#install">Install</a> · <a href="./docs/adr/0001-fiber-reconciliation.md">ADR</a>
</p>

<p align="center">
  <a href="https://effract.tmonier.com"><img alt="website" src="https://img.shields.io/badge/website-effract.tmonier.com-7c5cff" /></a>
  <a href="#install"><img alt="status" src="https://img.shields.io/badge/status-beta-7c5cff" /></a>
  <img alt="React" src="https://img.shields.io/badge/React-19.2-29d3c2" />
  <img alt="Effect" src="https://img.shields.io/badge/Effect-v4-7c5cff" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-29d3c2" />
</p>

---

```tsx
const Counter = rec(function* () {
  const stats = yield* Stats; // an Effect service, from the runtime
  const [n, setN] = yield* hook(useState(0)); // a real React hook
  return <Panel n={n} total={stats.total} onTab={setN} />; // <Panel> is plain React
});

createRoot(el).render(mount(AppLive, Counter)); // missing service → compile error
```

One body, two languages, a single stream of `yield*` — interpreted **inside React's render pass**. The hooks
are genuine React hooks; the services come from an Effect `Context`. 100% real React, no forked reconciler.

> **Incremental, not a rewrite.** Plain React components stay ordinary `<Component />` JSX. You write a
> **REC** with `rec(...)` _only_ where a component reaches for a service (or a hook bridged through Effect);
> the two compose freely in the same tree.

## Two fibers, one component

React schedules work on units it calls **fibers**; so does Effect. A REC's body is a generator effract
drives _synchronously, during render_, answering each `yield*` by what it is:

| You write | effract does |
| --- | --- |
| `yield* SomeService` | resolves it synchronously from the runtime's `Context` |
| `yield* hook(useState(0))` | a genuine React hook — keeps its place in React's hook order |
| `yield* someAsyncEffect` | suspends through React Suspense / `use`, resumes inline |
| a genuine failure | throws to the nearest React error boundary |

A REC is **not** a JSX element — `<Counter />` is a compile error. You _place_ one by yielding it:
`{yield* Counter}`, or `{yield* Greet.with({ name: 'Ada' })}` for props. Plain components sit right
alongside: `<Card>{yield* Counter}</Card>`.

## One component, every runtime

The boundary isn't "server vs client" — it's **which Effect runtime renders the component**:

```tsx
mount(BrowserLive, Dashboard)                        // SPA
mount(ServerLive, Dashboard)                         // Bun / Node streaming SSR
renderToFlightStream(<DashboardRSC />, { runtime })  // React Server Component (Flight)
```

`mount` also checks **at compile time** that the layer provides every service the tree needs — a missing
one is a type error that names it.

## Install

```sh
npm i @tmonier/effract        # add @tmonier/effract-rsc for the React Server Components renderer
```

Requires **React 19.2+** and **Effect v4**.

```tsx
import { mount, rec, hook } from '@tmonier/effract';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';

const Card = ({ children }: { children: React.ReactNode }) => <section>{children}</section>; // plain React

const Counter = rec(function* () {
  const stats = yield* Stats; // a service → it's a REC
  const [n, setN] = yield* hook(useState(0));
  return <button onClick={() => setN(n + 1)}>{n} · {stats.total}</button>;
});

const App = rec(function* () {
  return <Card>{yield* Counter}</Card>; // plain JSX + a yielded REC
});

createRoot(document.getElementById('root')!).render(mount(AppLive, App));
```

Full guide and docs → **[effract.tmonier.com](https://effract.tmonier.com)**.

## Reactivity

effract bridges Effect's reactive cell (`AtomRef`) to React with precise re-renders — no stray
`Effect.runSync` at the call site. State can also live _inside a service_, reachable from anywhere an
Effect runs, including the server.

```tsx
const likes = atom(0);
const doubled = observe(($) => $(likes) * 2); // re-renders only when an atom it read changes
const [n, setN] = useAtom(likes); // the useState shape, backed by Effect
<Observe>{($) => <b>{$(likes)}</b>}</Observe>; // inline in JSX
```

## React Server Components

`@tmonier/effract-rsc` drives the same REC bodies on the server and streams standard Flight (plus a
**Web Worker** variant, `@tmonier/effract-rsc/worker`, that renders off the main thread):

```tsx
import { serverComponent, renderToFlightStream } from '@tmonier/effract-rsc';

const Header = serverComponent(statsBadge); // a service-only body — no hooks
const stream = renderToFlightStream(<Header />, { runtime }); // → text/x-component
```

## Recipes & examples

Eight typechecked, copy-pasteable call sites in [`examples/`](./examples/src), and four full integrations
in [`apps/`](./apps) — all rendering the **same shared components** to prove the abstraction holds:

| App | Environment |
| --- | --- |
| [`spa-vite`](./apps/spa-vite) | Vite SPA |
| [`bun-ssr`](./apps/bun-ssr) | Plain Bun streaming SSR + hydration |
| [`next-rsc`](./apps/next-rsc) | Next.js App Router (RSC) |
| [`tanstack-start`](./apps/tanstack-start) | TanStack Start (SSR) |

Run one with `just example <name>`.

## Packages

| Package | What it is |
| --- | --- |
| [`@tmonier/effract`](./packages/effract) | the core: `rec`, `view`, `hook`, `mount`, signals |
| [`@tmonier/effract-rsc`](./packages/effract-rsc) | Flight server renderer + Web Worker variant |
| [`@tmonier/effract-vite`](./packages/effract-vite) | a one-import Vite plugin |

The design and its tradeoffs are written up in
[**ADR 0001 — Fiber reconciliation**](./docs/adr/0001-fiber-reconciliation.md).

## Development

```sh
just install    # pnpm install
just verify     # lint + format + typecheck + boundaries + knip + test
just example bun-ssr
```

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Tmonier
