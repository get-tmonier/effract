---
title: Signals
description: observe, atom, and useAtom — precise reactivity over Effect's AtomRef.
group: Core
order: 3
---

effract bridges Effect's reactive cell (`AtomRef`) to React with surgical re-renders — and no stray
`Effect.runSync` at the call site.

## `atom` and `observe`

`atom` creates a reactive cell. `observe` reads one (or several) and subscribes the component
**precisely** — it re-renders only when an atom it actually read changes.

```tsx
import { atom, observe } from '@tmonier/effract';

const count = atom(0);

const doubled = observe(($) => $(count) * 2); // re-renders only when count changes
```

## `useAtom`

Read and write a single atom, the `useState` shape — backed by Effect:

```tsx
const [n, setN] = useAtom(count);
```

There's also `useAtomValue` (read-only) and `useAtomSet` (a stable setter).

## `<Observe>`

The render-prop form, for inline reactive values inside JSX:

```tsx
<Observe>{($) => <b>{$(count)}</b>}</Observe>
```

## State inside a service

For app state, put the atoms _inside a service_ so they're reachable from anywhere an Effect runs:

```tsx
class Store extends Context.Service<Store, { likes: AtomRef.AtomRef<number>; like: () => void }>()(
  'app/Store',
) {}

const StoreLive = Layer.sync(Store)(() => {
  const likes = AtomRef.make(0);
  return { likes, like: () => likes.update((n) => n + 1) };
});

// in a component:
const store = yield* Store;
const likes = yield* hook(observe(($) => $(store.likes)));
```

The component reads reactive state via `observe` and mutates it by calling a real service method.
