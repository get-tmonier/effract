---
title: The runtime
description: Services, layers, and the <Runtime> boundary — where server vs client lives.
group: Core
order: 1
---

The `<Runtime>` boundary builds an Effect `ManagedRuntime` once from a `Layer` and provides it to a
React subtree. This is the seam where "server vs client" lives: the same components run wherever you
provide a runtime.

```tsx
<Runtime layer={AppLive}>
  <Dashboard />
</Runtime>
```

Services resolve up-front into the runtime's context, so reading one inside a component is a
synchronous lookup — not an async round-trip.

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
