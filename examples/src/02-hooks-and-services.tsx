/**
 * Recipe 02 — hooks and services, in one render pass.
 *
 * The body interleaves a genuine React hook (`useState`) with an Effect service.
 * Both arrive through `yield*`; the hook keeps its state across renders exactly
 * like any React component, because the body runs inside React's render pass.
 */
import { useState, type ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { rec, hook, mount } from '@tmonier/effract';

class Limits extends Context.Service<Limits, { readonly max: number }>()('recipes/Limits') {}
const LimitsLive = Layer.succeed(Limits)({ max: 5 });

export const Stepper = rec(function* () {
  const { max } = yield* Limits; // an Effect service
  const [n, setN] = yield* hook(useState(0)); // a real React hook
  return (
    <button type="button" disabled={n >= max} onClick={() => setN(n + 1)}>
      {n} / {max}
    </button>
  );
});

export const App = (): ReactNode => mount(LimitsLive, Stepper);
