/**
 * Recipe 08 — a React Server Component.
 *
 * The same service-only body a client `component` would accept becomes an
 * `async` Server Component with `serverComponent`: it awaits each yielded effect
 * against a per-request runtime — no hooks, no client JS. `renderToFlightStream`
 * drives it with that runtime and streams standard Flight, which the ordinary
 * React client hydrates.
 */
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { renderToFlightStream, serverComponent } from '@tmonier/effract-rsc';

class Session extends Context.Service<Session, { readonly user: string }>()('recipes/Session') {}
const SessionLive = Layer.succeed(Session)({ user: 'Ada' });

// Service-only body — identical in shape to a client REC.
export const Header = serverComponent(function* () {
  const session = yield* Session;
  return <header>Signed in as {session.user}</header>;
});

// On the server: build a runtime and stream the component as Flight.
export function renderHeaderToFlight(): ReadableStream<Uint8Array> {
  const runtime = ManagedRuntime.make(SessionLive);
  return renderToFlightStream(<Header />, { runtime });
}
