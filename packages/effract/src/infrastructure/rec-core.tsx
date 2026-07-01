/**
 * The React Effect Component *descriptor* — the server-safe half of a REC.
 *
 * This module deliberately carries no `'use client'` and imports no React
 * hooks, no interpreter, and no runtime provider. A `rec(...)` value is pure
 * data: the component's body plus a stable identity. That is what lets a single
 * declaration be shared across runtimes — the same descriptor is turned into a
 * live client fiber by the client `mount` (see `./react/rec.tsx`) and driven on
 * the server by the server `mount` (see `./server/mount.ts`, selected by the
 * `react-server` export condition). Neither the body nor the descriptor is
 * client-only; only the *client interpreter* is.
 *
 * A REC is still **not** a React element type — `<Rec />` is a compile error by
 * design. You compose RECs the way you compose Effects: with `yield*`, which is
 * how a child's Effect requirements (`R`) and loading obligation (`S`) bubble up
 * the tree to the one place that knows the runtime (`mount`), where they are
 * verified at compile time.
 */
import type { ReactNode } from 'react';
import {
  placement,
  type AnyEffect,
  type CatchDispatch,
  type ErrorsOf,
  type Hook,
  type ReadableAtom,
  type RecBody,
  type RecHandle,
  type RecPlacement,
  type RequirementsOf,
  type Suspensable,
  type SuspendsOf,
} from '#domain/protocol.ts';

/** Brand identifying a React Effect Component. */
export const RecTypeId: unique symbol = Symbol.for('@tmonier/effract/Rec');
export type RecTypeId = typeof RecTypeId;

/** A tagged error — the shape `.catch` dispatches on (`Data.TaggedError`, …). */
type Tagged = { readonly _tag: string };

/** The non-tagged remainder of an error channel — errors `.catch` cannot name. */
type UntaggedErrors<E> = Exclude<E, Tagged>;

/**
 * The exhaustive handler map for a REC's error channel: one fallback per error
 * `_tag`, each receiving exactly that error. Omitting a tag the body can fail
 * with is a compile error (a missing property); an unknown tag is rejected as an
 * excess property. A REC that cannot fail with a tagged error takes `{}`.
 */
export type CatchHandlers<E, A = ReactNode> = {
  readonly [Tag in Extract<E, Tagged>['_tag']]: (error: Extract<E, { readonly _tag: Tag }>) => A;
};

/** Any yieldable a REC body may produce — the constraint `rec` infers `Eff` against. */
type AnyYield =
  | AnyEffect
  | Hook<unknown>
  | RecPlacement<ReactNode, unknown, unknown>
  | Suspensable<unknown, unknown, unknown>
  | ReadableAtom<unknown>;

interface RecCore<P, E, R, S> extends RecHandle<ReactNode> {
  readonly [RecTypeId]: true;
  /** Place this REC with props: `yield* Child.with({ ... })`. */
  with(props: P): RecPlacement<ReactNode, R, S>;
  /**
   * Render a typed fallback for each error this REC's body can fail with. The
   * handler map is exhaustive over the error channel `E` and checked at compile
   * time, so you cannot forget a tag or invent one. Each failure — synchronous
   * or async — renders its mapped node in place of the component; defects and
   * any non-tagged errors are left to the nearest React error boundary.
   *
   * ```tsx
   * const Profile = rec(function* () {
   *   const user = yield* query(fetchUser(id), id); // E = NotFound | Unauthorized
   *   return <Card user={user} />;
   * }).catch({
   *   NotFound: () => <Empty />,
   *   Unauthorized: () => <Login />,
   * });
   * ```
   *
   * Returns a REC whose error channel keeps only the non-tagged remainder
   * (usually `never`); the loading obligation `S` is untouched. It catches *this*
   * REC's own `yield*`ed failures; a child REC handles its own (wrap it too).
   *
   * The fallback renders *in place* (the component stays mounted and subscribed,
   * so it recovers when inputs change), so a catchable **async** yield — a
   * `query`/`suspend` — must be the body's **last hook-bearing yield**: put
   * reactive reads / `hook(...)` before it. A failure that skips later hooks trips
   * React's "rendered fewer hooks" rule on a re-render; if a later hook needs the
   * fetched value, move it into a child REC (a placement is not a hook).
   */
  catch(handlers: CatchHandlers<E>): REC<P, UntaggedErrors<E>, R, S>;
  /**
   * Handle this REC's loading state. A REC that `yield*`s a `suspend`/`query`
   * carries a loading obligation `S`; `.suspense(fallback)` discharges it by
   * placing the REC in a real `<Suspense>` boundary, so while it is pending the
   * `fallback` renders in its place.
   *
   * ```tsx
   * const Page = Profile.suspense(<Skeleton />); // Page: REC<…, never> — obligation met
   * ```
   *
   * Returns a REC with `S` back to `never`. One `.suspense` discharges the whole
   * subtree beneath it (React Suspense catches every descendant that suspends),
   * so a single boundary — at any ancestor, or at `mount` via `{ loading }` —
   * satisfies the obligation the type system otherwise bubbles all the way up.
   */
  suspense(fallback: ReactNode): REC<P, E, R, never>;
}

