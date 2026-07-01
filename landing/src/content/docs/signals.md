---
title: Reactivity
description: State and logic live in Effect services; React only renders. The atom toolkit — atom, yield*, derive, atomFamily, batch — and the hooks that read a local one.
group: Core
order: 3
---

The point of effract: **state, and the logic over it, live in Effect services; React only renders.** No
`useState` threading business rules through a component, no derivation recomputed on every render. A
component reads a service with `yield*` and returns JSX — that is the whole job.

## State in a service

Put reactive state — an `atom` — _inside a service_, so it is reachable from anywhere an Effect runs
(other components, background fibers, the server). Derive values from it _there_, with `derive`, and
expose methods that mutate it. The component only reads and renders.

```tsx
import { atom, derive, rec, type Atom, type ReadableAtom } from '@tmonier/effract';

class Cart extends Context.Service<
  Cart,
  {
    readonly items: Atom<ReadonlyArray<Item>>; // state
    readonly total: ReadableAtom<number>; // derived — computed here, once
    readonly add: (item: Item) => void;
  }
>()('app/Cart') {}

const CartLive = Layer.sync(Cart)(() => {
  const items = atom<ReadonlyArray<Item>>([]);
  const total = items.derive((list) => list.reduce((n, i) => n + i.price, 0));
  return { items, total, add: (item) => items.update((xs) => [...xs, item]) };
});

const CartSummary = rec(function* () {
  const cart = yield* Cart;
  const total = yield* cart.total; // read + subscribe — re-renders only when total changes
  return <button onClick={() => cart.add(coffee)}>add · ${total}</button>;
});
```

No `useState`, no logic in the component — pure render + events.

## Reading an atom — `yield*`

`yield*` an atom in a REC to read its current value **and** subscribe this component to it: it re-renders
precisely when that atom changes, and nothing else does. No hook, no selector, no `Effect.runSync`.

```tsx
const n = yield* cart.count;
```

Read one imperatively (in an event handler or a service method) with `.value`; write it with `.set` /
`.update`.

## `derive` — computed state

For a value computed from **one** atom, use `atom.derive` — the value is handed to you directly, no `$`,
and it chains:

```tsx
const count = items.derive((list) => list.length);
const total = items.derive((list) => list.reduce((n, i) => n + i.price, 0));
const withTax = total.derive((t) => Math.round(t * 1.1)); // chains off a derived atom
```

For a value computed from **several** atoms, the free `derive(($) => …)` tracks exactly the atoms its
selector reads with `$`:

```tsx
const subtotal = derive(($) => $(price) * $(qty)); // two sources
```

Either way it recomputes — and its readers re-render — precisely when a tracked atom changes.

### `derive.writable` — two-way

A computed atom you can also `set`; the write flows back to the sources. For adapters and projections — a
form field over a model, a unit conversion.

```tsx
const fahrenheit = derive.writable(
  ($) => $(celsius) * 1.8 + 32,
  (f) => celsius.set((f - 32) / 1.8),
);
```

### `derive.effect` — async computed

Reads atoms synchronously, returns an Effect. Read in a REC it **suspends** while the effect runs and
refetches when a source changes — carrying the effect's `E`/`R` and the same loading obligation `S` as
[`query`](/docs/loading), which `.suspense(fallback)` discharges.

```tsx
const price = derive.effect(($) => fetchPrice($(sku))); // suspends; refetches when sku changes
```

## `atomFamily` — per-entity state

One lazily-created, memoised atom per key — per-row / per-item state as a lookup rather than one giant
atom you slice. Each reader subscribes to its own atom.

```tsx
const quantityOf = atomFamily((_id: string) => atom(1));
quantityOf('sku-1').update((n) => n + 1); // independent per id
```

## `batch` — coalesced writes

Coalesce a burst of writes into a single notification wave — a derived value reading two atoms both
changed recomputes once, its readers re-render once.

```tsx
batch(() => {
  first.set('Ada');
  last.set('Lovelace');
}); // one re-render, not two
```

## Reading local state in a component

When a value is genuinely local to one component — not owned by a service — read an atom with the hooks;
no `$`:

```tsx
const n = useAtomValue(count); // read one atom (re-renders on change); use yield* in a REC
const twice = useAtomValue(doubled); // read a derived atom — derive it outside the component
const [v, setV] = useAtom(count); // read + write, the useState shape, backed by Effect
<Observe>{($) => <b>{$(count)}</b>}</Observe>; // the inline-JSX form, when you don't hoist a derive
```

`useAtomValue` (read-only) and `useAtomSet` (a stable setter) are the two halves of `useAtom`.

