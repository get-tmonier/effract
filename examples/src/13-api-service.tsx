/**
 * Recipe 13 — an API-backed service: query results, subscribed via atoms.
 *
 * The fetch lives in a service, and its result is exposed as an *atom*. This is
 * where `atom` and `query` meet: `derive.effect` is a read-only atom whose value
 * is produced by an Effect, through the same Suspense + loading-obligation
 * machinery as `query`. So a component reads freshly-fetched data the same way it
 * reads any reactive state — `yield*` — and gets refetch-on-change for free.
 *
 *   Api            — the "backend": an Effect service that returns Effects
 *   Directory      — holds `selectedId` (reactive state) and `profile`
 *                    (`derive.effect` → the API result, keyed by selectedId)
 *   Picker/Profile — components: write the selection, read the fetched atom
 *
 * For data you also need to *mutate* (optimistic updates), fetch into a writable
 * atom instead — see the note at the bottom.
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { atom, derive, mount, rec } from '@tmonier/effract';

interface User {
  readonly id: number;
  readonly name: string;
}

// The "backend" — a service whose methods return Effects (real ones would hit
// the network; retries/timeouts/tracing are just Effect combinators on these).
class Api extends Context.Service<Api>()('recipes/Api', {
  make: Effect.sync(() => ({
    fetchUser: (id: number): Effect.Effect<User> =>
      Effect.promise(
        () =>
          new Promise<User>((resolve) =>
            setTimeout(() => resolve({ id, name: `User #${id}` }), 200),
          ),
      ),
  })),
}) {
  static readonly layer = Layer.effect(Api, Api.make);
}

// The stateful service: it depends on `Api`, holds the current selection as an
// atom, and exposes the fetched profile *as an atom* via `derive.effect`.
class Directory extends Context.Service<Directory>()('recipes/Directory', {
  make: Effect.gen(function* () {
    const api = yield* Api; // a dependency, resolved once
    const selectedId = atom(1); // reactive state
    // The API result, as an atom: reads `selectedId` (synchronously → tracked),
    // calls the API, and suspends while it runs — refetching when the id changes.
    const profile = derive.effect(($) => api.fetchUser($(selectedId)));
    return {
      selectedId,
      profile,
      select: (id: number) => selectedId.set(id),
    };
  }),
}) {
  // `Layer.provide(Api.layer)` supplies the dependency; the layer requires nothing.
  static readonly layer = Layer.effect(Directory, Directory.make).pipe(Layer.provide(Api.layer));
}

// Writes the selection — plain reactive state, no fetching here.
export const Picker = rec(function* () {
  const directory = yield* Directory;
  const id = yield* directory.selectedId;
  return (
    <div>
      {[1, 2, 3].map((n) => (
        <button key={n} type="button" disabled={n === id} onClick={() => directory.select(n)}>
          user {n}
        </button>
      ))}
    </div>
  );
});

// Subscribes to the API-backed atom: suspends while it loads, and re-renders
// (refetching) when the picker changes the selection. No useEffect, no isLoading.
export const Profile = rec(function* () {
  const directory = yield* Directory;
  const user = yield* directory.profile; // the fetched result, read as an atom
  return <p>{user.name}</p>;
}).suspense(<i>loading…</i>); // the loading obligation derive.effect carries

export const App = (): ReactNode =>
  mount(
    Directory.layer,
    rec(function* () {
      return (
        <div>
          {yield* Picker}
          {yield* Profile}
        </div>
      );
    }),
  );

// ── Mutable variant ──────────────────────────────────────────────────────────
// `derive.effect` is read-only. When you need to *change* fetched data locally
// (optimistic edits, manual refresh), keep a writable atom and fill it from an
// Effect in a service method:
//
//   const users = atom<ReadonlyArray<User>>([]);
//   const refresh = () => Effect.runFork(Effect.map(api.list(), users.set));
//   const rename = (id: number, name: string) =>
//     users.update((list) => list.map((u) => (u.id === id ? { ...u, name } : u)));
//
// The component still just `yield* users` — subscribed to the same atom.
