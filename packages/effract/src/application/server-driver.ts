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
import {
  isHook,
  isPlacement,
  isQuery,
  type AnyEffect,
  type CatchDispatch,
  type RecGenerator,
} from '#domain/protocol.ts';

/** Runs an effect against the in-scope runtime, resolving services and async work. */
export type RunEffect = (effect: AnyEffect) => Promise<unknown>;

/**
 * Drive a REC body to its rendered node on the server. Four kinds of yield are
 * honoured, mirroring the client interpreter:
 *
 *   - a child placement (`yield* Child`) → the child's body is driven *inline*
 *     against the same runtime, under the child's *own* `.catch` handlers, so a
 *     universal REC composed of universal RECs renders entirely on the server
 *     with no client JavaScript — and a parent never swallows a child's errors.
 *   - an Effect/service → awaited against the request's runtime. If it fails and
 *     this REC declared a `.catch` for that error's `_tag` (via `handlers`), the
 *     mapped node is rendered in place; otherwise the failure propagates.
 *   - a query (`yield* query(...)`) → awaited inline, exactly like an effect;
 *     there is no loading state on the server (it resolves before the HTML is
 *     sent), so a query is just its effect, with the same `.catch` handling.
 *   - a hook → rejected: React Server Components have no render-pass hooks (this
 *     is React's rule, not effract's), so a hook-bearing body is a client REC.
 *
 * `handlers` is this REC's typed-error dispatch, or `undefined` for a plain REC.
 */
export const driveServerRec = async <A>(
  gen: RecGenerator<A>,
  run: RunEffect,
  handlers?: CatchDispatch<A>,
): Promise<A> => {
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
      // The child owns its failures: it is driven under its own handlers, so an
      // unhandled child error propagates past this REC — as it would on the
      // client, where the child is a separate fiber this `.catch` cannot see.
      const node = await driveServerRec(
        instruction.rec.body(instruction.props),
        run,
        instruction.rec.catchHandlers as CatchDispatch<unknown> | undefined,
      );
      step = gen.next(node);
      continue;
    }
    // A query is its effect here; an effect is itself. Either way, run and catch.
    const effect = isQuery(instruction) ? instruction.effect : instruction;
    let value: unknown;
    try {
      value = await run(effect);
    } catch (thrown) {
      const node = handleServerFailure(thrown, handlers);
      if (node.handled) {
        return node.value;
      }
      throw thrown;
    }
    step = gen.next(value);
  }
  return step.value;
};

/**
 * Match a failed effect against this REC's `.catch` dispatch. On the server a
 * failure is a rejected promise (no Suspense, no thenables to guard), so this is
 * the sync `_tag` lookup: a named tag renders its node; anything else — a defect
 * or an unnamed tag — is left for the caller to re-throw.
 */
const handleServerFailure = <A>(
  thrown: unknown,
  handlers: CatchDispatch<A> | undefined,
): { readonly handled: true; readonly value: A } | { readonly handled: false } => {
  if (handlers !== undefined && typeof thrown === 'object' && thrown !== null) {
    const tag = (thrown as { readonly _tag?: unknown })._tag;
    if (typeof tag === 'string') {
      const handler = handlers[tag];
      if (handler !== undefined) {
        return { handled: true, value: handler(thrown) };
      }
    }
  }
  return { handled: false };
};
