'use client';

/**
 * React Effect Components (RECs) and the boundary that mounts them.
 *
 * A REC is the unit of composition in effract. Crucially it is **not** a React
 * element type — `<Dashboard />` is a compile error. You compose RECs the way
 * you compose Effects: with `yield*`. That is what lets a component's Effect
 * requirements (`R`) bubble up the tree to the one place that knows the runtime,
 * the `mount` boundary, where they are verified at compile time.
 *
 *   const Dashboard = rec(function* () {
 *     const stats = yield* Stats;                  // a service
 *     const [n, setN] = yield* hook(useState(0));   // a real React hook
 *     return <main>{yield* StatBadge}{n}</main>;    // a child REC, yielded
 *   });
 *
 *   mount(AppLive, Dashboard);  // ← compile error if AppLive lacks a needed service
 *
 * At runtime a REC still renders as an ordinary React component (own fiber,
 * hooks, reconciliation); the yield is only how it is placed and how `R` flows.
 */
import {
  createElement,
  use,
  useRef,
  type FunctionComponent,
  type ReactElement,
  type ReactNode,
} from 'react';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import { driveRec, resolveEffect } from '#application/interpreter.ts';
import type { RenderCache, Suspender } from '#application/ports.ts';
import type { AnyEffect, Hook, RequirementsOf } from '#domain/protocol.ts';
import { Runtime, useExecutor } from '#infrastructure/react/runtime.tsx';

/** Brand identifying a React Effect Component. */
export const RecTypeId: unique symbol = Symbol.for('@tmonier/effract/Rec');
export type RecTypeId = typeof RecTypeId;

/** A rendered child: an Effect producing a React element, carrying its requirements. */
type Rendered<R> = Effect.Effect<ReactElement, never, R>;

interface RecCore<P, R> {
  readonly [RecTypeId]: true;
  /** Place this REC with props: `yield* Child.with({ ... })`. */
  with(props: P): Rendered<R>;
}

interface RecBareYield<R> {
  /** Place this REC without props: `yield* Child`. */
  [Symbol.iterator](): Iterator<Rendered<R>, ReactElement>;
}

/**
 * A React Effect Component. Yieldable (so `R` propagates), never a JSX element
 * type — `<Rec />` is a compile error by design. Props-free RECs can be yielded
 * directly (`yield* Child`); RECs with props use `yield* Child.with(props)`.
 */
export type REC<P, R> = RecCore<P, R> &
  ([Record<never, never>] extends [P] ? RecBareYield<R> : unknown);

const useSuspender = (): Suspender => ({ use });

const useRenderCache = (): RenderCache => {
  const ref = useRef<RenderCache | null>(null);
  if (ref.current === null) {
    ref.current = new Map();
  }
  return ref.current;
};

const makeRec = <P extends object, R>(fc: FunctionComponent<P>, name: string): REC<P, R> => {
  // The child resolves its own services when React renders it, so this
  // render-effect requires nothing at runtime. The phantom `R` is asserted here
  // — the single intentional assertion — so requirements propagate as a type.
  const rendered = (props: P): Rendered<R> =>
    Effect.succeed(createElement(fc, props)) as Effect.Effect<ReactElement, never, R>;

  const rec: RecCore<P, R> & RecBareYield<R> = {
    [RecTypeId]: true,
    with: rendered,
    [Symbol.iterator](): Iterator<Rendered<R>, ReactElement> {
      let yielded = false;
      return {
        next(sent?: unknown): IteratorResult<Rendered<R>, ReactElement> {
          if (yielded) {
            return { done: true, value: sent as ReactElement };
          }
          yielded = true;
          return { done: false, value: rendered({} as P) };
        },
      };
    },
  };
  Object.defineProperty(rec, 'name', { value: name });
  return rec;
};

/**
 * Define a React Effect Component. The body is a generator that may `yield*`
 * Effect services and effects, `yield* hook(...)` for React hooks, and
 * `yield* Child` / `yield* Child.with(props)` to place other RECs.
 */
export function rec<Eff extends AnyEffect | Hook<unknown>, A extends ReactNode>(
  body: () => Generator<Eff, A, never>,
): REC<Record<never, never>, RequirementsOf<Eff>>;
export function rec<
  Eff extends AnyEffect | Hook<unknown>,
  A extends ReactNode,
  Props extends object,
>(body: (props: Props) => Generator<Eff, A, never>): REC<Props, RequirementsOf<Eff>>;
export function rec<
  Eff extends AnyEffect | Hook<unknown>,
  A extends ReactNode,
  Props extends object,
>(body: (props: Props) => Generator<Eff, A, never>): REC<Props, RequirementsOf<Eff>> {
  const fc: FunctionComponent<Props> = (props) => {
    const executor = useExecutor();
    const suspender = useSuspender();
    const cache = useRenderCache();
    return driveRec(body(props), { executor, suspender, cache });
  };
  return makeRec<Props, RequirementsOf<Eff>>(fc, body.name || 'EffractComponent');
}

/**
 * The resolve-up-front mode: a pure Effect (no hooks) rendered to a node.
 * Returns a REC, composed the same way (`yield* Banner`).
 */
export function view<A extends ReactNode, E, R>(
  render: Effect.Effect<A, E, R>,
): REC<Record<never, never>, R>;
export function view<A extends ReactNode, E, R, Props extends object>(
  render: (props: Props) => Effect.Effect<A, E, R>,
): REC<Props, R>;
export function view<A extends ReactNode, E, R, Props extends object>(
  render: Effect.Effect<A, E, R> | ((props: Props) => Effect.Effect<A, E, R>),
): REC<Props, R> {
  const fc: FunctionComponent<Props> = (props) => {
    const executor = useExecutor();
    const suspender = useSuspender();
    const cache = useRenderCache();
    const effect = (typeof render === 'function' ? render(props) : render) as AnyEffect;
    return resolveEffect(effect, { executor, suspender, cache }, { index: 0 }) as ReactNode;
  };
  return makeRec<Props, R>(fc, 'EffractView');
}

/** A type error naming the services a runtime is missing for a REC's tree. */
export type MissingServices<Missing> = readonly ['effract: runtime is missing', Missing];

/**
 * A no-service tree's requirement infers as `unknown` (Effect's requirement
 * channel is contravariant, so `never` widens). Normalise that to `never` so a
 * runtime-free tree mounts under any layer.
 */
type Effective<R> = [unknown] extends [R] ? never : R;

/**
 * Mount a root REC under an Effect runtime. This is the boundary between
 * effract and React: it returns an ordinary React node and, at compile time,
 * verifies that `layer` provides every service the REC's tree requires — the
 * check lives on the `rec` argument, so there is no cast on the result.
 *
 * ```tsx
 * createRoot(el).render(mount(AppLive, Dashboard));
 * ```
 */
export function mount<ROut, E, R>(
  layer: Layer.Layer<ROut, E, never>,
  rec: REC<Record<never, never>, R> &
    ([Effective<R>] extends [ROut] ? unknown : MissingServices<Exclude<Effective<R>, ROut>>),
): ReactNode {
  // The render-effect requires nothing at runtime (asserted: `R` is phantom).
  const element = Effect.runSync(rec.with({}) as Rendered<never>);
  return createElement(Runtime<ROut, E>, { layer }, element);
}
