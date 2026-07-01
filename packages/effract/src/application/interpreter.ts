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
import * as Exit from 'effect/Exit';
import {
  isAtom,
  isHook,
  isPlacement,
  isSuspensable,
  type AnyEffect,
  type RecGenerator,
} from '#domain/protocol.ts';
import type { InterpreterDeps } from '#application/ports.ts';

export interface DriveState {
  /** Encounter counter for suspended async effects (the load-once cache). */
  index: number;
  /** Encounter counter for queries (keys the resolver's cross-render cache). */
  queryIndex: number;
  /**
   * How many *hook-bearing* yields this render processed — hooks, atom reads,
   * suspensables, and async effects (each is a real React hook). It counts a
   * yield the moment it is reached, so a yield that throws (a failure or a
   * suspension) still counts. The client compares it against the last committed
   * render's count to tell whether a caught failure skipped later hooks — in
   * which case rendering the fallback inline would break the Rules of Hooks, so
   * it re-throws to the `.catch` error boundary instead.
   */
  hooks: number;
}

/** A fresh drive state, all counters zeroed. */
export const driveState = (): DriveState => ({ index: 0, queryIndex: 0, hooks: 0 });

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
    state.hooks += 1; // `use` below is a real hook — count it before it may suspend
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
 * Run a React Effect Component body to its rendered result. Creates a fresh
 * generator per render (generators are single-use); a Suspense retry simply
 * runs this again from the top, replaying hooks in order and hitting the async
 * cache and the query resolver for already-started work.
 */
export const driveRec = <A>(
  gen: RecGenerator<A>,
  deps: InterpreterDeps,
  state: DriveState = driveState(),
): A => {
  let step = gen.next();
  while (!step.done) {
    const instruction = step.value;
    let result: unknown;
    if (isHook(instruction)) {
      // The hook already ran inline during render; unwrap its value.
      state.hooks += 1;
      result = instruction.value;
    } else if (isPlacement(instruction)) {
      // A child REC: hand it to the renderer to place as a real React child.
      // (A placement is not a hook — it is not counted.)
      result = deps.placer.place(instruction);
    } else if (isSuspensable(instruction)) {
      // Async data (suspend/query): the resolver suspends for it, refetches on
      // key, and (backed by a cross-render store) interrupts on unmount. Keyed by
      // encounter order. Its `use` is a hook — count it before it may throw.
      state.hooks += 1;
      result = deps.suspensableResolver.resolve(instruction, state.queryIndex++);
    } else if (isAtom(instruction)) {
      // Reactive state: read the atom's value and subscribe this render to it.
      state.hooks += 1;
      result = deps.reader.read(instruction);
    } else {
      result = resolveEffect(instruction, deps, state);
    }
    step = gen.next(result);
  }
  return step.value;
};

// `.catch` is applied by the client (a React error boundary + an inline
// fast-path; see `react/rec.tsx`) and by the server driver (inline, no hooks) —
// each maps a thrown tagged error to its handler. The interpreter only surfaces
// the failure by throwing it; it does not dispatch on `.catch` itself.
