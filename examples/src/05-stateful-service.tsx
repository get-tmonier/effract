/**
 * Recipe 05 — a stateful service.
 *
 * State lives in the Effect world — an `atom` inside a service — not in a React
 * tree. Values *derived* from that state live there too: `count` is a `derive`
 * over `items`, computed once in the service, never recomputed in a component.
 * The component reads either by `yield*`ing it (read + subscribe) and mutates by
 * calling a service method. Because the state belongs to the runtime, it is
 * reachable from anywhere an Effect runs (other components, background fibers,
 * even the server).
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { atom, mount, rec, type Atom, type ReadableAtom } from '@tmonier/effract';

class Cart extends Context.Service<
  Cart,
  {
    readonly items: Atom<ReadonlyArray<string>>;
    readonly count: ReadableAtom<number>; // derived from items — computed in the service
    readonly add: (item: string) => void;
  }
>()('recipes/Cart') {}

const CartLive = Layer.sync(Cart)(() => {
  const items = atom<ReadonlyArray<string>>([]);
  const count = items.derive((list) => list.length); // derivation stays here, not in a component
  return {
    items,
    count,
    add: (item) => {
      items.update((current) => [...current, item]);
    },
  };
});

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

export const App = (): ReactNode => mount(CartLive, CartView);
