/**
 * Recipe 06 — composing layers.
 *
 * Services depend on services. `Db` is built from `Config` with `Layer.effect`;
 * `Layer.provide` feeds Config into Db; `Layer.mergeAll` assembles the app layer
 * `mount` receives. The component just reads the finished result — all
 * the wiring is ordinary Effect, and the same layer drives client and server.
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { rec, mount } from '@tmonier/effract';

class Config extends Context.Service<Config, { readonly url: string }>()('recipes/Config') {}
const ConfigLive = Layer.succeed(Config)({ url: 'postgres://localhost/app' });

class Db extends Context.Service<Db, { readonly describe: () => string }>()('recipes/Db') {}
const DbLive: Layer.Layer<Db, never, Config> = Layer.effect(Db)(
  Effect.gen(function* () {
    const config = yield* Config; // Db is built *from* Config
    return { describe: () => `connected to ${config.url}` };
  }),
);

// Provide Config into Db, then merge both so components can read either.
const AppLive = Layer.mergeAll(ConfigLive, Layer.provide(DbLive, ConfigLive));

export const Health = rec(function* () {
  const db = yield* Db;
  return <code>{db.describe()}</code>;
});

export const App = (): ReactNode => mount(AppLive, Health);
