/**
 * Server components cannot use React context, so the Effect runtime reaches
 * them another way: an `AsyncLocalStorage` scope set for the duration of a
 * render. Because async server components await within that scope, the runtime
 * propagates to every component in the tree without a single hook.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type * as ManagedRuntime from 'effect/ManagedRuntime';

/**
 * A self-contained runtime: every service the tree needs is already provided.
 * Typed with `never` requirements so any concrete app runtime (which provides
 * *some* services) is assignable here — the requirement channel is contravariant.
 */
export type ServerRuntime = ManagedRuntime.ManagedRuntime<never, unknown>;

const storage = new AsyncLocalStorage<ServerRuntime>();

/** Run a render (sync kickoff + its async continuations) with `runtime` in scope. */
export const provideRuntime = <A>(runtime: ServerRuntime, render: () => A): A =>
  storage.run(runtime, render);

/** The runtime in scope, or a clear error if rendering outside a boundary. */
export const currentRuntime = (): ServerRuntime => {
  const runtime = storage.getStore();
  if (runtime === undefined) {
    throw new Error(
      'effract-rsc: no Effect runtime in scope. Render inside `renderToFlightStream(node, { runtime })` ' +
        'or wrap the render in `provideRuntime(runtime, () => ...)`.',
    );
  }
  return runtime;
};
