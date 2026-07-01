/**
 * Recipe 09 — async data with a loading obligation.
 *
 * `query(effect, key?)` declares an asynchronous data dependency. It suspends the
 * render for the value, refetches when `key` changes (by value), and interrupts
 * the in-flight fiber if the component unmounts. Unlike a raw `yield* effect`, a
 * query also contributes a *loading obligation* to the REC's type: `mount` will
 * not compile until it is handled — with `.suspense(fallback)` in the tree, or
 * `{ loading }` at the boundary. Retries, timeouts and cancellation need no new
 * API; they are ordinary Effect combinators on the effect you pass to `query`.
 */
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { mount, query, rec } from '@tmonier/effract';

class Api extends Context.Service<Api, { readonly user: (id: number) => Effect.Effect<string> }>()(
  'recipes/Api',
) {}
const ApiLive = Layer.succeed(Api)({
  user: (id) => Effect.map(Effect.sleep(Duration.millis(200)), () => `user-${id}`),
});

// The query drives loading, refetch (on `id`), and cancellation. A timeout is
// just an Effect combinator on the effect — no extra query option.
export const Profile = rec(function* (props: { id: number }) {
  const api = yield* Api;
  const name = yield* query(api.user(props.id).pipe(Effect.timeout('2 seconds')), props.id);
  return <h2>Welcome, {name}</h2>;
});

// A props-free page composes the profile. It inherits the loading obligation…
export const Page = rec(function* () {
  return <main>{yield* Profile.with({ id: 1 })}</main>;
});

// …which `.suspense` discharges here — one boundary for the whole subtree. (You
// could instead write `mount(ApiLive, Page, { loading: <p>loading…</p> })`.)
export const App = mount(ApiLive, Page.suspense(<p>loading…</p>));
