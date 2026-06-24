/**
 * Server-component constructors. They turn the very same REC body the client
 * interprets into an `async` React Server Component, resolving its yields
 * against the in-scope Effect runtime and streaming as Flight.
 */
import type { ReactNode } from 'react';
import type * as Effect from 'effect/Effect';
import type { AnyEffect, RecBody } from '@tmonier/effract';
import { driveServerRec } from '#application/server-driver.ts';
import { currentRuntime } from '#infrastructure/runtime-scope.ts';

/**
 * Lift a REC body (services/effects only — no hooks) into an async Server
 * Component. The body can be shared verbatim with the client `component(...)`.
 *
 * ```tsx
 * function* statsBadge() {
 *   const stats = yield* Stats;          // resolved on the server
 *   return <span>{stats.total} online</span>;
 * }
 * export const StatsBadge = serverComponent(statsBadge);     // RSC
 * export const StatsBadgeClient = component(statsBadge);      // SPA/SSR
 * ```
 */
export const serverComponent =
  <Props,>(body: RecBody<Props, ReactNode>) =>
  async (props: Props): Promise<ReactNode> => {
    const runtime = currentRuntime();
    return driveServerRec(body(props), (effect) =>
      runtime.runPromise(effect as Parameters<typeof runtime.runPromise>[0]),
    );
  };

/**
 * The single-effect, resolve-up-front Server Component — the RSC analogue of
 * `view`. Ideal for resolving flags, the current user, or permissions near the
 * root of a request.
 */
export const serverView =
  <A extends ReactNode, E, R, Props = Record<never, never>>(
    render: Effect.Effect<A, E, R> | ((props: Props) => Effect.Effect<A, E, R>),
  ) =>
  async (props: Props): Promise<A> => {
    const runtime = currentRuntime();
    const effect = (typeof render === 'function' ? render(props) : render) as AnyEffect;
    return runtime.runPromise(effect as Parameters<typeof runtime.runPromise>[0]) as Promise<A>;
  };
