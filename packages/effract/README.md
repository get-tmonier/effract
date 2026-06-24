# @tmonier/effract

Write React components as Effect programs. The same component runs in a SPA, on a Bun/Node server, in a Web
Worker, or as a React Server Component.

```tsx
import { Runtime, component, hook } from '@tmonier/effract';
import { useState } from 'react';

const Dashboard = component(function* () {
  const stats = yield* Stats; // an Effect service
  const [tab, setTab] = yield* hook(useState('overview')); // a real React hook
  return <Panel tab={tab} total={stats.total} onTab={setTab} />;
});

export const App = () => (
  <Runtime layer={AppLive}>
    <Dashboard />
  </Runtime>
);
```

- `component` / `view` — hook-capable and resolve-up-front components.
- `hook` — lift a React hook into the `yield*` channel.
- `<Runtime layer={...}>` — provide an Effect runtime to a subtree.
- `atom`, `observe`, `<Observe>`, `useAtom` — the signals bridge.

See the [project README](https://github.com/get-tmonier/effract#readme) and
[ADR 0001](https://github.com/get-tmonier/effract/blob/main/docs/adr/0001-fiber-reconciliation.md).

MIT © Tmonier
