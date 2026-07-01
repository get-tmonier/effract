import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { atom } from '@tmonier/effract';

// Typed errors — a product lookup fails in ways the UI renders per case.
export class NotFound extends Data.TaggedError('NotFound')<{ readonly id: number }> {}
export class SoldOut extends Data.TaggedError('SoldOut')<{ readonly name: string }> {}

export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
}

// The catalog: look up a product by id. A constant service (methods, no state) —
// so it's a plain `Layer.succeed`. The method is async and can fail, which is what
// `query` + `.catch` justify each other on.
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
// (an `atom`), not React `useState` — the nav *and* the product view both read it
// with `yield*`, and the nav writes it. Declared the idiomatic way: the shape is
// inferred from `make`, and the Live layer is a `static`.
export class Route extends Context.Service<Route>()('shop/Route', {
  make: Effect.sync(() => {
    const productId = atom(1);
    return { productId, open: (id: number) => productId.set(id) };
  }),
}) {
  static readonly layer = Layer.effect(Route, Route.make);
}

// The cart — the canonical case for state in the Effect world. Everything the
// cart *does* lives here: the items, the pending quantity, and the operations on
// them. `total` is *derived* from `items` with `items.derive` — computed in the
// service, kept in sync, never summed in a component. `items` is mutated in the
// product view and read by the header badge: two subtrees, no prop-drilling.
export class Cart extends Context.Service<Cart>()('shop/Cart', {
  make: Effect.sync(() => {
    const items = atom<ReadonlyArray<Product>>([]);
    const qty = atom(1);
    const total = items.derive((list) => list.reduce((sum, p) => sum + p.price, 0));
    return {
      items,
      qty,
      total,
      inc: () => qty.update((n) => n + 1),
      dec: () => qty.update((n) => Math.max(1, n - 1)),
      add: (product: Product) => {
        const n = qty.value;
        items.update((current) => [...current, ...Array<Product>(n).fill(product)]);
        qty.set(1);
      },
    };
  }),
}) {
  static readonly layer = Layer.effect(Cart, Cart.make);
}

// One layer for the whole app — compose the services with `Layer.mergeAll`.
export const AppLive = Layer.mergeAll(CatalogLive, Route.layer, Cart.layer);
