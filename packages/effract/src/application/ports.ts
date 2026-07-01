/**
 * Ports the interpreter depends on. Both are capabilities the *infrastructure*
 * supplies — an Effect runtime and React's `use` — so the reconciler itself
 * stays free of any concrete runtime or renderer and can be unit-tested with
 * plain fakes.
 */
import type * as Exit from 'effect/Exit';
import type { AnyEffect, RecPlacement } from '#domain/protocol.ts';

/**
 * Something that can run an Effect. Backed in production by a `ManagedRuntime`
 * built once at the `mount` boundary, which already carries the resolved
 * service environment — so `runSyncExit` resolves services synchronously and
 * only genuinely asynchronous work falls through to `runPromise`.
 */
export interface Executor {
  readonly runSyncExit: (effect: AnyEffect) => Exit.Exit<unknown, unknown>;
  /**
   * Run an effect to a promise. An optional `AbortSignal` interrupts the fiber
   * when it fires (closing scopes, running finalizers) — the seam a query uses
   * to cancel its in-flight request on unmount.
   */
  readonly runPromise: (effect: AnyEffect, signal?: AbortSignal) => Promise<unknown>;
}

/**
 * React's `use`, injected. Given a stable promise it suspends the render until
 * the promise settles, then returns the value (or throws to the nearest error
 * boundary). The interpreter never imports React — it asks for this instead.
 */
export interface Suspender {
  readonly use: <A>(promise: Promise<A>) => A;
}

/** One suspended async slot: the stable promise React's `use` will track. */
interface AsyncSlot {
  readonly promise: Promise<unknown>;
}

/**
 * Per-component-instance cache of suspended async effects, keyed by the order
 * in which they are encountered during a render. Persisted across renders (and
 * across a Suspense retry) by a `useRef` in the React adapter, which gives
 * async effects load-once semantics for the lifetime of the component.
 */
export type RenderCache = Map<number, AsyncSlot>;

/**
 * One cached query, keyed by encounter order. `key` is the value the query was
 * last run with (a change re-runs it); `promise` is the stable promise React's
 * `use` tracks; `controller` interrupts the in-flight fiber when the component
 * unmounts.
 */
interface QuerySlot {
  readonly key: unknown;
  readonly promise: Promise<unknown>;
  readonly controller: AbortController;
}

/**
 * Per-component-instance cache of queries, keyed by encounter order and
 * persisted across renders by a `useRef` in the React adapter. A slot is reused
 * while its `key` is unchanged and rebuilt (its predecessor left to settle)
 * when the key changes — this is what gives queries refetch-on-key semantics.
 */
export type QueryCache = Map<number, QuerySlot>;

/**
 * Turns a child-REC placement into a rendered node. Injected because *how* a
 * child is placed is renderer-specific — on the client it becomes a real React
 * child fiber (`createElement`); the interpreter itself must stay React-free, so
 * it types the child's node as `unknown` and feeds the result straight back into
 * the generator. `place` is a *method* deliberately: its parameter is bivariant,
 * so the concrete renderer can declare the node type it actually produces (e.g.
 * `ReactNode`) without the interpreter — or the renderer — needing a cast.
 */
export interface Placer {
  place(placement: RecPlacement<unknown, unknown, unknown>): unknown;
}

export interface InterpreterDeps {
  readonly executor: Executor;
  readonly suspender: Suspender;
  readonly cache: RenderCache;
  readonly queryCache: QueryCache;
  readonly placer: Placer;
}
