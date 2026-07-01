# @tmonier/effract

Write React components as Effect programs. The same component — and the same `mount` — runs in a SPA,
during SSR, or as a React Server Component. One package, one import; the client/server split is chosen
by the bundler, never by you.

**Docs & guide → [effract.tmonier.com](https://effract.tmonier.com)**

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

- `rec` / `view` — hook-capable and resolve-up-front RECs. A REC is **not** a JSX element; place it
  with `{yield* Rec}` inside another component's JSX.
- `hook` — lift a React hook into the `yield*` channel.
- `mount(layer, RootRec)` — the one boundary, client **and** server. Builds the Effect runtime once and
  verifies at compile time that the layer provides every service the tree needs. In a React Server
  Component graph the bundler's `react-server` condition gives it a server implementation (renders on the
  server, no client JS); everywhere else it renders interactively. Same import in every file.
- `atom`, `observe`, `<Observe>`, `useAtom` — the signals bridge (client).

See the [project README](https://github.com/get-tmonier/effract#readme) and
[ADR 0001](https://github.com/get-tmonier/effract/blob/main/docs/adr/0001-fiber-reconciliation.md).

MIT © Tmonier
