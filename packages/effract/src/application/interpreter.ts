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
import { isHook, isPlacement, type AnyEffect, type RecGenerator } from '#domain/protocol.ts';
import type { InterpreterDeps } from '#application/ports.ts';

interface DriveState {
  index: number;
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
 * Run a React Effect Component body to its rendered result. Creates a fresh
 * generator per render (generators are single-use); a Suspense retry simply
 * runs this again from the top, replaying hooks in order and hitting the async
 * cache for already-started work.
 */
export const driveRec = <A>(gen: RecGenerator<A>, deps: InterpreterDeps): A => {
  const state: DriveState = { index: 0 };
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
    } else {
      result = resolveEffect(instruction, deps, state);
    }
    step = gen.next(result);
  }
  return step.value;
};
