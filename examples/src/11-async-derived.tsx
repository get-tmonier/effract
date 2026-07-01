/**
 * Recipe 11 — async derived state.
 *
 * `derive.effect` is a derived value whose computation is *asynchronous*: it reads
 * atoms synchronously and returns an Effect. Read in a REC with `yield*`, it
 * suspends while the effect runs, then re-runs when a source atom changes — keyed
 * by the read values, so an unchanged source is not refetched. Like `query`
 * (recipe 09), it carries a loading obligation `S` the type makes you discharge
 * with `.suspense(...)`, and its failures ride the `E` channel for `.catch`.
 *
 * The async logic lives entirely in the service; the component renders and fires
 * events, nothing more.
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { atom, derive, mount, rec, type AsyncDerived, type Atom } from '@tmonier/effract';

// Pretend network: convert an amount into another currency.
const fetchConverted = (amount: number): Effect.Effect<number> =>
  Effect.promise(
    () =>
      new Promise<number>((resolve) => setTimeout(() => resolve(Math.round(amount * 1.09)), 200)),
  );

class Converter extends Context.Service<
  Converter,
  {
    readonly amount: Atom<number>; // the source of truth
    readonly converted: AsyncDerived<number, never, never>; // an async view of amount
  }
>()('recipes/Converter') {}

const ConverterLive = Layer.sync(Converter)(() => {
  const amount = atom(100);
  // Reads amount synchronously, returns the Effect that converts it.
  const converted = derive.effect(($) => fetchConverted($(amount)));
  return { amount, converted };
});

// Suspends while the conversion runs; refetches when amount changes.
export const Quote = rec(function* () {
  const converter = yield* Converter;
  const amount = yield* converter.amount;
  const converted = yield* converter.converted; // suspends → contributes S
  return (
    <div>
      <button type="button" onClick={() => converter.amount.update((a) => a + 50)}>
        €{amount}
      </button>
      <span> ≈ ${converted}</span>
    </div>
  );
}).suspense(<i>converting…</i>); // discharge the loading obligation

export const App = (): ReactNode => mount(ConverterLive, Quote);
