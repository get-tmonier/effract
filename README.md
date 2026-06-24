<p align="center">
  <img src="./assets/wordmark.svg" alt="effract" width="380" />
</p>

<p align="center">
  <strong>Write React components as Effect programs.</strong><br/>
  The same component runs in a SPA, on a Bun/Node server, in a Web Worker, or as a React Server Component.<br/>
  <em>"Server vs client" stops being an architectural fork and becomes an Effect runtime detail.</em>
</p>

<p align="center">
  <a href="#install"><img alt="status" src="https://img.shields.io/badge/status-beta-7c5cff" /></a>
  <img alt="React" src="https://img.shields.io/badge/React-19.2-29d3c2" />
  <img alt="Effect" src="https://img.shields.io/badge/Effect-v4-7c5cff" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-29d3c2" />
</p>

---

```tsx
const Dashboard = component(function* () {
  const stats = yield* Stats; // ← an Effect service, from the runtime
  const [tab, setTab] = yield* hook(useState('overview')); // ← a real React hook
  return <Panel tab={tab} total={stats.total} onTab={setTab} />;
});
```

One body. Two languages — Effect's and React's — flowing through a single stream of `yield*`. The Effect
interpreter runs **inside React's render pass**, so the hook calls are genuine React hooks with a stable
order, and the services come from an Effect `Context` supplied by a `<Runtime>` boundary near the root.
It is 100% real React. There is no forked reconciler.

## The thesis: two fibers, one component

React schedules work on units it calls **fibers**. Effect schedules work on units it also calls **fibers**.
effract is the loom between the two looms.

A **React Effect Component** (REC) is an ordinary React component whose body is a generator. effract drives
that generator *synchronously, during render*, and answers each `yield*` based on what it is:

| You write | effract does |
| --- | --- |
| `yield* SomeService` | resolves it synchronously from the runtime's `Context` |
| `yield* hook(useState(0))` | the hook already ran inline — keeps its place in React's hook order |
| `yield* someAsyncEffect` | suspends through React Suspense / `use`, resumes inline on retry |
| a genuine failure | throws to the nearest React error boundary |

Because the walk is synchronous and deterministic, your hooks stay valid React hooks. effract cooperates
with React's reconciler; it never replaces it.

## The RSC parallel

React Server Components already taught us that a component can run in two very different places and stream
its result across the boundary. effract generalises the idea: the boundary isn't "server vs client" — it's
**which Effect runtime renders the component.**

```tsx
// the SAME body, rendered three ways
<Runtime layer={BrowserLive}><Dashboard /></Runtime>   // SPA
<Runtime layer={ServerLive}><Dashboard /></Runtime>    // Bun / Node streaming SSR
renderToFlightStream(<Dashboard />, { runtime })        // React Server Component (Flight)
```

Provide a browser layer and it's a SPA. Provide a server layer and it streams SSR. Drive it with the Flight
renderer and it's an RSC. The component never changes — only the runtime under it does.

## Install

```sh
pnpm add @tmonier/effract effect react
# for the React Server Components renderer:
pnpm add @tmonier/effract-rsc
```

> Requires **React 19.2+** and **Effect v4**.

```tsx
import { Runtime, component, hook } from '@tmonier/effract';
import { useState } from 'react';

const Counter = component(function* () {
  const stats = yield* Stats;
  const [n, setN] = yield* hook(useState(0));
  return <button onClick={() => setN(n + 1)}>{n} · {stats.total} total</button>;
});

export const App = () => (
  <Runtime layer={AppLive}>
    <Counter />
  </Runtime>
);
```

## Reactivity, without footguns

effract bridges Effect's reactive cell (`AtomRef`) to React with precise, surgical re-renders — and no
stray `Effect.runSync` at the call site.

```tsx
const likes = atom(0);

// re-renders ONLY when an atom it actually read changes
const doubled = observe(($) => $(likes) * 2);

// read + write, the useState shape — backed by Effect
const [n, setN] = useAtom(likes);

// inline, in JSX
<Observe>{($) => <b>{$(likes)}</b>}</Observe>;
```

