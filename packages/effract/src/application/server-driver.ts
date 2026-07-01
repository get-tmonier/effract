/**
 * The server-side counterpart to the in-render interpreter. On the server there
 * is no render pass to suspend and no hooks to honour — a React Server Component
 * may simply be `async` and await its data. So this driver walks the same REC
 * generator a component body produces, but resolves each yielded effect by
 * awaiting it against the request's Effect runtime, and drives placed children
 * inline (so a universal tree renders entirely on the server, no client JS).
 *
 * The body is identical to the one the client interprets; only who answers the
 * yields differs. That is the whole point: one component, two fibers.
 */
import { isHook, isPlacement, type AnyEffect, type RecGenerator } from '#domain/protocol.ts';

/** Runs an effect against the in-scope runtime, resolving services and async work. */
export type RunEffect = (effect: AnyEffect) => Promise<unknown>;

/**
 * Drive a REC body to its rendered node on the server. Three kinds of yield are
 * honoured, mirroring the client interpreter:
 *
 *   - a child placement (`yield* Child`) → the child's body is driven *inline*
 *     against the same runtime, so a universal REC composed of universal RECs
 *     renders entirely on the server, with no client JavaScript.
 *   - an Effect/service → awaited against the request's runtime.
 *   - a hook → rejected: React Server Components have no render-pass hooks (this
 *     is React's rule, not effract's), so a hook-bearing body is a client REC.
 */
export const driveServerRec = async <A>(gen: RecGenerator<A>, run: RunEffect): Promise<A> => {
  let step = gen.next();
  while (!step.done) {
    const instruction = step.value;
    if (isHook(instruction)) {
      throw new Error(
        'effract: React hooks are not available in Server Components. Yield only Effect ' +
          'services/effects here, or render this component on the client (a hook-bearing REC is a ' +
          'client island — it renders wherever the browser runtime is).',
      );
    }
    if (isPlacement(instruction)) {
      const node = await driveServerRec(instruction.rec.body(instruction.props), run);
      step = gen.next(node);
      continue;
    }
    // Hooks and placements are handled above, so this is an Effect.
    const value = await run(instruction);
    step = gen.next(value);
  }
  return step.value;
};
