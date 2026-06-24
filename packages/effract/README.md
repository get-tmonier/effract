# @tmonier/effract

Write React components as Effect programs. The same component runs in a SPA, on a Bun/Node server, in a Web
Worker, or as a React Server Component.

```tsx
import { mount, rec, hook } from '@tmonier/effract';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';

// Panel is a PLAIN React component — an ordinary function, used as JSX, left untouched
// Dashboard is a REC — it reaches for a service, so it's written with `rec(...)`
const Dashboard = rec(function* () {
  const stats = yield* Stats; // an Effect service
  const [tab, setTab] = yield* hook(useState('overview')); // a real React hook
  return <Panel tab={tab} total={stats.total} onTab={setTab} />;
});

// wire the runtime in once at the boundary — `mount` returns a ReactNode
createRoot(document.getElementById('root')!).render(mount(AppLive, Dashboard));
```

effract is **incremental, not a rewrite.** Plain React components stay exactly as they are (ordinary
`<Component />` JSX). You write a REC with `rec(...)` _only_ where a component reaches for the runtime,
and place one by `yield*`-ing it: `{yield* Dashboard}`, or `{yield* Dashboard.with({ ... })}` with props.

- `component` / `view` — hook-capable and resolve-up-front RECs. A REC is **not** a JSX element; place it
  with `{yield* Rec}` inside another component's JSX.
- `hook` — lift a React hook into the `yield*` channel.
- `mount(layer, RootRec)` — build the Effect runtime once and return a `ReactNode` to render. Verifies at
  compile time that the layer provides every service the tree needs.
- `atom`, `observe`, `<Observe>`, `useAtom` — the signals bridge.

See the [project README](https://github.com/get-tmonier/effract#readme) and
[ADR 0001](https://github.com/get-tmonier/effract/blob/main/docs/adr/0001-fiber-reconciliation.md).

MIT © Tmonier
