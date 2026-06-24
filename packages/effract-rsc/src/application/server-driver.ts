/**
 * The server-side counterpart to the core interpreter. On the server there is
 * no render pass to suspend and no hooks to honour — a React Server Component
 * may simply be `async` and await its data. So this driver walks the same REC
 * generator a component body produces, but resolves each yielded effect by
 * awaiting it against the request's Effect runtime.
 *
 * The body is identical to the one the client interprets; only who answers the
 * yields differs. That is the whole point: one component, two fibers.
 */
import { isHook, type AnyEffect, type RecGenerator } from '@tmonier/effract';

/** Runs an effect against the in-scope runtime, resolving services and async work. */
export type RunEffect = (effect: AnyEffect) => Promise<unknown>;

/**
 * Drive a REC body to its rendered node on the server. Hooks are rejected with
 * a clear message — they are a client-render concept that React Server
 * Components do not support (this is React's rule, not effract's).
 */
export const driveServerRec = async <A>(gen: RecGenerator<A>, run: RunEffect): Promise<A> => {
  let step = gen.next();
  while (!step.done) {
    const instruction = step.value;
    if (isHook(instruction)) {
      throw new Error(
        'effract-rsc: React hooks are not available in Server Components. Yield only Effect ' +
          'services/effects here, or render this component on the client with `rec(...)`.',
      );
    }
    const value = await run(instruction as AnyEffect);
    step = gen.next(value);
  }
  return step.value;
};