State can also live *inside a service*, reachable from anywhere an Effect runs — including the server.

## React Server Components

`@tmonier/effract-rsc` drives the same REC bodies on the server and streams standard Flight:

```tsx
import { serverComponent, renderToFlightStream } from '@tmonier/effract-rsc';

const Header = serverComponent(statsBadge); // the same body a client `component` accepts

const stream = renderToFlightStream(<Header />, { runtime }); // → text/x-component
```

It also ships a **Web Worker** variant (`@tmonier/effract-rsc/worker`) that renders Flight off the main
thread and transfers the byte stream back.

## Recipes

Eight self-contained, copy-pasteable call sites in [`examples/`](./examples/src) — typechecked by CI, so
they can't rot:

| | Recipe | Shows |
| --- | --- | --- |
| 01 | [service](./examples/src/01-service.tsx) | read a service with `yield*` |
| 02 | [hooks-and-services](./examples/src/02-hooks-and-services.tsx) | `useState` and a service, interleaved |
| 03 | [async-and-suspense](./examples/src/03-async-and-suspense.tsx) | async effect → Suspense |
| 04 | [signals](./examples/src/04-signals.tsx) | `atom` / `observe` / `useAtom` |
| 05 | [stateful-service](./examples/src/05-stateful-service.tsx) | a REC wired to mutable service state |
| 06 | [layer-composition](./examples/src/06-layer-composition.tsx) | services that depend on services |
| 07 | [resolve-up-front](./examples/src/07-resolve-up-front.tsx) | `view` (the RSC-friendly mode) |
| 08 | [server-component](./examples/src/08-server-component.tsx) | drive a REC as RSC + stream Flight |

## Examples

Four full integrations in [`apps/`](./apps), each rendering the **same shared components**
([`apps/shared`](./apps/shared/src)) to prove the abstraction holds:

| App | Environment | Run |
| --- | --- | --- |
| [`spa-vite`](./apps/spa-vite) | Vite SPA | `just example spa-vite` |
| [`bun-ssr`](./apps/bun-ssr) | Plain Bun streaming SSR + hydration | `just example bun-ssr` |
| [`next-rsc`](./apps/next-rsc) | Next.js App Router (RSC) | `just example next-rsc` |
| [`tanstack-start`](./apps/tanstack-start) | TanStack Start (SSR) | `just example tanstack-start` |

## How it stays 100% React

- The generator body is driven **synchronously inside the render pass** — never on a background fiber — so
  every `hook(...)` is an ordinary React hook with a stable call order.
- Services are resolved with a **synchronous `Context` lookup** from a `ManagedRuntime` built once at the
  `<Runtime>` boundary (the RSC-style "resolve up front near the root").
- Async effects suspend through **React's own `use`**, with a per-instance promise cache so a Suspense
  retry replays deterministically.
- The reconciler is React's. effract is an interpreter that sits inside it, not beside it.

## Packages

| Package | What it is |
| --- | --- |
| [`@tmonier/effract`](./packages/effract) | the core: `component`, `view`, `hook`, `<Runtime>`, signals |
| [`@tmonier/effract-rsc`](./packages/effract-rsc) | Flight server renderer + Web Worker variant |
| [`@tmonier/effract-vite`](./packages/effract-vite) | a one-import Vite plugin |

Each package is layered hexagonally — `domain` (pure protocol) → `application` (the React-free interpreter)
→ `infrastructure` (the React binding) — enforced by dependency-cruiser. The interpreter takes React's
capabilities through a port, so the whole fiber bridge is unit-tested with no renderer at all.

## Design

The fiber-reconciliation design and its tradeoffs are written up as an architecture decision record:
[**ADR 0001 — Fiber reconciliation**](./docs/adr/0001-fiber-reconciliation.md).

## Development

```sh
just install    # pnpm install
just verify     # lint + format + typecheck + boundaries + knip + test
just example bun-ssr
```

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Tmonier
