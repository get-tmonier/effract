/**
 * Ports the interpreter depends on. Both are capabilities the *infrastructure*
 * supplies — an Effect runtime and React's `use` — so the reconciler itself
 * stays free of any concrete runtime or renderer and can be unit-tested with
 * plain fakes.
 */
import type * as Exit from 'effect/Exit';
import type { AnyEffect } from '#domain/protocol.ts';

/**
 * Something that can run an Effect. Backed in production by a `ManagedRuntime`
 * built once at the `<Runtime>` boundary, which already carries the resolved
 * service environment — so `runSyncExit` resolves services synchronously and
 * only genuinely asynchronous work falls through to `runPromise`.
 */
export interface Executor {
  readonly runSyncExit: (effect: AnyEffect) => Exit.Exit<unknown, unknown>;
  readonly runPromise: (effect: AnyEffect) => Promise<unknown>;
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

export interface InterpreterDeps {
  readonly executor: Executor;
  readonly suspender: Suspender;
  readonly cache: RenderCache;
}
