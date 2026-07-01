import type { CSSProperties } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { atom, batch, derive, rec, type Atom, type ReadableAtom } from '@tmonier/effract';

/**
 * effract — logic in Effect, React for render.
 *
 * Everything below the line is UI: components that only `yield*` service state and
 * render it. There is no `useState` and no logic in a component. All of it — the
 * items, the derived totals, the mutations — lives in the `Cart` service, an
 * ordinary Effect value you could test, share, or run on the server unchanged.
 */

// ── The logic: a stateful service ────────────────────────────────────────────

interface Item {
  readonly name: string;
  readonly price: number;
}

const MENU: ReadonlyArray<Item> = [
  { name: '☕ espresso', price: 3 },
  { name: '🥐 croissant', price: 4 },
  { name: '🍵 matcha', price: 5 },
];

export class Cart extends Context.Service<
  Cart,
  {
    readonly items: Atom<ReadonlyArray<Item>>;
    readonly count: ReadableAtom<number>; // derived — computed in the service
    readonly total: ReadableAtom<number>; // derived
    readonly add: (item: Item) => void;
    readonly addRound: () => void; // many writes, one notification (batch)
    readonly clear: () => void;
  }
>()('demo/Cart') {}

export const AppLive = Layer.sync(Cart)(() => {
  const items = atom<ReadonlyArray<Item>>([]);
  const count = derive(($) => $(items).length);
  const total = derive(($) => $(items).reduce((sum, item) => sum + item.price, 0));
  return {
    items,
    count,
    total,
    add: (item) => items.update((xs) => [...xs, item]),
    // Adds three items but notifies subscribers once — one re-render, not three.
    addRound: () =>
      batch(() => {
        for (const item of MENU) {
          items.update((xs) => [...xs, item]);
        }
      }),
    clear: () => items.set([]),
  };
});

// ── The UI: pure render + events, no state, no logic ─────────────────────────

const button: CSSProperties = {
  font: '600 14px system-ui',
  padding: '8px 12px',
  marginRight: 8,
  borderRadius: 8,
  border: '1px solid #d4d4d8',
  background: '#fff',
  cursor: 'pointer',
};

const Menu = rec(function* () {
  const cart = yield* Cart;
  return (
    <div>
      {MENU.map((item) => (
        <button key={item.name} type="button" style={button} onClick={() => cart.add(item)}>
          {item.name} · ${item.price}
        </button>
      ))}
    </div>
  );
});

const Summary = rec(function* () {
  const cart = yield* Cart;
  const count = yield* cart.count; // reactive read of a derived atom — re-renders precisely
  const total = yield* cart.total;
  return (
    <div style={{ marginTop: 20 }}>
      <strong style={{ fontSize: 18 }}>
        {count} item{count === 1 ? '' : 's'} · ${total}
      </strong>
      <div style={{ marginTop: 12 }}>
        <button type="button" style={button} onClick={() => cart.addRound()}>
          add a round (batch)
        </button>
        <button type="button" style={button} onClick={() => cart.clear()}>
          clear
        </button>
      </div>
    </div>
  );
});

export const App = rec(function* () {
  return (
    <main style={{ font: '15px system-ui', color: '#18181b', padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>effract</h1>
      <p style={{ color: '#71717a', margin: '0 0 20px' }}>
        Logic in Effect, React for render — all state lives in the <code>Cart</code> service; the
        components only <code>yield*</code> and render.
      </p>
      {yield* Menu}
      {yield* Summary}
    </main>
  );
});
