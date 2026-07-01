/**
 * Recipe 03 — async data, suspended (the raw escape hatch).
 *
 * Reading an asynchronous effect with `yield*` suspends the component through
 * React Suspense and resumes inline once the value is ready. There is no
 * `useEffect`, no `isLoading` flag, no manual state machine — the runtime and
 * React do the waiting.
 *
 * This is the *escape hatch*: it suspends, but nothing tracks it, so you bring
 * your own `<Suspense>`. For real async data reach for `query` (recipe 09) — it
 * carries a loading obligation the type makes you handle, refetches on a key, and
 * cancels on unmount. `derive.effect` (recipe 11) is the same, held in a service.
 */
import { Suspense, type ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { rec, mount } from '@tmonier/effract';

class Api extends Context.Service<Api, { readonly user: Effect.Effect<string> }>()('recipes/Api') {}
const ApiLive = Layer.succeed(Api)({
  user: Effect.map(Effect.sleep(Duration.millis(200)), () => 'Ada'),
});

// A REC: it reads a service (and an async one), so it earns the `rec(...)`.
export const Profile = rec(function* () {
  const api = yield* Api;
  const name = yield* api.user; // ← async: suspends here, resumes with the value
  return <h2>Welcome, {name}</h2>;
});

// `<Suspense>` is plain React — no REC needed. It wraps the mounted Profile.
export const App = (): ReactNode => (
  <Suspense fallback={<p>loading…</p>}>{mount(ApiLive, Profile)}</Suspense>
);
