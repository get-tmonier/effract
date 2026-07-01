/**
 * Recipe 05 — a stateful service.
 *
 * State lives in the Effect world — an `atom` inside a service — not in a React
 * tree. The component reads it by `yield*`ing the atom (read + subscribe) and
 * mutates it by calling a service method. Because the state belongs to the
 * runtime, it is reachable from anywhere an Effect runs (other components,
 * background fibers, even the server).
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { atom, mount, rec, type Atom } from '@tmonier/effract';

class Cart extends Context.Service<
  Cart,
  {
    readonly items: Atom<ReadonlyArray<string>>;
    readonly add: (item: string) => void;
  }
>()('recipes/Cart') {}

const CartLive = Layer.sync(Cart)(() => {
  const items = atom<ReadonlyArray<string>>([]);
  return {
    items,
    add: (item) => {
      items.update((current) => [...current, item]);
    },
  };
});

export const CartView = rec(function* () {
  const cart = yield* Cart;
  const items = yield* cart.items; // reactive read of service state — read + subscribe
  return (
    <div>
      <button type="button" onClick={() => cart.add('☕')}>
        add coffee
      </button>
      <span>{items.join(' ')}</span>
    </div>
  );
});

export const App = (): ReactNode => mount(CartLive, CartView);
