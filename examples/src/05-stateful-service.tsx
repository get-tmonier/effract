/**
 * Recipe 05 — a stateful service.
 *
 * State lives in the Effect world — an `AtomRef` inside a service — not in a
 * React tree. The component `observe`s it and calls service methods to mutate
 * it. Because the state belongs to the runtime, it is reachable from anywhere
 * an Effect runs (other components, background fibers, even the server).
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { AtomRef } from 'effect/unstable/reactivity';
import { Runtime, component, hook, observe } from '@tmonier/effract';

class Cart extends Context.Service<
  Cart,
  {
    readonly items: AtomRef.AtomRef<ReadonlyArray<string>>;
    readonly add: (item: string) => void;
  }
>()('recipes/Cart') {}

const CartLive = Layer.sync(Cart)(() => {
  const items = AtomRef.make<ReadonlyArray<string>>([]);
  return {
    items,
    add: (item) => {
      items.update((current) => [...current, item]);
    },
  };
});

export const CartView = component(function* () {
  const cart = yield* Cart;
  const items = yield* hook(observe(($) => $(cart.items))); // reactive read of service state
  return (
    <div>
      <button type="button" onClick={() => cart.add('☕')}>
        add coffee
      </button>
      <span>{items.join(' ')}</span>
    </div>
  );
});

export const App = (): ReactNode => (
  <Runtime layer={CartLive}>
    <CartView />
  </Runtime>
);