interface RecBareYield<R, S> {
  /** Place this REC without props: `yield* Child`. */
  [Symbol.iterator](): Iterator<RecPlacement<ReactNode, R, S>, ReactNode>;
}

/**
 * A React Effect Component. Yieldable (so `R` and `S` propagate), never a JSX
 * element type — `<Rec />` is a compile error by design. Props-free RECs can be
 * yielded directly (`yield* Child`); RECs with props use `yield* Child.with(p)`.
 * `E` carries the tagged failures its body can raise (`.catch` discharges them);
 * `S` carries an unhandled loading obligation (`.suspense` discharges it).
 */
export type REC<P, E, R, S> = RecCore<P, E, R, S> &
  ([Record<never, never>] extends [P] ? RecBareYield<R, S> : unknown);

const makeRec = <P extends object, E, R, S>(
  body: RecBody<P, ReactNode>,
  name: string,
  catchHandlers?: CatchDispatch<ReactNode>,
  suspenseFallback?: ReactNode,
): REC<P, E, R, S> => {
  // A `(props: P) => ...` body widens to the handle's `(props: any) => ...` for
  // free (parameter bivariance), so no assertion is needed to store it.
  const rec: RecCore<P, E, R, S> & RecBareYield<R, S> = {
    [RecTypeId]: true,
    body,
    displayName: name,
    // `exactOptionalPropertyTypes`: only carry a key when its value exists, so a
    // plain REC has no `catchHandlers`/`suspenseFallback` rather than undefined ones.
    ...(catchHandlers === undefined ? {} : { catchHandlers }),
    ...(suspenseFallback === undefined ? {} : { suspenseFallback }),
    with(props: P): RecPlacement<ReactNode, R, S> {
      return placement<ReactNode, R, S>(rec, props);
    },
    catch(handlers: CatchHandlers<E>): REC<P, UntaggedErrors<E>, R, S> {
      // A handler is only ever invoked with the error whose `_tag` selected it,
      // so erasing the per-tag parameter to `unknown` for storage is sound; the
      // precise error type is recovered structurally at each `.catch` call site.
      return makeRec<P, UntaggedErrors<E>, R, S>(
        body,
        name,
        handlers as unknown as CatchDispatch<ReactNode>,
        suspenseFallback,
      );
    },
    suspense(fallback: ReactNode): REC<P, E, R, never> {
      return makeRec<P, E, R, never>(body, name, catchHandlers, fallback);
    },
    [Symbol.iterator](): Iterator<RecPlacement<ReactNode, R, S>, ReactNode> {
      return placement<ReactNode, R, S>(rec, {})[Symbol.iterator]();
    },
  };
  Object.defineProperty(rec, 'name', { value: name });
  return rec;
};

/**
 * Define a React Effect Component. The body is a generator that may `yield*`
 * Effect services and effects, `yield* hook(...)` for React hooks, `yield*
 * suspend(...)` / `query(...)` for async data, and `yield* Child` / `yield* Child.with(props)` to
 * place other RECs.
 *
 * The returned descriptor is server-safe: the same `mount(...)` renders a
 * hook-free body on the server, and the very same value mounts on the client.
 * Only a body that itself imports client-only APIs (React hooks) makes its
 * *module* client-only — the `rec` wrapper never does.
 */
export function rec<Eff extends AnyYield, A extends ReactNode>(
  body: () => Generator<Eff, A, never>,
): REC<Record<never, never>, ErrorsOf<Eff>, RequirementsOf<Eff>, SuspendsOf<Eff>>;
export function rec<Eff extends AnyYield, A extends ReactNode, Props extends object>(
  body: (props: Props) => Generator<Eff, A, never>,
): REC<Props, ErrorsOf<Eff>, RequirementsOf<Eff>, SuspendsOf<Eff>>;
export function rec<Eff extends AnyYield, A extends ReactNode, Props extends object>(
  body: (props: Props) => Generator<Eff, A, never>,
): REC<Props, ErrorsOf<Eff>, RequirementsOf<Eff>, SuspendsOf<Eff>> {
  return makeRec<Props, ErrorsOf<Eff>, RequirementsOf<Eff>, SuspendsOf<Eff>>(
    body,
    body.name || 'EffractComponent',
  );
}

/** A type error naming the services a runtime is missing for a REC's tree. */
export type MissingServices<Missing> = readonly ['effract: runtime is missing', Missing];

/** A type error demanding a loading fallback for a tree that can still suspend. */
export type LoadingNotHandled = readonly [
  'effract: loading not handled — add .suspense(fallback), or mount(layer, root, { loading })',
];

/**
 * A no-service tree's requirement infers as `unknown` (Effect's requirement
 * channel is contravariant, so `never` widens). Normalise that to `never` so a
 * runtime-free tree mounts/serves under any layer.
 */
export type Effective<R> = [unknown] extends [R] ? never : R;
