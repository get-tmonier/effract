import type { ReactNode } from 'react';
import { Observe, hook, mount, query, rec, useAtomValue } from '@tmonier/effract';
import { AppLive, Cart, Catalog, Route } from './services';

const btn =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold ' +
  'transition-colors hover:bg-slate-50 disabled:cursor-default cursor-pointer';
const btnDark = 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800';

// Plain React — the frame. Nothing here holds state or logic; it's pure render.
const Card = ({ children }: { children: ReactNode }): ReactNode => (
  <div className="min-w-[340px] rounded-2xl border border-slate-200 p-6 shadow-xl shadow-slate-900/10">
    {children}
  </div>
);

// The header badge reads the cart — mutated over in the product view, a different
// subtree, with no prop passed here. It reads `total`, which the service *derives*
// from `items`; the component sums nothing. `<Observe>` is the inline-JSX sugar:
// it re-renders just this badge, precisely when what it reads changes.
const CartBadge = rec(function* () {
  const cart = yield* Cart;
  return (
    <Observe>
      {($) => (
        <span className="text-sm text-slate-500">
          🛒 {$(cart.items).length} · ${$(cart.total)}
        </span>
      )}
    </Observe>
  );
});

// The nav reads the current route into a variable with `useAtomValue`, and writes
// it back through a service method. No React state.
const Nav = rec(function* () {
  const route = yield* Route;
  const id = yield* hook(useAtomValue(route.productId));
  return (
    <div className="my-3.5 flex gap-1.5">
      {[1, 2, 3, 9].map((n) => (
        <button
          key={n}
          onClick={() => route.open(n)}
          disabled={n === id}
          className={`${btn} ${n === id ? btnDark : ''}`}
        >
          {n === 9 ? 'missing' : `#${n}`}
        </button>
      ))}
    </div>
  );
});

// The product view reads the selected id and the pending quantity from services,
// fetches that product (async → suspends), and dispatches to service methods.
// Because the fetch is typed to fail with `NotFound | SoldOut`, it *must* render a
// fallback for each — checked at compile time. There is no React state anywhere:
// the quantity lives in the cart service, so the component is pure render + events.
const ProductView = rec(function* () {
  const route = yield* Route;
  const cart = yield* Cart;
  const catalog = yield* Catalog;
  const id = yield* hook(useAtomValue(route.productId));
  const product = yield* query(catalog.product(id), id); // refetch when the route changes
  const qty = yield* hook(useAtomValue(cart.qty));
  return (
    <div>
      <p className="text-lg">
        <strong>{product.name}</strong> — ${product.price}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button className={btn} onClick={() => cart.dec()}>
          −
        </button>
        <span className="w-4 text-center tabular-nums">{qty}</span>
        <button className={btn} onClick={() => cart.inc()}>
          +
        </button>
        <button className={`${btn} ${btnDark} ml-1`} onClick={() => cart.add(product)}>
          add {qty} to cart
        </button>
      </div>
    </div>
  );
})
  .catch({
    NotFound: (e) => <p className="text-red-700">No product #{e.id}.</p>,
    SoldOut: (e) => <p className="text-red-700">{e.name} is sold out.</p>,
  })
  .suspense(<p className="text-slate-400">loading…</p>);

// A props-free page composes the pieces with `yield*`. Its loading obligation is
// already discharged (ProductView is `.suspense`d), so `mount` needs no `{ loading }`.
const Page = rec(function* () {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <strong className="text-[15px]">☕ effract coffee</strong>
        {yield* CartBadge}
      </div>
      {yield* Nav}
      {yield* ProductView}
    </Card>
  );
});

// One boundary — `mount` supplies the runtime and checks, at compile time, that
// `AppLive` provides every service the tree needs.
export const App = mount(AppLive, Page);
