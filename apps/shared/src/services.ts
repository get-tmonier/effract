/**
 * The services every example shares — and a real taste of Effect: a service
 * that depends on another (`Greeter` needs `Config`), a synchronous service
 * (`Stats`), and a genuinely *stateful* one (`Store`) whose reactive cells the
 * signals bridge observes. `AppLive` composes them, wiring `Config` into
 * `Greeter` with `Layer.provide`.
 *
 * Provide `AppLive` to `mount(AppLive, App)` (client/SSR) or a Flight render (RSC)
 * and the same components light up. That is the whole demonstration.
 */
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { atom } from '@tmonier/effract';

// --- Config: app constants, and a dependency of Greeter -----------------------

export class Config extends Context.Service<
  Config,
  { readonly appName: string; readonly tagline: string }
>()('shared/Config') {}

export const ConfigLive: Layer.Layer<Config> = Layer.succeed(Config)({
  appName: 'effract',
  tagline: 'React components, written as Effect programs.',
});

// --- Stats: a synchronous service, resolved the instant a component reads it ---

export class Stats extends Context.Service<
  Stats,
  { readonly total: number; readonly online: number }
>()('shared/Stats') {}

export const StatsLive: Layer.Layer<Stats> = Layer.succeed(Stats)({ total: 1280, online: 42 });

// --- Greeter: async, and built FROM Config (service-to-service dependency) -----

export class Greeter extends Context.Service<
  Greeter,
  { readonly greet: (name: string) => Effect.Effect<string> }
>()('shared/Greeter') {}

export const GreeterLive: Layer.Layer<Greeter, never, Config> = Layer.effect(Greeter)(
  Effect.gen(function* () {
    const config = yield* Config;
    return {
      greet: (name) =>
        Effect.map(
          Effect.sleep(Duration.millis(280)),
          () => `${config.appName} says hello, ${name} — resolved by an Effect runtime.`,
        ),
    };
  }),
);

// --- Store: stateful, holding reactive atoms + a derived value the bridge reads --

export interface Todo {
  readonly id: number;
  readonly text: string;
  readonly done: boolean;
}

// The shape is inferred from `make`; the Live layer is a `static`. `make` is an
// Effect (here sync), so a service that needs *other* services would `Effect.gen`
// and `yield*` them, then `Layer.provide` on the layer — exactly like `Greeter`.
export class Store extends Context.Service<Store>()('shared/Store', {
  make: Effect.sync(() => {
    const likes = atom(0);
    const todos = atom<ReadonlyArray<Todo>>([
      { id: 1, text: 'Read a service with yield*', done: true },
      { id: 2, text: 'Keep all state in the service', done: true },
      { id: 3, text: 'Run the same component on the server', done: false },
    ]);
    const draft = atom('');
    const remaining = todos.derive((list) => list.filter((todo) => !todo.done).length); // derived
    let nextId = 4;
    const addTodo = (text: string): void => {
      const id = nextId;
      nextId += 1;
      todos.update((list) => [...list, { id, text, done: false }]);
    };
    return {
      likes,
      todos,
      draft,
      remaining,
      like: (): void => {
        likes.update((n) => n + 1);
      },
      addTodo,
      toggleTodo: (id: number): void => {
        todos.update((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
      },
      setDraft: (text: string): void => {
        draft.set(text);
      },
      // Read + write atoms straight from the runtime — no component involved.
      submitDraft: (): void => {
        const text = draft.value.trim();
        if (text.length > 0) {
          addTodo(text);
          draft.set('');
        }
      },
    };
  }),
}) {
  static readonly layer = Layer.effect(Store, Store.make);
}

// --- AppLive: the composition. Greeter receives Config; everything is merged. --

export const AppLive: Layer.Layer<Stats | Greeter | Store | Config> = Layer.mergeAll(
  StatsLive,
  Store.layer,
  ConfigLive,
  Layer.provide(GreeterLive, ConfigLive),
);
