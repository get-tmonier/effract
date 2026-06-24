# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/get-tmonier/effract/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/get-tmonier/effract/releases/tag/v0.2.0
[0.1.0]: https://github.com/get-tmonier/effract/releases/tag/v0.1.0
