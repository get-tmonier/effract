/**
 * The yield protocol that lets a single generator body speak two languages at
 * once: Effect (services, effects) and React (hooks). This module is the pure
 * heart of the framework — it knows nothing about React or about how effects
 * are executed. It only defines *what* can flow through `yield*` and how the
 * interpreter recognises each kind.
 *
 * Two kinds of value travel through `yield*`:
 *
 *   yield* SomeService          // an Effect (a service Tag is itself an Effect)
 *   yield* hook(useState(0))    // a Hook: a real React hook call, lifted in
 *
 * Both implement the single-shot iterator protocol that `yield*` delegates to,
 * so the interpreter receives the instruction, resolves it, and feeds the
 * result back into the generator — exactly how `Effect.gen` drives Tags.
 */
import type * as Effect from 'effect/Effect';

/**
 * The one unavoidable `any` in the framework. The heterogeneous yield protocol
 * must accept an Effect of *any* error and requirement variance — there is no
 * other way to express "some Effect" as a generic constraint, which is why
 * Effect's own `Effect.gen` is typed exactly this way. Precise `E` and `R` are
 * recovered below through conditional inference, so this never leaks to users.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type AnyEffect = Effect.Effect<any, any, any>;

/** Brand identifying a lifted React hook instruction. */
export const HookTypeId = Symbol.for('@tmonier/effract/Hook');
export type HookTypeId = typeof HookTypeId;

/**
 * A React hook result lifted into the `yield*` channel. The hook itself has
 * already executed (synchronously, during render) by the time the value is
 * wrapped — `hook(useState(0))` calls `useState` inline. Wrapping it only makes
 * the result yieldable, so a component body reads as one uniform stream of
 * `yield*`s whether the value comes from Effect or from React.
 */
export interface Hook<out A> {
  readonly [HookTypeId]: true;
  readonly value: A;
  [Symbol.iterator](): Iterator<Hook<A>, A>;
}

/**
 * Lift an already-evaluated React hook result into the effract yield channel.
 *
 * ```ts
 * const [tab, setTab] = yield* hook(useState('overview'));
 * const ref = yield* hook(useRef<HTMLDivElement>(null));
 * ```
 *
 * Because the component body runs synchronously inside React's render pass, the
 * wrapped hook call obeys the Rules of Hooks: same order on every render.
 */
export const hook = <A>(value: A): Hook<A> => {
  const self: Hook<A> = {
    [HookTypeId]: true,
    value,
    [Symbol.iterator]() {
      let yielded = false;
      return {
        next(sent?: unknown): IteratorResult<Hook<A>, A> {
          if (yielded) {
            return { done: true, value: sent as A };
          }
          yielded = true;
          return { done: false, value: self };
        },
      };
    },
  };
  return self;
};

/** Type guard: is this yielded instruction a lifted hook? */
export const isHook = (u: unknown): u is Hook<unknown> =>
  typeof u === 'object' && u !== null && HookTypeId in u;

/** Everything a component body may `yield*`: an Effect, or a lifted hook. */
export type Yieldable<A> = Effect.Effect<A, unknown, unknown> | Hook<A>;

/** The generator a React Effect Component body produces. */
export type RecGenerator<A> = Generator<AnyEffect | Hook<unknown>, A, unknown>;

/** A component body: props in, a generator of yields ending in a rendered `A`. */
export type RecBody<Props, A> = (props: Props) => RecGenerator<A>;

/**
 * Distribute over the yield union and keep only its Effect members. Hooks are
 * not Effects, so they drop away — leaving just what carries `E` and `R`.
 */
type EffectsOnly<Eff> = Eff extends AnyEffect ? Eff : never;

/**
 * Recover the Effect requirement channel `R` from everything a body yields.
 * A body that needs both `A` and `B` requires `A & B`, which is exactly the
 * intersection TypeScript infers from the contravariant requirement slot.
 */
export type RequirementsOf<Eff> = [EffectsOnly<Eff>] extends [
  Effect.Effect<unknown, unknown, infer R>,
]
  ? R
  : never;

/** Recover the Effect error channel `E` (a union — any yielded effect may fail). */
export type ErrorsOf<Eff> = [EffectsOnly<Eff>] extends [Effect.Effect<unknown, infer E, unknown>]
  ? E
  : never;
