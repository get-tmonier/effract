import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { AtomRef } from 'effect/unstable/reactivity';

// Typed errors — a product lookup fails in ways the UI renders per case.
export class NotFound extends Data.TaggedError('NotFound')<{ readonly id: number }> {}
export class SoldOut extends Data.TaggedError('SoldOut')<{ readonly name: string }> {}

export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
}

// The catalog: look up a product by id. Async (a network round-trip) and it can
// fail — the shape `query` + `.catch` justify each other on.
export class Catalog extends Context.Service<
  Catalog,
  { readonly product: (id: number) => Effect.Effect<Product, NotFound | SoldOut> }
>()('shop/Catalog') {}

const SHELF: Record<number, { readonly product: Product; readonly stock: number }> = {
  1: { product: { id: 1, name: 'Espresso beans', price: 12 }, stock: 8 },
  2: { product: { id: 2, name: 'Chemex filter', price: 9 }, stock: 3 },
  3: { product: { id: 3, name: 'Gooseneck kettle', price: 45 }, stock: 0 }, // sold out
};

export const CatalogLive = Layer.succeed(Catalog)({
  product: (id) =>
    Effect.gen(function* () {
      yield* Effect.sleep('500 millis'); // pretend it's a network call
      const row = SHELF[id];
      if (row === undefined) return yield* Effect.fail(new NotFound({ id }));
      if (row.stock === 0) return yield* Effect.fail(new SoldOut({ name: row.product.name }));
      return row.product;
    }),
});

// Which product the page is showing. That's app state, so it lives in a service
// (an `AtomRef`), not a React `useState` — the nav *and* the product view both
// read it, and the nav writes it.
export class Route extends Context.Service<
  Route,
  { readonly productId: AtomRef.AtomRef<number>; readonly open: (id: number) => void }
>()('shop/Route') {}

export const RouteLive = Layer.sync(Route)(() => {
  const productId = AtomRef.make(1);
  return { productId, open: (id) => productId.set(id) };
});

// The cart — the canonical case for state in the Effect world. Everything the
// cart *does* lives here: the items, the pending quantity, and the operations on
// them. React never holds any of it — components read these atoms and call these
// methods. `items` is mutated in the product view and read by the header badge:
// two different subtrees, no prop-drilling and no context.
export class Cart extends Context.Service<
  Cart,
  {
    readonly items: AtomRef.AtomRef<ReadonlyArray<Product>>;
    readonly qty: AtomRef.AtomRef<number>;
    readonly total: AtomRef.AtomRef<number>; // derived from `items`
    readonly inc: () => void;
    readonly dec: () => void;
    readonly add: (product: Product) => void;
  }
>()('shop/Cart') {}

export const CartLive = Layer.sync(Cart)(() => {
  const items = AtomRef.make<ReadonlyArray<Product>>([]);
  const qty = AtomRef.make(1);

  // Derived state — computed in the Effect world, not in a component. `total` is
  // a function of `items`, kept in sync: whenever `items` changes, we recompute.
  // Components just read `total`; they never sum anything themselves.
  const total = AtomRef.make(0);
  items.subscribe(() => total.set(items.value.reduce((sum, p) => sum + p.price, 0)));

  return {
    items,
    qty,
    total,
    inc: () => qty.update((n) => n + 1),
    dec: () => qty.update((n) => Math.max(1, n - 1)),
    add: (product) => {
      const n = qty.value;
      items.update((current) => [...current, ...Array<Product>(n).fill(product)]);
      qty.set(1);
    },
  };
});

// One layer for the whole app — compose services with `Layer.mergeAll`.
export const AppLive = Layer.mergeAll(CatalogLive, RouteLive, CartLive);
