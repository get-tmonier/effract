<p align="center">
  <img src="./assets/wordmark.svg" alt="effract" width="380" />
</p>

<p align="center">
  <strong>Write React components as Effect programs.</strong><br/>
  The same component — and the same <code>mount</code> — runs in a SPA, during SSR, or as a React Server Component —<br/>
  <em>"server vs client" becomes an implementation detail the bundler resolves, not something you type.</em>
</p>

<p align="center">
  <a href="https://effract.tmonier.com"><strong>effract.tmonier.com</strong></a> · <a href="#install">Install</a> · <a href="./docs/adr/0001-fiber-reconciliation.md">ADR</a>
</p>

<p align="center">
  <a href="https://effract.tmonier.com"><img alt="website" src="https://img.shields.io/badge/website-effract.tmonier.com-7c5cff" /></a>
  <a href="https://bundlephobia.com/package/@tmonier/effract"><img alt="minzipped size" src="https://img.shields.io/bundlephobia/minzip/@tmonier/effract?label=core%20gzip&color=29d3c2" /></a>
  <img alt="React" src="https://img.shields.io/badge/React-19%2B-29d3c2" />
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

**The whole public API is three primitives** — everything above is already all of them:

- **`rec`** — write a component as an Effect program.
- **`hook`** — bridge a real React hook into the `yield*` stream.
- **`mount`** — render the tree under a runtime. Same call on the client and the server.

That's it. (Signals — `atom` / `observe` — are an optional extra for precise reactivity.)

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

## One component, one `mount`, every runtime

There is **one boundary and one import** — `mount(layer, Root)` from `@tmonier/effract`. You write a
component once with `rec(...)`; you `mount` it the same way everywhere:

```tsx
import { mount } from '@tmonier/effract'; // ← the same import in every file

mount(BrowserLive, Dashboard) // SPA
mount(ServerLive, Dashboard)  // Bun / Node streaming SSR + hydration
mount(ServerLive, Page)       // React Server Component — same call, no client JS
```

"Server vs client" is never something you type. In a React Server Component graph the bundler's
`react-server` export condition hands `mount` a server implementation (it drives the tree on the server,
no client JS); everywhere else it renders interactively. Same name, same signature, same compile-time
check that the layer provides every service the tree needs — the runtime, and the client/server split
itself, are an implementation detail.

### Moving a component from client to server

You don't rewrite anything — you move where it's `mount`ed. A service-only REC that ran as a client
island:

```tsx
// island.tsx  ('use client')  → interactive, ships JS
'use client';
import { mount } from '@tmonier/effract';
export const Badge = () => mount(AppLive, StatsBadge);
```

becomes a zero-JS server component by `mount`ing it from a server module instead — **the component and
the call are identical**:

```tsx
// page.tsx  (a React Server Component)  → resolved on the server, no JS
import { mount } from '@tmonier/effract';
export default mount(AppLive, StatsBadge);
```

The only thing that changed is the file it lives in. (A REC that uses a React `hook` stays a client
island — RSC has no hooks — and that's the one honest line the type system keeps for you.)

## Install

```sh
npm i @tmonier/effract
```

One package. Its only peers are **React 19+** and **Effect v4** — nothing else, no bundler-specific
Flight runtime (see [Bundle size](#bundle-size)).

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

## Bundle size

effract is tiny, and it never doubles your dependencies.

| Package | Your bundle gains (min+gzip) |
| --- | --- |
| `@tmonier/effract` (client entry) | **~1.7 kB** |
| `@tmonier/effract` (server entry) | **~0.75 kB** |
| `@tmonier/effract-vite` | 0 (build-time plugin) |

That's effract's own code only. **React and Effect are never bundled** — they're `peerDependencies`, imported
externally and resolved to **your app's single copy**. Three things keep it that way:

- **Empty `dependencies`.** The packages ship no runtime deps; React/Effect are `import`ed, never inlined.
- **Wide peer ranges** (`react: ^19.0.0`, `effect: >=4.0.0-beta.88 <5.0.0`) so a slightly different version
  still satisfies the peer — no second copy gets installed.
- **De-duplication in the Vite plugin** (`@tmonier/effract-vite`) forces a single `react`, `react-dom`, and
  `effect` even if a transitive dependency pulls another, so you never ship React or Effect twice.

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

No extra package, no new API. In a framework that owns the RSC pipeline (Next.js, TanStack Start), you
`mount` a REC from a server module and it renders on the server — the bundler's `react-server` condition
selects a server `mount` for you:

```tsx
import { rec, mount } from '@tmonier/effract'; // same import as the client

const StatsBadge = rec(function* () {
  const stats = yield* Stats; // resolved on the server — no client JS
  return <span>{stats.online} online</span>;
});

// The page is a REC; compose children with yield*, wire the runtime once.
const Page = rec(function* () {
  return <main>{yield* StatsBadge}</main>;
});

export default mount(AppLive, Page); // the very same call a client root makes
```

Only service-only (hook-free) RECs can be Server Components — RSC has no hooks; hook-bearing RECs stay
client islands you `mount`, and the type system enforces that line.

## Recipes & examples

Seven typechecked, copy-pasteable call sites in [`examples/`](./examples/src), and four full integrations
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
| [`@tmonier/effract`](./packages/effract) | everything: `rec`, `hook`, `mount` (client **and** server), signals |
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
