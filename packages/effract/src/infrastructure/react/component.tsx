'use client';

/**
 * The two ways to write a component as an Effect program.
 *
 *   component(function* () { ... })   the headline: a *React Effect Component*
 *                                     whose body yields both Effect services
 *                                     and React hooks, interpreted inside the
 *                                     render pass.
 *
 *   view(Effect | (props) => Effect)  the simpler resolve-up-front mode: a pure
 *                                     Effect with no hooks, ideal for server /
 *                                     RSC rendering.
 *
 * Both produce a genuine React function component. There is no custom
 * reconciler — `<Dashboard />` is a real element React renders, suspends, and
 * reconciles like any other.
 */
import { use, useRef, type ReactNode } from 'react';
import type * as Effect from 'effect/Effect';
import { driveRec, resolveEffect } from '#application/interpreter.ts';
import type { RenderCache, Suspender } from '#application/ports.ts';
import type { AnyEffect, Hook, RequirementsOf } from '#domain/protocol.ts';
import { useExecutor } from '#infrastructure/react/runtime.tsx';

declare const RequirementsId: unique symbol;

/**
 * A React component produced by effract. It renders like any other component;
 * the phantom `R` records which Effect services it needs from its `<Runtime>`,
 * available for type-level introspection and runtime-binding helpers.
 */
export interface Component<in Props, out R> {
  (props: Props): ReactNode;
  readonly [RequirementsId]?: R;
}

const useSuspender = (): Suspender => ({ use });

const useRenderCache = (): RenderCache => {
  const ref = useRef<RenderCache>(undefined as unknown as RenderCache);
  if (ref.current === undefined) {
    ref.current = new Map();
  }
  return ref.current;
};

/**
 * Define a React Effect Component. The body is a generator that may `yield*`
 * Effect services and effects, and `yield* hook(...)` for React hooks.
 *
 * ```tsx
 * const Dashboard = component(function* () {
 *   const stats = yield* Stats;                         // Effect service
 *   const [tab, setTab] = yield* hook(useState('overview')); // real React hook
 *   return <Panel tab={tab} total={stats.total} onTab={setTab} />;
 * });
 * ```
 */
export function component<Eff extends AnyEffect | Hook<unknown>, A extends ReactNode>(
  body: () => Generator<Eff, A, never>,
): Component<Record<never, never>, RequirementsOf<Eff>>;
export function component<Eff extends AnyEffect | Hook<unknown>, A extends ReactNode, Props>(
  body: (props: Props) => Generator<Eff, A, never>,
): Component<Props, RequirementsOf<Eff>>;
export function component<Eff extends AnyEffect | Hook<unknown>, A extends ReactNode, Props>(
  body: (props: Props) => Generator<Eff, A, never>,
): Component<Props, RequirementsOf<Eff>> {
  const Rec = (props: Props): ReactNode => {
    const executor = useExecutor();
    const suspender = useSuspender();
    const cache = useRenderCache();
    return driveRec(body(props), { executor, suspender, cache });
  };
  Rec.displayName = body.name || 'EffractComponent';
  return Rec as Component<Props, RequirementsOf<Eff>>;
}

/**
 * Define a resolve-up-front component: a pure Effect (no hooks) rendered to a
 * `ReactNode`. Services resolve synchronously from the runtime; async work
 * suspends through React Suspense. This is the RSC-friendly mode.
 *
 * ```tsx
 * const Header = view(Effect.gen(function* () {
 *   const user = yield* CurrentUser;
 *   return <h1>Welcome, {user.name}</h1>;
 * }));
 * ```
 */
export function view<A extends ReactNode, E, R>(
  render: Effect.Effect<A, E, R>,
): Component<Record<never, never>, R>;
export function view<A extends ReactNode, E, R, Props>(
  render: (props: Props) => Effect.Effect<A, E, R>,
): Component<Props, R>;
export function view<A extends ReactNode, E, R, Props>(
  render: Effect.Effect<A, E, R> | ((props: Props) => Effect.Effect<A, E, R>),
): Component<Props, R> {
  const View = (props: Props): ReactNode => {
    const executor = useExecutor();
    const suspender = useSuspender();
    const cache = useRenderCache();
    const effect = (typeof render === 'function' ? render(props) : render) as AnyEffect;
    return resolveEffect(effect, { executor, suspender, cache }, { index: 0 }) as ReactNode;
  };
  View.displayName = 'EffractView';
  return View as Component<Props, R>;
}
