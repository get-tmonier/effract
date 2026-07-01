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
 * how a child's Effect requirements (`R`) bubble up the tree to the one place
 * that knows the runtime (`mount`), where they are verified at compile time.
 */
import type { ReactNode } from 'react';
import {
  placement,
  type AnyEffect,
  type Hook,
  type RecBody,
  type RecHandle,
  type RecPlacement,
  type RequirementsOf,
} from '#domain/protocol.ts';

/** Brand identifying a React Effect Component. */
export const RecTypeId: unique symbol = Symbol.for('@tmonier/effract/Rec');
export type RecTypeId = typeof RecTypeId;

interface RecCore<P, R> extends RecHandle<ReactNode> {
  readonly [RecTypeId]: true;
  /** Place this REC with props: `yield* Child.with({ ... })`. */
  with(props: P): RecPlacement<ReactNode, R>;
}

interface RecBareYield<R> {
  /** Place this REC without props: `yield* Child`. */
  [Symbol.iterator](): Iterator<RecPlacement<ReactNode, R>, ReactNode>;
}

/**
 * A React Effect Component. Yieldable (so `R` propagates), never a JSX element
 * type — `<Rec />` is a compile error by design. Props-free RECs can be yielded
 * directly (`yield* Child`); RECs with props use `yield* Child.with(props)`.
 */
export type REC<P, R> = RecCore<P, R> &
  ([Record<never, never>] extends [P] ? RecBareYield<R> : unknown);

const makeRec = <P extends object, R>(body: RecBody<P, ReactNode>, name: string): REC<P, R> => {
  // A `(props: P) => ...` body widens to the handle's `(props: any) => ...` for
  // free (parameter bivariance), so no assertion is needed to store it.
  const rec: RecCore<P, R> & RecBareYield<R> = {
    [RecTypeId]: true,
    body,
    displayName: name,
    with(props: P): RecPlacement<ReactNode, R> {
      return placement<ReactNode, R>(rec, props);
    },
    [Symbol.iterator](): Iterator<RecPlacement<ReactNode, R>, ReactNode> {
      return placement<ReactNode, R>(rec, {})[Symbol.iterator]();
    },
  };
  Object.defineProperty(rec, 'name', { value: name });
  return rec;
};

/**
 * Define a React Effect Component. The body is a generator that may `yield*`
 * Effect services and effects, `yield* hook(...)` for React hooks, and
 * `yield* Child` / `yield* Child.with(props)` to place other RECs.
 *
 * The returned descriptor is server-safe: the same `mount(...)` renders a
 * hook-free body on the server, and the very same value mounts on the client.
 * Only a body that itself imports client-only APIs (React hooks) makes its
 * *module* client-only — the `rec` wrapper never does.
 */
export function rec<
  Eff extends AnyEffect | Hook<unknown> | RecPlacement<ReactNode, unknown>,
  A extends ReactNode,
>(body: () => Generator<Eff, A, never>): REC<Record<never, never>, RequirementsOf<Eff>>;
export function rec<
  Eff extends AnyEffect | Hook<unknown> | RecPlacement<ReactNode, unknown>,
  A extends ReactNode,
  Props extends object,
>(body: (props: Props) => Generator<Eff, A, never>): REC<Props, RequirementsOf<Eff>>;
export function rec<
  Eff extends AnyEffect | Hook<unknown> | RecPlacement<ReactNode, unknown>,
  A extends ReactNode,
  Props extends object,
>(body: (props: Props) => Generator<Eff, A, never>): REC<Props, RequirementsOf<Eff>> {
  return makeRec<Props, RequirementsOf<Eff>>(body, body.name || 'EffractComponent');
}

/** A type error naming the services a runtime is missing for a REC's tree. */
export type MissingServices<Missing> = readonly ['effract: runtime is missing', Missing];

/**
 * A no-service tree's requirement infers as `unknown` (Effect's requirement
 * channel is contravariant, so `never` widens). Normalise that to `never` so a
 * runtime-free tree mounts/serves under any layer.
 */
export type Effective<R> = [unknown] extends [R] ? never : R;
