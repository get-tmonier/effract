/**
 * Recipe 10 — derived state.
 *
 * Derivation belongs in the Effect world, not in a component. `derive` builds a
 * read-only value that tracks exactly the atoms it reads and recomputes only when
 * one changes — and derived atoms compose (one may read another). `derive.writable`
 * adds a two-way projection: a value you can also `set`, the write flowing back to
 * the source. A component just `yield*`s the value and renders; it holds no logic.
 *
 * Here `celsius` is the single source of truth. `fahrenheit` is the same
 * temperature seen through another unit — read *and* written. `label` is a pure
 * computation over `celsius`. Nothing recomputes in React.
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { atom, derive, mount, rec, type Atom, type ReadableAtom } from '@tmonier/effract';

class Thermostat extends Context.Service<
  Thermostat,
  {
    readonly celsius: Atom<number>; // the source of truth
    readonly fahrenheit: Atom<number>; // a two-way projection of celsius
    readonly label: ReadableAtom<string>; // a computed view of celsius
  }
>()('recipes/Thermostat') {}

const ThermostatLive = Layer.sync(Thermostat)(() => {
  const celsius = atom(20);
  const fahrenheit = derive.writable(
    ($) => $(celsius) * 1.8 + 32,
    (f) => celsius.set(Math.round((f - 32) / 1.8)),
  );
  const label = derive(($) => ($(celsius) < 18 ? 'cold' : $(celsius) > 24 ? 'warm' : 'comfy'));
  return { celsius, fahrenheit, label };
});

// Reads the source and a computed view; re-renders precisely when celsius changes.
export const Readout = rec(function* () {
  const thermostat = yield* Thermostat;
  const c = yield* thermostat.celsius;
  const label = yield* thermostat.label;
  return (
    <p>
      {c}°C — {label}
    </p>
  );
});

// Writes the *derived* fahrenheit; the write flows back to celsius, and Readout
// (which reads celsius) updates too. No conversion logic in the component.
export const FahrenheitStepper = rec(function* () {
  const { fahrenheit } = yield* Thermostat;
  const f = yield* fahrenheit;
  return (
    <button type="button" onClick={() => fahrenheit.update((v) => v + 9)}>
      {Math.round(f)}°F +9
    </button>
  );
});

export const App = (): ReactNode =>
  mount(
    ThermostatLive,
    rec(function* () {
      return (
        <div>
          {yield* Readout}
          {yield* FahrenheitStepper}
        </div>
      );
    }),
  );
