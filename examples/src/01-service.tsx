/**
 * Recipe 01 — read a service.
 *
 * A React Effect Component reads an Effect service with `yield*`. The service
 * is supplied by the `<Runtime>` boundary above it and resolved synchronously
 * during render — no provider components, no prop drilling.
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { Runtime, component } from '@tmonier/effract';

class Clock extends Context.Service<Clock, { readonly label: string }>()('recipes/Clock') {}
const ClockLive = Layer.succeed(Clock)({ label: '9:41' });

export const Time = component(function* () {
  const clock = yield* Clock; // ← the call site: a service, by yield*
  return <time>{clock.label}</time>;
});

export const App = (): ReactNode => (
  <Runtime layer={ClockLive}>
    <Time />
  </Runtime>
);
