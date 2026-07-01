# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

**The public API is now three primitives — `rec`, `hook`, `mount`** (plus optional signals). One
import, one boundary. `mount(layer, Root)` from `@tmonier/effract` renders on the client **and** the
server; the client/server split becomes an implementation detail the bundler resolves, not something you
type. This release has breaking changes — a `0.3.0`-worthy consolidation.

### Changed

- **`mount` renders on the server, too.** `@tmonier/effract` ships two conditional entries: the
  `react-server` export condition selects a server `mount` (drives the REC against an Effect runtime,
  returns an async React Server Component, no client JS), and the `default` condition selects the client
  `mount`. Same import, same signature, the same compile-time check that the layer provides the tree's
  services — you never choose client vs server. Move a component between them by moving which file
  `mount`s it; the component and the call are identical.
- A `rec(...)` value is now **server-safe**: a service-only REC is a single value the same `mount`
  renders on the client and on the server — no separate "body" or server form to keep in sync. Child
  placement (`yield* Child`) is a first-class yield the renderer resolves, so the descriptor never bakes
  in a client component, and a universal REC composed of universal RECs drives its children inline on the
  server (no client JS).
- **The hook rule is enforced at build time.** `hook`, `observe`, and `atom` are no longer exported from
  the server entry (they are client-only). Reaching for one in a Server Component is now a hard compile
  error (_"`hook` is not exported from `@tmonier/effract`"_), because that module resolves the
  `react-server` entry where those APIs do not exist — not a runtime surprise.

### Removed

- **Breaking: the `@tmonier/effract-rsc` package.** Its server rendering folded into `@tmonier/effract`
  as the `react-server` `mount`. `serve`, `serverComponent`, `serverView`, `provideRuntime`,
  `currentRuntime`, and the `AsyncLocalStorage` runtime scope are all gone — `mount` replaces them.
- **Breaking: the Flight/Web-Worker renderer** (`renderToFlightStream`, `serveFlight`, …) and its
  `react-server-dom-webpack` peer dependency. The common RSC path (Next.js, TanStack Start) needs none of
  it — the framework owns the Flight wire and `mount` just produces a node. `@tmonier/effract`'s only
  peers are now `react` and `effect`. `driveServerRec` remains (server entry) as the low-level driver for
  a fully custom pipeline or a per-request runtime.
- **Breaking: `view`.** It was pure sugar over `rec` (a single-yield body). Use `rec` — a hook-free
  `rec` is the resolve-up-front / RSC-friendly shape. This keeps the public surface to three primitives.

### Migration

- `import … from '@tmonier/effract-rsc'` → `import { mount } from '@tmonier/effract'`.
- `serve(layer, Root)` / `serverComponent(body)` → `mount(layer, Root)` (a REC; `export default` it or
  place it as `<Root />`).
- `view(effect)` → `rec(function* () { return yield* effect })`.
- Remove `@tmonier/effract-rsc` and `react-server-dom-webpack` from your dependencies.

## [0.2.1] — 2026-06-25

### Changed

- Widen peer ranges so a host's slightly different version is reused instead of duplicated: `react` is now
  `^19.0.0` (React 19+) and `effect` `>=4.0.0-beta.88 <5.0.0`. React and Effect remain externalized peers —
  never bundled — so they are never shipped twice in your app.

## [0.2.0] — 2026-06-24

The component model, redesigned around compile-time dependency safety — plus the documentation site.

### Changed

- **Breaking:** `component(...)` is now `rec(...)`, and a React Effect Component (REC) is **not** a JSX
  element — `<Dashboard />` is a compile error. Place a REC by yielding it: `{yield* Counter}`, or
  `{yield* Greet.with({ ... })}` for props. This is what lets a component's Effect requirements flow up the
  tree to the runtime boundary.
- **Breaking:** `<Runtime>` gives way to `mount(layer, Root)` as the canonical boundary. `mount` returns a
  `ReactNode` and verifies **at compile time** that the layer provides every service the tree needs — a
  missing one is a type error that names it. (`Runtime` remains the low-level provider `mount` wraps.)
- The RSC hook-rejection error now points at `rec(...)`.

### Added

- Incremental adoption: plain React components stay ordinary `<Component />` JSX; you write a REC only where a
  component reaches for a service or a hook. The two compose freely: `<Card>{yield* Counter}</Card>`.
- Documentation site — [effract.tmonier.com](https://effract.tmonier.com): the guide, integrated docs, and
  the eight call-site recipes.

## [0.1.0] — 2026-06-24

The first public scaffold of effract — React components written as Effect programs.

### Added

- **`@tmonier/effract`** — the core.
  - `component(function* () { ... })`: hook-capable React Effect Components. The body yields both Effect
    services and React hooks (`hook(useState(...))`), interpreted inside React's render pass.
  - `view(effect)`: the resolve-up-front mode, for pure-Effect components.
  - `<Runtime layer={...}>`: builds a `ManagedRuntime` once and provides it to the subtree.
  - Signals bridge: `atom`, `observe`, `<Observe>`, `useAtom`, `useAtomValue`, `useAtomSet` — precise,
    surgical re-renders over Effect `AtomRef`s.
  - Async effects suspend through React's `use`.
- **`@tmonier/effract-rsc`** — drive REC bodies as React Server Components.
  - `serverComponent`, `serverView`, `driveServerRec` (also at `/driver`).
  - `renderToFlightStream`: stream standard Flight behind an Effect runtime.
  - `/worker`: a Web Worker variant (`serveFlight`, `flightFromWorker`).
- **`@tmonier/effract-vite`** — a one-import Vite plugin (React Fast Refresh + Effect/React de-duplication).
- **Examples** — four integrations rendering the same shared components: a Vite SPA, plain Bun streaming
  SSR, Next.js App Router (RSC), and TanStack Start.
- **Recipes** — eight typechecked, copy-pasteable call sites under `examples/`.
- **ADR 0001** — the fiber-reconciliation design and its tradeoffs.

[Unreleased]: https://github.com/get-tmonier/effract/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/get-tmonier/effract/releases/tag/v0.2.1
[0.2.0]: https://github.com/get-tmonier/effract/releases/tag/v0.2.0
[0.1.0]: https://github.com/get-tmonier/effract/releases/tag/v0.1.0
