/**
 * The interpreter — the bridge between React's fiber and Effect's fiber.
 *
 * React drives a component by calling its function during a render pass.
 * `driveRec` runs *inside* that pass: it walks the component's generator
 * synchronously, and for every `yield*` it decides who answers.
 *
 *   - a lifted hook  → the React hook already ran inline; unwrap its value
 *   - a service Tag  → resolve it synchronously from the runtime's context
 *   - a sync Effect  → run it synchronously, return its value
 *   - an async Effect → suspend through React's `use`, resuming on the retry
 *
 * Because the walk is synchronous and deterministic, the user's hook calls keep
 * a stable order across renders — they are, and remain, ordinary React hooks.
 * Nothing here forks React's reconciler; it cooperates with it.
 */
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Equal from 'effect/Equal';
import * as Exit from 'effect/Exit';
import {
  isHook,
  isPlacement,
  isQuery,
  type AnyEffect,
  type CatchDispatch,
  type Query,
  type RecGenerator,
} from '#domain/protocol.ts';
import type { InterpreterDeps } from '#application/ports.ts';

interface DriveState {
  /** Encounter counter for suspended async effects (the load-once cache). */
  index: number;
  /** Encounter counter for queries (the refetch-on-key cache). */
  queryIndex: number;
}

/**
 * Resolve a single yielded Effect against the runtime. Synchronous effects
 * (services, pure computation, ref reads) return immediately. An effect that
 * cannot finish synchronously surfaces as an `AsyncFiberError`; we route it
 * through React Suspense with a promise cached by encounter order, so the
 * retry after the promise settles returns the value inline. Any other failure
 * is a real error and is thrown to the nearest React error boundary.
 */
const resolveEffect = (effect: AnyEffect, deps: InterpreterDeps, state: DriveState): unknown => {
  if (!Effect.isEffect(effect)) {
    throw new TypeError(
      'effract: a component body yielded a value that is neither an Effect nor a hook(...). ' +
        'Wrap React hooks with `hook(...)`, e.g. `yield* hook(useState(0))`.',
    );
  }

  const exit = deps.executor.runSyncExit(effect);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const squashed = Cause.squash(exit.cause);
  if (Cause.isAsyncFiberError(squashed)) {
    const index = state.index++;
    let slot = deps.cache.get(index);
    if (slot === undefined) {
      slot = { promise: deps.executor.runPromise(effect) };
      deps.cache.set(index, slot);
    }
    // Suspends the render until the cached promise settles, then returns inline.
    return deps.suspender.use(slot.promise);
  }

  throw squashed;
};

/**
 * Resolve a yielded query. A slot is kept per encounter order and reused while
 * its `key` is unchanged; when the key changes we start a fresh run under a new
 * `AbortController` (leaving the old promise to settle, ignored) — that is the
 * refetch. The effect is run to a promise bound to the controller's signal, so
 * the client can interrupt the in-flight fiber on unmount. `use` then suspends
 * the render until the promise settles: a value returns inline; a failure throws
 * the tagged error, which `.catch` can render like any other.
 */
const resolveQuery = (
  query: Query<unknown, unknown, unknown>,
  deps: InterpreterDeps,
  state: DriveState,
): unknown => {
  const index = state.queryIndex++;
  let slot = deps.queryCache.get(index);
  if (slot === undefined || !Equal.equals(slot.key, query.key)) {
    const controller = new AbortController();
    const promise = deps.executor.runPromise(query.effect, controller.signal);
    // Keep an unobserved rejection (e.g. an interruption on unmount) from
    // surfacing as an unhandled rejection; `use` observes the real outcome.
    void promise.catch(() => {});
    slot = { key: query.key, promise, controller };
    deps.queryCache.set(index, slot);
  }
  return deps.suspender.use(slot.promise);
};

/**
 * Run a React Effect Component body to its rendered result. Creates a fresh
 * generator per render (generators are single-use); a Suspense retry simply
 * runs this again from the top, replaying hooks in order and hitting the async
 * and query caches for already-started work.
 */
export const driveRec = <A>(gen: RecGenerator<A>, deps: InterpreterDeps): A => {
  const state: DriveState = { index: 0, queryIndex: 0 };
  let step = gen.next();
  while (!step.done) {
    const instruction = step.value;
    let result: unknown;
    if (isHook(instruction)) {
      // The hook already ran inline during render; unwrap its value.
      result = instruction.value;
    } else if (isPlacement(instruction)) {
      // A child REC: hand it to the renderer to place as a real React child.
      result = deps.placer.place(instruction);
    } else if (isQuery(instruction)) {
      // Async data: suspend for it, refetch on key, interrupt on unmount.
      result = resolveQuery(instruction, deps, state);
    } else {
      result = resolveEffect(instruction, deps, state);
    }
    step = gen.next(result);
  }
  return step.value;
};

/** A thenable — how React's `use` signals a suspension. Never a typed failure. */
const isThenable = (u: unknown): u is PromiseLike<unknown> =>
  typeof u === 'object' && u !== null && typeof (u as { then?: unknown }).then === 'function';

/**
 * Drive a REC body, rendering a typed fallback for a failure it declared via
 * `.catch`. A yielded effect that fails surfaces here as a thrown tagged error —
 * the *same* instance whether it failed synchronously (`Cause.squash`) or
 * asynchronously (React's `use` re-throwing the settled rejection). If its
 * `_tag` names a handler, the handler's node is rendered in place; anything else
 * is re-thrown untouched, so Suspense signals still suspend, defects still reach
 * the nearest error boundary, and an unhandled tag stays a real error. Without a
 * dispatch this is exactly `driveRec`.
 */
export const driveRecCaught = <A>(
  gen: RecGenerator<A>,
  deps: InterpreterDeps,
  handlers: CatchDispatch<A> | undefined,
): A => {
  if (handlers === undefined) {
    return driveRec(gen, deps);
  }
  try {
    return driveRec(gen, deps);
  } catch (thrown) {
    // A suspension (thenable thrown by `use`) must propagate so React can wait.
    if (isThenable(thrown)) {
      throw thrown;
    }
    const tag =
      typeof thrown === 'object' && thrown !== null
        ? (thrown as { readonly _tag?: unknown })._tag
        : undefined;
    if (typeof tag === 'string') {
      const handler = handlers[tag];
      if (handler !== undefined) {
        return handler(thrown);
      }
    }
    // A defect or an error tag this REC did not name — not ours to swallow.
    throw thrown;
  }
};
