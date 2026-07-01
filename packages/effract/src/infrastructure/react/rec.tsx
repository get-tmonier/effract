'use client';

/**
 * The client binding for React Effect Components: it turns a (runtime-agnostic)
 * REC descriptor into a real React component whose body effract interprets
 * *inside* React's render pass, and provides `mount`, the boundary that supplies
 * the browser runtime.
 *
 *   const Dashboard = rec(function* () {
 *     const stats = yield* Stats;                  // a service
 *     const [n, setN] = yield* hook(useState(0));   // a real React hook
 *     return <main>{yield* StatBadge}{n}</main>;    // a child REC, yielded
 *   });
 *
 *   mount(AppLive, Dashboard);  // ← compile error if AppLive lacks a needed service
 *
 * The descriptor itself (`rec`) lives in `../rec-core.tsx` and is
 * server-safe; this module adds only the client half — the in-render
 * interpreter and hook dispatch — so the same `rec(...)` value also `serve`s on
 * the server. At runtime a REC renders as an ordinary React component (own
 * fiber, hooks, reconciliation); the yield is only how it is placed and how `R`
 * flows.
 */
import {
  createElement,
  use,
  useRef,
  type FunctionComponent,
  type ReactElement,
  type ReactNode,
} from 'react';
import type * as Layer from 'effect/Layer';
import { driveRecCaught } from '#application/interpreter.ts';
import type { Placer, RenderCache, Suspender } from '#application/ports.ts';
import type { RecHandle, RecPlacement } from '#domain/protocol.ts';
import type { Effective, MissingServices, REC } from '#infrastructure/rec-core.tsx';
import { Runtime, useExecutor } from '#infrastructure/react/runtime.tsx';

const useSuspender = (): Suspender => ({ use });

const useRenderCache = (): RenderCache => {
  const ref = useRef<RenderCache | null>(null);
  if (ref.current === null) {
    ref.current = new Map();
  }
  return ref.current;
};

/**
 * One React component per descriptor identity, cached so a yield-composed child
 * keeps a stable React type across the parent's re-renders (React would
 * otherwise remount it every render). The component interprets the descriptor's
 * body in-render, resolving services, hooks, and nested placements.
 */
const fcCache = new WeakMap<RecHandle<ReactNode>, FunctionComponent<object>>();

const clientFcFor = (handle: RecHandle<ReactNode>): FunctionComponent<object> => {
  const cached = fcCache.get(handle);
  if (cached !== undefined) {
    return cached;
  }
  const fc: FunctionComponent<object> = (props) => {
    const executor = useExecutor();
    const suspender = useSuspender();
    const cache = useRenderCache();
    return driveRecCaught(
      handle.body(props),
      { executor, suspender, cache, placer: clientPlacer },
      handle.catchHandlers,
    );
  };
  Object.defineProperty(fc, 'name', { value: handle.displayName });
  fcCache.set(handle, fc);
  return fc;
};

/**
 * Places a child REC as a real React child element under the same runtime. The
 * `place` method's parameter is bivariant (see {@link Placer}), so it names the
 * ReactNode-bodied child it renders here — the interpreter still hands it the
 * erased placement, and no cast is needed on either side.
 */
const clientPlacer: Placer = {
  place: (placement: RecPlacement<ReactNode, unknown>): ReactElement =>
    createElement(clientFcFor(placement.rec), placement.props),
};

/**
 * Mount a root REC under an Effect runtime — the **client** implementation of
 * `mount`, selected everywhere except a React Server Component graph (where the
 * sibling `../server/mount.ts` is chosen by the `react-server` condition). It is
 * the boundary between effract and React: returns an ordinary React node and, at
 * compile time, verifies that `layer` provides every service the REC's tree
 * requires — the check lives on the `rec` argument, so there is no cast on the
 * result.
 *
 * ```tsx
 * createRoot(el).render(mount(AppLive, Dashboard));
 * ```
 *
 * You import `mount` from `@tmonier/effract` in every file; where the module
 * runs decides whether it renders interactively (here) or on the server.
 */
export function mount<ROut, LE, RE, R>(
  layer: Layer.Layer<ROut, LE, never>,
  rec: REC<Record<never, never>, RE, R> &
    ([Effective<R>] extends [ROut] ? unknown : MissingServices<Exclude<Effective<R>, ROut>>),
): ReactNode {
  const root = createElement(clientFcFor(rec as unknown as RecHandle<ReactNode>), {});
  return createElement(Runtime<ROut, LE>, { layer }, root);
}
