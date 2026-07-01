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

/** Brand identifying an async-data query instruction. */
export const QueryTypeId = Symbol.for('@tmonier/effract/Query');
export type QueryTypeId = typeof QueryTypeId;

/**
 * The fourth kind of yieldable: an *async data query*. Unlike a raw `yield*
 * effect` — which the interpreter may still suspend on, but silently — a query
 * is a component's declared asynchronous dependency. Yielding one both suspends
 * for the value *and* contributes a {@link Suspends} obligation to the REC's
 * type, so the loading state must be handled somewhere (`.suspense(...)`, or the
 * `mount` boundary) before the tree compiles. Its `effect` also carries the `E`
 * and `R` channels, which bubble exactly as a yielded effect's do — so retries,
 * timeouts and cancellation are just Effect combinators on `effect`, and its
 * failures are catchable with `.catch`. `key` (compared by value) drives refetch.
 */
export interface Query<out A, out E, out R> {
  readonly [QueryTypeId]: true;
  readonly effect: Effect.Effect<A, E, R>;
  readonly key: unknown;
  [Symbol.iterator](): Iterator<Query<A, E, R>, A>;
}

/**
 * Declare an asynchronous data dependency. The interpreter runs `effect`,
 * suspends the render until it settles (through React's `use`), and re-runs it
 * when `key` changes by value. On the client the in-flight fiber is interrupted
 * when the component unmounts; on the server the effect is simply awaited.
 *
 * ```ts
 * const user = yield* query(fetchUser(id), id);                 // refetch on id
 * const feed = yield* query(load.pipe(Effect.timeout('2s')));   // policies via Effect
 * ```
 *
 * The effect runs once per (component, position, key), deduped across every
 * render attempt — including the pre-commit retries React makes when a component
 * suspends before it first commits — so a query does not double-fetch on mount.
 */
