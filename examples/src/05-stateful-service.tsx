/**
 * Recipe 05 — a stateful service.
 *
 * State lives in the Effect world — an `atom` inside a service — not in a React
 * tree. Declare the service the general Effect way: `Context.Service<Self>()(id,
 * { make })` infers the shape from what `make` returns (write it once), and the
 * Live `Layer` is a `static layer`. Values *derived* from the state live here too
 * (`count` is `items.derive(...)`), computed once, never in a component. The
 * component reads by `yield*`ing and mutates by calling a method. Because the
 * state belongs to the runtime, it is reachable from anywhere an Effect runs.
 *
 * `make` is an `Effect`, so this same shape scales up: `Effect.gen` to depend on
 * other services, `Layer.provide` on the layer to supply them.
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { atom, mount, rec } from '@tmonier/effract';

class Cart extends Context.Service<Cart>()('recipes/Cart', {
  make: Effect.sync(() => {
    const items = atom<ReadonlyArray<string>>([]);
    const count = items.derive((list) => list.length); // derived — computed in the service
    return {
      items,
      count,
      add: (item: string) => items.update((current) => [...current, item]),
    };
  }),
}) {
  static readonly layer = Layer.effect(Cart, Cart.make);
}

export const CartView = rec(function* () {
  const cart = yield* Cart;
  const items = yield* cart.items; // reactive read of service state — read + subscribe
  const count = yield* cart.count; // reactive read of the derived value
  return (
    <div>
      <button type="button" onClick={() => cart.add('☕')}>
        add coffee
      </button>
      <span>
        {count} in cart: {items.join(' ')}
      </span>
    </div>
  );
});

export const App = (): ReactNode => mount(Cart.layer, CartView);
