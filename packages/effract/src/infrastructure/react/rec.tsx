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
  Suspense,
  createElement,
  use,
  useContext,
  useEffect,
  useRef,
  type FunctionComponent,
  type ReactElement,
  type ReactNode,
} from 'react';
import type * as Layer from 'effect/Layer';
import { driveRec, driveState } from '#application/interpreter.ts';
import type { Placer, Reader, RenderCache, Suspender } from '#application/ports.ts';
import type { CatchDispatch, RecHandle, RecPlacement } from '#domain/protocol.ts';
import { ReadSink, withCatch } from '#infrastructure/react/catch-boundary.tsx';
import { atomReader } from '#infrastructure/react/reactivity.tsx';
import {
  makeSuspensableResolver,
  nextInstanceId,
  reconcileClaims,
  releaseClaims,
  scopeOf,
} from '#infrastructure/react/suspensable-store.ts';
import type {
  Effective,
  LoadingNotHandled,
  MissingServices,
  REC,
} from '#infrastructure/rec-core.tsx';
import { Runtime, useExecutor } from '#infrastructure/react/runtime.tsx';

/** A thenable — how React's `use` signals a suspension. Never a typed failure. */
const isThenable = (u: unknown): u is PromiseLike<unknown> =>
  typeof u === 'object' && u !== null && typeof (u as { then?: unknown }).then === 'function';

/** The `_tag` of a tagged error, if this thrown value looks like one. */
const errorTag = (error: unknown): string | undefined =>
  typeof error === 'object' &&
  error !== null &&
  typeof (error as { readonly _tag?: unknown })._tag === 'string'
    ? (error as { readonly _tag: string })._tag
    : undefined;

const useSuspender = (): Suspender => ({ use });

const useRenderCache = (): RenderCache => {
  const ref = useRef<RenderCache | null>(null);
  if (ref.current === null) {
    ref.current = new Map();
  }
  return ref.current;
};

const useInstanceId = (): string => {
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    ref.current = nextInstanceId();
  }
  return ref.current;
};

/**
 * Keep this instance's query claims in sync with the store. Two effects,
 * unconditional so hook order is stable whether or not the body suspends:
 *
 *   - reconcile on every commit — claim the keys this render used, release ones
 *     it stopped using (how refetch-on-key drops the superseded query);
 *   - release everything on a *true* unmount — deferred a microtask and cancelled
 *     if the effect is set up again first, so a StrictMode/offscreen remount does
 *     not interrupt live queries.
 *
 * `usedRef` holds the cache keys of the last *committed* render; a suspending
 * render never reaches the assignment, and its effects never run.
 */
const useQueryClaims = (instanceId: string, usedRef: { current: ReadonlySet<string> }): void => {
  useEffect(() => {
    reconcileClaims(instanceId, usedRef.current);
  });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      queueMicrotask(() => {
        if (!alive.current) {
          releaseClaims(instanceId);
        }
      });
    };
  }, [instanceId]);
};

/**
 * One React component per descriptor identity, cached so a yield-composed child
 * keeps a stable React type across the parent's re-renders (React would
 * otherwise remount it every render). The component interprets the descriptor's
 * body in-render, resolving services, hooks, queries, and nested placements.
 */
const fcCache = new WeakMap<RecHandle<ReactNode>, FunctionComponent<object>>();

const clientFcFor = (handle: RecHandle<ReactNode>): FunctionComponent<object> => {
  const cached = fcCache.get(handle);
  if (cached !== undefined) {
    return cached;
  }
  const scope = scopeOf(handle);
  const fc: FunctionComponent<object> = (props) => {
    const executor = useExecutor();
    const suspender = useSuspender();
    const cache = useRenderCache();
    const instanceId = useInstanceId();
    const usedRef = useRef<ReadonlySet<string>>(EMPTY_USED);
    useQueryClaims(instanceId, usedRef);
    // When inside a `.catch`, record each atom this body reads so the boundary can
    // watch them for a reset. Reads still go through `atomReader` (per-atom
    // `useSyncExternalStore`, tearing-safe); recording is a side note.
    const sink = useContext(ReadSink);
    const reader: Reader =
      sink === null
        ? atomReader
        : {
            read: (atom) => {
              sink.add(atom);
              return atomReader.read(atom);
            },
          };
    // The hook count of this instance's last *committed* render, so a caught
    // failure can tell whether it skipped later hooks.
    const lastHooks = useRef(-1);

    const used = new Set<string>();
    const resolver = makeSuspensableResolver(scope, executor, suspender, used);
    const deps = {
      executor,
      suspender,
      cache,
      suspensableResolver: resolver,
      reader,
      placer: clientPlacer,
    };
    const state = driveState();
    let node: ReactNode;
    try {
      node = driveRec(handle.body(props), deps, state);
      // Committing render (no suspension) — remember its hook count.
      lastHooks.current = state.hooks;
    } catch (thrown) {
      const tag = errorTag(thrown);
      const handler =
        handle.catchHandlers !== undefined && tag !== undefined
          ? handle.catchHandlers[tag]
          : undefined;
      // Not ours to catch inline — let it propagate: a suspension (to `<Suspense>`),
      // a REC without a matching `.catch`, or a defect (to the nearest boundary).
      // Also re-throw a caught failure that skipped later hooks (fewer than the
      // last committed render): rendering the fallback inline would break the Rules
      // of Hooks, so the `.catch` error boundary handles it instead (same fallback,
      // and it recovers when a read atom changes). See `catch-boundary.tsx`.
      if (handler === undefined || isThenable(thrown) || state.hooks < lastHooks.current) {
        throw thrown;
      }
      node = handler(thrown);
      lastHooks.current = state.hooks; // the fallback committed too
    }
    // Reached only when the body did not suspend, i.e. this render will commit —
    // so the claim effects always reconcile against a real, complete used set.
    usedRef.current = used;
    return node;
  };
  Object.defineProperty(fc, 'name', { value: handle.displayName });
  fcCache.set(handle, fc);
  return fc;
};

