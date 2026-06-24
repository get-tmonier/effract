'use client';

/**
 * The runtime provider that `mount` wraps your tree in. It builds an Effect
 * `ManagedRuntime` once from a `Layer` and hands it down through React context,
 * where every effract component reads it. This is the seam where "server vs
 * client" lives: provide a browser layer and the same components run in a SPA;
 * provide a server layer and they run under Node, Bun, or a Web Worker — the
 * components never change. Use `mount(layer, Root)`; `Runtime` is the low-level
 * provider underneath it.
 *
 * Services are resolved up-front into the runtime's context (the RSC-style
 * "resolve near the root" mode), so reading a service inside a component is a
 * synchronous context lookup, not an async round-trip.
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type { Executor } from '#application/ports.ts';

type AnyManagedRuntime = ManagedRuntime.ManagedRuntime<unknown, unknown>;

interface RuntimeContextValue {
  readonly executor: Executor;
  readonly runtime: AnyManagedRuntime;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

const executorFromRuntime = (runtime: AnyManagedRuntime): Executor => ({
  runSyncExit: (effect) => runtime.runSyncExit(effect),
  runPromise: (effect) => runtime.runPromise(effect),
});

export interface RuntimeProps<ROut, E> {
  /** A self-contained layer (no open requirements) providing the subtree's services. */
  readonly layer: Layer.Layer<ROut, E, never>;
  readonly children?: ReactNode;
}

/**
 * Provide an Effect runtime to a React subtree. Prefer `mount(layer, Root)`,
 * which wraps the root REC in this provider and checks the tree's services at
 * compile time. Reach for `Runtime` directly only to wrap non-REC React trees.
 */
export function Runtime<ROut, E>({ layer, children }: RuntimeProps<ROut, E>): ReactNode {
  // Build the runtime exactly once for this boundary instance.
  const runtimeRef = useRef<AnyManagedRuntime | null>(null);
  if (runtimeRef.current === null) {
    runtimeRef.current = ManagedRuntime.make(layer) as AnyManagedRuntime;
  }
  const runtime = runtimeRef.current;

  const value = useMemo<RuntimeContextValue>(
    () => ({ executor: executorFromRuntime(runtime), runtime }),
    [runtime],
  );

  // Tear the runtime down (close scopes, finalize layers) when the boundary unmounts.
  useEffect(() => () => void runtime.dispose(), [runtime]);

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

const useRuntimeContext = (): RuntimeContextValue => {
  const value = useContext(RuntimeContext);
  if (value === null) {
    throw new Error(
      'effract: no runtime found above this component. Mount your root with mount(layer, Root).',
    );
  }
  return value;
};

/** Internal: the executor the interpreter runs effects through. */
export const useExecutor = (): Executor => useRuntimeContext().executor;

/** Escape hatch: the underlying `ManagedRuntime`, for imperative `runPromise`/`runFork`. */
export const useEffractRuntime = (): AnyManagedRuntime => useRuntimeContext().runtime;
