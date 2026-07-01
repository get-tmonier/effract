# ADR 0001 — Fiber reconciliation

- **Status:** Accepted
- **Date:** 2026-06-24
- **Context:** the core design of effract — how an Effect program becomes a React component.

## Context

React and Effect are both fiber schedulers. React renders a tree by walking fibers; Effect runs a program
by interpreting a fiber. effract's premise is that a single component body can be written as an Effect
program and rendered by React — that "where it runs" (SPA, SSR, RSC) is a property of the Effect
runtime, not of the component.

The hard requirement is **stay 100% real React**. We must not fork the reconciler, ship a custom renderer,
or break the Rules of Hooks. A React Effect Component (REC) has to be an ordinary React component that
React can render, suspend, memoize, hydrate, and reconcile like any other.

The naïve approach — make the body an `Effect.gen` and run it — fails immediately: `Effect.gen` executes on
an Effect fiber, asynchronously, *outside* React's render pass. Any React hook called there would violate
the Rules of Hooks (wrong fiber, unstable order). So the body cannot be a real Effect.

## Decision

A REC body is a **plain generator**, not an `Effect`. effract supplies its own interpreter that drives the
generator **synchronously, inside React's render pass**, and answers each `yield*` by inspecting the
instruction:

1. **A lifted hook** — `yield* hook(useState(0))`. The hook is called *inline* while evaluating the yield
   expression; `hook(...)` only lifts the already-computed value into the yield channel. Because the
   interpreter steps the generator top-to-bottom on every render, these calls keep a stable order and
   remain genuine React hooks.
2. **A service tag / synchronous effect** — `yield* Stats`. Resolved with `ManagedRuntime.runSyncExit`
   against the runtime built once at the `<Runtime>` boundary. A service read is a synchronous `Context`
   lookup.
3. **An asynchronous effect** — detected when `runSyncExit` returns a failure whose squashed cause is an
   `AsyncFiberError`. effract runs the effect as a promise, caches it per component instance by encounter
   order, and calls **React's `use`** to suspend. The Suspense retry re-runs the generator from the top and
   hits the cache, returning the value inline.
4. **A genuine failure** — any other failed exit is rethrown, surfacing at the nearest React error boundary.

The interpreter lives in the `application` layer and is **React-free**: it takes React's `use` and the
Effect executor through ports, so the entire fiber bridge is unit-tested with plain fakes and no renderer.
The `infrastructure` layer is the thin React adapter (`rec`, `<Runtime>`, the client/server `mount`,
the signals bridge).

Two boundary modes are supported:

- **Hook-capable RECs** (`rec`) — the headline: the in-render interpreter above.
- **Resolve-up-front** (any hook-free `rec`, e.g. driven by the server `mount`) — a body that reads only
  services, no hooks, resolved once. On the server it is simply an `async` component that awaits its
  yields; this is the RSC-friendly path.

The yield protocol is the same one Effect's own `Effect.gen` uses (single-shot iterables), so `yield* Tag`
and `yield* hook(x)` both work and `E`/`R` are recovered by the same conditional-type inference.

## Consequences

### Good

- **It is real React.** Hooks keep their order; Suspense, error boundaries, memoization, hydration, and
  concurrent features all work, because effract renders through React rather than around it.
- **One component, one `mount`, every runtime.** The same body renders in a SPA, in streaming SSR, and
  (resolve-up-front) as an RSC — via the same `mount(layer, Root)`, whose client/server implementation the
  bundler's `react-server` condition selects. "Server vs client" is never something you type.
- **Services are synchronous at the call site.** Resolution is a `Context` lookup, so `yield* Stats` has no
  async cost and no `Effect.runSync` footgun leaks to users.
- **Testable core.** The interpreter is pure and renderer-agnostic; the bridge is verified without a DOM.

### Costs and tradeoffs

- **Determinism is the contract.** Like all React components, a REC body must yield hooks in a stable order
  across renders. effract does not (and cannot) lift that constraint; it inherits it.
- **`'use client'` on the client modules.** The interpreter and signals bridge use client-only React APIs
  (`use`, `useRef`, `useSyncExternalStore`), so those modules are marked `'use client'`. Server-only REC
  bodies are kept in modules free of client imports so they can also be driven as RSCs.
- **Async caching is load-once by position.** Raw `yield* asyncEffect` caches per component instance by
  encounter order — correct for load-on-mount, but it does not auto-refetch when inputs change. For
  reactive/refetching data, use the signals bridge (`observe` / atoms) or a service that manages its own
  caching. This is a deliberate v0.1 boundary, documented at the call site.
- **One controlled `runSyncExit`-then-detect step.** Distinguishing sync from async relies on Effect's
  `AsyncFiberError` sentinel via `Cause.squash`. It is a small, well-contained dependency on Effect's
  runtime semantics rather than a public contract.

## Alternatives considered

- **Body as `Effect.gen`, run on an Effect fiber.** Rejected: hooks would run off React's fiber and violate
  the Rules of Hooks.
- **A custom React reconciler / renderer.** Rejected: it would no longer be "real React" and would forfeit
  Suspense, RSC, hydration, and the ecosystem.
- **Resolve everything up front, no in-render hooks.** Kept as the *secondary* mode (any hook-free `rec`,
  e.g. on the server `mount`) because it is perfect for RSC, but it cannot express stateful client
  components — which is the headline. So it complements, rather than replaces, the interpreter.
