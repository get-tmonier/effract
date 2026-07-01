---
title: The runtime
description: Services, layers, and wiring it in with mount — where server vs client lives.
group: Core
order: 1
---

`mount` builds an Effect `ManagedRuntime` once from a `Layer` and returns a `ReactNode` for your root
REC. This is the seam where "server vs client" lives: the same components run wherever you provide a
runtime.

```tsx
import { mount } from '@tmonier/effract';
import { createRoot } from 'react-dom/client';

createRoot(el).render(mount(AppLive, Dashboard));
```

`mount(AppLive, Dashboard)` verifies _at compile time_ that `AppLive` provides every service the tree
needs — a missing service is a type error that names the service. Services then resolve up-front into
the runtime's context, so reading one inside a component is a synchronous lookup — not an async
round-trip.

On the server it's the **same call from the same package**: `mount(layer, Root)`. In a React Server
Component graph the bundler hands `mount` a server implementation (it renders on the server, no client
JS, `export default mount(AppLive, Page)`); everywhere else it renders interactively. The same
`rec(...)` value renders on both — see [Client & server](/docs/client-and-server/).

## Defining a service

```tsx
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

class Stats extends Context.Service<Stats, { total: number; online: number }>()('app/Stats') {}

const StatsLive = Layer.succeed(Stats)({ total: 1280, online: 42 });
```

## Composing layers

Services can depend on services. Build one _from_ another with `Layer.effect`, wire it with
`Layer.provide`, and assemble everything with `Layer.mergeAll`:

```tsx
import * as Effect from 'effect/Effect';

class Config extends Context.Service<Config, { appName: string }>()('app/Config') {}
const ConfigLive = Layer.succeed(Config)({ appName: 'effract' });

class Greeter extends Context.Service<Greeter, { greet: (n: string) => Effect.Effect<string> }>()(
  'app/Greeter',
) {}

const GreeterLive = Layer.effect(
  Greeter,
)(
  Effect.gen(function* () {
    const config = yield* Config; // Greeter depends on Config
    return { greet: (n) => Effect.succeed(`${config.appName}: hi ${n}`) };
  }),
);

// provide Config into Greeter, then merge everything for the app
export const AppLive = Layer.mergeAll(ConfigLive, Layer.provide(GreeterLive, ConfigLive));
```

The component just reads the finished result — all the wiring is ordinary Effect, and the same layer
drives the client and the server.

## Escape hatch

Need the underlying runtime for imperative work? `useEffractRuntime()` returns the `ManagedRuntime`,
so you can `runPromise`/`runFork` from an event handler.
