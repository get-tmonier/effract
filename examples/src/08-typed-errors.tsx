/**
 * Recipe 08 — typed errors, rendered.
 *
 * A REC's failures are part of its type: Effect's error channel `E` rides along
 * with every `yield*`. `.catch` turns that channel into an exhaustive,
 * compile-checked map of fallbacks — one per error `_tag`, each handed exactly
 * that error. Forget a case and it will not compile; there is no `try`/`catch`,
 * no `error instanceof`, no untyped error boundary. What you get back is a plain
 * REC — `yield*` or `mount` it anywhere — whose declared failures are handled.
 */
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { rec, mount } from '@tmonier/effract';

// Tagged errors — the shape `.catch` dispatches on.
class NotFound extends Data.TaggedError('NotFound')<{ readonly id: number }> {}
class Unauthorized extends Data.TaggedError('Unauthorized')<{ readonly reason: string }> {}

interface User {
  readonly name: string;
}

// A service whose method fails with a *typed union* — the shape `.catch` shines on.
class Users extends Context.Service<
  Users,
  {
    readonly byId: (id: number) => Effect.Effect<User, NotFound | Unauthorized>;
  }
>()('recipes/Users') {}

const UsersLive = Layer.succeed(Users)({
  byId: (id) => (id === 1 ? Effect.succeed({ name: 'Ada' }) : Effect.fail(new NotFound({ id }))),
});

// The body can fail with `NotFound | Unauthorized`, so `.catch` must handle both
// — and each handler receives exactly its own error, fully typed.
export const Profile = rec(function* () {
  const users = yield* Users;
  const user = yield* users.byId(2); // this id is missing → fails with NotFound
  return <h2>Welcome, {user.name}</h2>;
}).catch({
  NotFound: (e) => <p>No user #{e.id}.</p>,
  Unauthorized: (e) => <p>Please sign in ({e.reason}).</p>,
});

// `Profile` is a plain REC now — its failures are discharged — so this just works.
export const App = mount(UsersLive, Profile);