const EMPTY_USED: ReadonlySet<string> = new Set();

/**
 * Places a child REC as a real React child element under the same runtime. The
 * `place` method's parameter is bivariant (see {@link Placer}), so it names the
 * ReactNode-bodied child it renders here — the interpreter still hands it the
 * erased placement, and no cast is needed on either side. A child that declared
 * a loading fallback with `.suspense(...)` is wrapped in a real `<Suspense>`, so
 * its queries' pending state renders that fallback.
 */
const clientPlacer: Placer = {
  place: (placement: RecPlacement<ReactNode, unknown, unknown>): ReactElement => {
    const element = createElement(clientFcFor(placement.rec), placement.props);
    const handlers = placement.rec.catchHandlers as CatchDispatch<ReactNode> | undefined;
    const caught = handlers === undefined ? element : withCatch(handlers, element);
    const fallback = placement.rec.suspenseFallback;
    // Suspense outside the catch boundary: a pending query suspends to the
    // fallback here; a *failed* one throws to the catch boundary just inside.
    return fallback === undefined ? caught : createElement(Suspense, { fallback }, caught);
  },
};

/** Options for the client `mount`. `loading` discharges the tree's loading obligation. */
export interface MountOptions {
  readonly loading?: ReactNode;
}

/**
 * Mount a root REC under an Effect runtime — the **client** implementation of
 * `mount`, selected everywhere except a React Server Component graph (where the
 * sibling `../server/mount.ts` is chosen by the `react-server` condition). It is
 * the boundary between effract and React: returns an ordinary React node and, at
 * compile time, verifies that `layer` provides every service the REC's tree
 * requires *and* that the tree's loading obligation is discharged — either by a
 * `.suspense(...)` somewhere in it, or by passing `{ loading }` here. Both checks
 * live on the arguments, so there is no cast on the result.
 *
 * ```tsx
 * createRoot(el).render(mount(AppLive, Dashboard.suspense(<Spinner />)));
 * // or
 * createRoot(el).render(mount(AppLive, Dashboard, { loading: <Spinner /> }));
 * ```
 *
 * You import `mount` from `@tmonier/effract` in every file; where the module
 * runs decides whether it renders interactively (here) or on the server.
 */
export function mount<ROut, LE, RE, R, S>(
  layer: Layer.Layer<ROut, LE, never>,
  rec: REC<Record<never, never>, RE, R, S> &
    ([Effective<R>] extends [ROut] ? unknown : MissingServices<Exclude<Effective<R>, ROut>>) &
    ([S] extends [never] ? unknown : LoadingNotHandled),
): ReactNode;
export function mount<ROut, LE, RE, R, S>(
  layer: Layer.Layer<ROut, LE, never>,
  rec: REC<Record<never, never>, RE, R, S> &
    ([Effective<R>] extends [ROut] ? unknown : MissingServices<Exclude<Effective<R>, ROut>>),
  options: { readonly loading: ReactNode },
): ReactNode;
export function mount<ROut, LE, RE, R, S>(
  layer: Layer.Layer<ROut, LE, never>,
  rec: REC<Record<never, never>, RE, R, S>,
  options?: MountOptions,
): ReactNode {
  const handle = rec as unknown as RecHandle<ReactNode>;
  const fallback = handle.suspenseFallback ?? options?.loading;
  const inner = createElement(clientFcFor(handle), {});
  const handlers = handle.catchHandlers as CatchDispatch<ReactNode> | undefined;
  const caught = handlers === undefined ? inner : withCatch(handlers, inner);
  const root = fallback === undefined ? caught : createElement(Suspense, { fallback }, caught);
  return createElement(Runtime<ROut, LE>, { layer }, root);
}
