/**
 * `mount` — the *server* implementation, selected automatically in a React
 * Server Component graph via the package's `react-server` export condition.
 *
 * It is the exact twin of the client `mount` (see `../react/rec.tsx`): same
 * name, same arguments, the same compile-time check that `layer` provides every
 * service the tree needs. The difference is invisible to you — the bundler hands
 * server components this version, which drives the REC against an Effect runtime
 * and returns an *async React Server Component* (no hooks, no client JS). You
 * import `mount` from `@tmonier/effract` in every file; where it runs decides
 * which implementation you get.
 *
 * ```tsx
 * // app/page.tsx — a React Server Component
 * const Page = rec(function* () {
 *   return <main>{yield* StatsBadge}</main>; // resolved on the server
 * });
 * export default mount(AppLive, Page);        // same call as on the client
 * ```
 */
import type { ReactNode } from 'react';
import type * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { driveServerRec } from '#application/server-driver.ts';
import type { Effective, MissingServices, REC } from '#infrastructure/rec-core.tsx';

/**
 * A self-contained runtime: every service the tree needs is already provided.
 * Typed with `never` requirements so any concrete app runtime (which provides
 * *some* services) is assignable — the requirement channel is contravariant.
 */
type ServerRuntime = ManagedRuntime.ManagedRuntime<never, unknown>;

/**
 * One runtime per layer identity — the server analogue of the client `mount`'s
 * per-boundary runtime. A concrete `ManagedRuntime<ROut, E>` widens to
 * `ServerRuntime` (requirements are contravariant), so building it needs no cast.
 */
const runtimes = new WeakMap<object, ServerRuntime>();

const runtimeFor = <ROut, E>(layer: Layer.Layer<ROut, E, never>): ServerRuntime => {
  const existing = runtimes.get(layer);
  if (existing !== undefined) {
    return existing;
  }
  const runtime = ManagedRuntime.make(layer);
  runtimes.set(layer, runtime);
  return runtime;
};

/**
 * Mount a root REC as an async React Server Component under an Effect runtime.
 * Returns a component you export or place (`export default mount(AppLive, Page)`
 * / `<Page />`). Verifies at compile time that `layer` provides every service the
 * tree requires — the check lives on the `rec` argument, so there is no cast at
 * the call site. Hook-bearing bodies reject at render (a hook is a client concept
 * RSC forbids); those RECs are client islands and render wherever the browser is.
 */
export function mount<ROut, E, R>(
  layer: Layer.Layer<ROut, E, never>,
  rec: REC<Record<never, never>, R> &
    ([Effective<R>] extends [ROut] ? unknown : MissingServices<Exclude<Effective<R>, ROut>>),
): () => Promise<ReactNode> {
  const Root = (): Promise<ReactNode> => {
    const runtime = runtimeFor(layer);
    // The generator walk erases each yield to `AnyEffect`, but `mount`'s
    // signature has already proven `layer` provides the tree's services. Coercing
    // the erased effect to what this runtime accepts is the one Effect-boundary
    // step — and it lives here, once, not at any call site.
    return driveServerRec(rec.body({}), (effect) =>
      runtime.runPromise(effect as Parameters<typeof runtime.runPromise>[0]),
    );
  };
  Object.defineProperty(Root, 'name', { value: rec.displayName });
  return Root;
}
