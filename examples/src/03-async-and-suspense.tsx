/**
 * Recipe 03 — async data, suspended.
 *
 * Reading an asynchronous effect with `yield*` suspends the component through
 * React Suspense and resumes inline once the value is ready. There is no
 * `useEffect`, no `isLoading` flag, no manual state machine — the runtime and
 * React do the waiting.
 */
import { Suspense, type ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { Runtime, component } from '@tmonier/effract';

class Api extends Context.Service<Api, { readonly user: Effect.Effect<string> }>()('recipes/Api') {}
const ApiLive = Layer.succeed(Api)({
  user: Effect.map(Effect.sleep(Duration.millis(200)), () => 'Ada'),
});

export const Profile = component(function* () {
  const api = yield* Api;
  const name = yield* api.user; // ← async: suspends here, resumes with the value
  return <h2>Welcome, {name}</h2>;
});

export const App = (): ReactNode => (
  <Runtime layer={ApiLive}>
    <Suspense fallback={<p>loading…</p>}>
      <Profile />
    </Suspense>
  </Runtime>
);