export const query = <A, E, R>(effect: Effect.Effect<A, E, R>, key?: unknown): Query<A, E, R> => {
  const self: Query<A, E, R> = {
    [QueryTypeId]: true,
    effect,
    key,
    [Symbol.iterator]() {
      let yielded = false;
      return {
        next(sent?: unknown): IteratorResult<Query<A, E, R>, A> {
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

/** Type guard: is this yielded instruction an async-data query? */
export const isQuery = (u: unknown): u is Query<unknown, unknown, unknown> =>
  typeof u === 'object' && u !== null && QueryTypeId in u;

/**
 * The phantom marker of an *unhandled loading obligation*. A body that yields a
 * {@link Query} (or places a child that still carries one) has this in its `S`
 * channel; `.suspense(fallback)` — or the `mount` boundary — discharges it back
 * to `never`. It never exists at runtime; it exists only so the type system can
 * insist a loading state is handled somewhere between component and root. The
 * branded field is nominal — it makes `Suspends` distinct from `never` and from
 * any ordinary type, so the discharge checks are exact.
 */
export interface Suspends {
  readonly ['@tmonier/effract/loading']: true;
}

/** Everything a component body may `yield*`: an Effect, a hook, a child placement, or a query. */
export type Yieldable<A> =
  | Effect.Effect<A, unknown, unknown>
  | Hook<A>
  | RecPlacement<A, unknown, unknown>
  | Query<A, unknown, unknown>;

/** The generator a React Effect Component body produces. */
export type RecGenerator<A> = Generator<
  | AnyEffect
  | Hook<unknown>
  | RecPlacement<unknown, unknown, unknown>
  | Query<unknown, unknown, unknown>,
  A,
  unknown
>;

/** A component body: props in, a generator of yields ending in a rendered `A`. */
export type RecBody<Props, A> = (props: Props) => RecGenerator<A>;

/**
 * Runtime dispatch table for `.catch`: an error `_tag` maps to the node to
 * render in that error's place. Renderer-agnostic in `A` — the domain never
 * learns that a node is a React element; it only carries the mapping so both the
 * client interpreter and the server driver can honour it. The typed, exhaustive
 * shape users write (`CatchHandlers`) narrows to this at the `.catch` boundary.
 */
export type CatchDispatch<A> = Readonly<Record<string, (error: unknown) => A>>;

/**
 * A stable handle to a component's body — the identity a placement points at.
 * The client keys its per-descriptor React component on this object (so a child
 * keeps a stable React type across re-renders); the server drives its `body`
 * directly. Deliberately renderer-agnostic: it names *what* to run, not how.
 */
export interface RecHandle<A> {
  // oxlint-disable-next-line typescript/no-explicit-any -- a stored body accepts whatever props its placement supplies; precise props are recovered at the call site.
  readonly body: (props: any) => RecGenerator<A>;
  readonly displayName: string;
  /**
   * Typed-error fallbacks for this REC, if it was `.catch`-wrapped: a failure
   * from one of *its own* `yield*`ed effects whose `_tag` is present renders the
   * mapped node instead of propagating. Absent for a plain REC.
   */
  readonly catchHandlers?: CatchDispatch<A>;
  /**
   * The loading fallback for this REC, if it was `.suspense`-wrapped: the client
   * places it in a real `<Suspense>` boundary so a yielded {@link Query}'s
   * pending state renders this node. Renderer-agnostic in `A`; absent otherwise.
   */
  readonly suspenseFallback?: A;
}

/** Brand identifying a child-REC placement instruction. */
export const PlacementTypeId = Symbol.for('@tmonier/effract/Placement');
export type PlacementTypeId = typeof PlacementTypeId;

/**
 * The third kind of yieldable, alongside Effects and Hooks: the placement of a
 * *child* REC into a parent's tree (`yield* Child` / `yield* Child.with(p)`).
 *
 * A placement carries only data — the child's stable `rec` handle and its
 * `props` — never a bound React element. That is what lets one `rec(...)` value
 * be shared across runtimes: the client turns a placement into a real React
 * child fiber, the server drives the child's body inline. The phantom `R` makes
 * the child's Effect requirements flow up through `yield*` to `mount`/`serve`,
 * exactly as a yielded service's requirements do.
 */
export interface RecPlacement<A, R, S = never> {
  readonly [PlacementTypeId]: true;
  readonly rec: RecHandle<A>;
  readonly props: object;
  /**
   * Phantom carrier for the requirements this placement contributes upward.
   * Covariant (an output position) so a concrete placement — e.g. one needing
   * `Stats` — widens to `RecPlacement<_, unknown>` in a body's yield union, just
   * as `Effect<_, _, Stats>` widens to `AnyEffect`. Never set at runtime.
   */
  readonly _requirements?: R;
  /**
   * Phantom carrier for the child's unhandled loading obligation `S`. Covariant,
   * like `_requirements`, so a placed child that still suspends bubbles its
   * {@link Suspends} up to the parent's `S` — until an ancestor `.suspense`s it.
   * Never set at runtime.
   */
  readonly _suspends?: S;
  [Symbol.iterator](): Iterator<RecPlacement<A, R, S>, A>;
}

/**
 * Construct a child placement. Single-shot iterable like {@link hook}: `yield*`
 * hands the interpreter the placement instruction, and the value fed back in
 * (the rendered child node) becomes the result of the `yield*`.
 */
export const placement = <A, R, S = never>(
  rec: RecHandle<A>,
  props: object,
): RecPlacement<A, R, S> => {
  const self: RecPlacement<A, R, S> = {
    [PlacementTypeId]: true,
    rec,
    props,
    [Symbol.iterator]() {
      let yielded = false;
      return {
        next(sent?: unknown): IteratorResult<RecPlacement<A, R, S>, A> {
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

/** Type guard: is this yielded instruction a child-REC placement? */
export const isPlacement = (u: unknown): u is RecPlacement<unknown, unknown, unknown> =>
  typeof u === 'object' && u !== null && PlacementTypeId in u;

/**
 * Distribute over the yield union and keep only its Effect members. Hooks are
 * not Effects, so they drop away — leaving just what carries `E` and `R`.
 */
type EffectsOnly<Eff> = Eff extends AnyEffect ? Eff : never;

/**
 * Re-express each yielded placement as an effect carrying only its child's
 * requirements, so a placed child's `R` joins the parent's the same way a
 * yielded service's does — one child, its whole subtree's services bubble up.
 */
type PlacementsAsEffects<Eff> =
  Eff extends RecPlacement<unknown, infer R, unknown> ? Effect.Effect<unknown, unknown, R> : never;

/**
 * Re-express each yielded query as an effect carrying its `E` and `R`, so a
 * query's errors and requirements join the body's exactly as a raw effect's do.
 */
type QueriesAsEffects<Eff> =
  Eff extends Query<unknown, infer E, infer R> ? Effect.Effect<unknown, E, R> : never;

/**
 * Recover the Effect requirement channel `R` from everything a body yields —
 * services, effects, placed child RECs, and queries. A body that needs both `A`
 * and `B` requires `A & B`, which is exactly the intersection TypeScript infers
 * from the contravariant requirement slot.
 */
export type RequirementsOf<Eff> = [
  EffectsOnly<Eff> | PlacementsAsEffects<Eff> | QueriesAsEffects<Eff>,
] extends [Effect.Effect<unknown, unknown, infer R>]
  ? R
  : never;

/** Recover the Effect error channel `E` (a union — any yielded effect or query may fail). */
export type ErrorsOf<Eff> = [EffectsOnly<Eff> | QueriesAsEffects<Eff>] extends [
  Effect.Effect<unknown, infer E, unknown>,
]
  ? E
  : never;

/**
 * Recover the loading obligation `S`. A yielded {@link Query} contributes
 * {@link Suspends}; a placed child contributes whatever `S` it still carries.
 * The union is `Suspends` if *anything* below is unhandled, and `never` once it
 * all is — the exact condition `mount` (and `.suspense`) check.
 */
export type SuspendsOf<Eff> =
  Eff extends Query<unknown, unknown, unknown>
    ? Suspends
    : Eff extends RecPlacement<unknown, unknown, infer S>
      ? S
      : never;
