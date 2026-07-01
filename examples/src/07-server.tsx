/**
 * Recipe 07 — render on the server. Same `mount`, same import.
 *
 * A hook-free REC (it only reads services) is universal — the very value you
 * would `mount` on the client. In a React Server Component graph, the bundler's
 * `react-server` condition hands `mount` its server implementation: it drives the
 * tree on the server (no client JS) and returns an async component you export or
 * place. Same import (`@tmonier/effract`), same call — you never choose client vs
 * server; where the module runs decides. (A REC that used `hook(...)` couldn't
 * come here: `hook` isn't even exported from the server build.)
 */
import { rec, mount } from '@tmonier/effract';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

class Session extends Context.Service<Session, { readonly user: string }>()('recipes/Session') {}
const SessionLive = Layer.succeed(Session)({ user: 'Ada' });

// Authored once. The same value mounts on the client, too.
const Header = rec(function* () {
  const session = yield* Session;
  return <header>Signed in as {session.user}</header>;
});

// The page is a REC; children are composed with `yield*` — no runtime in the markup.
const PageView = rec(function* () {
  return <main>{yield* Header}</main>;
});

// The one boundary — the very same call a client root makes. A framework default-exports this.
export const Page = mount(SessionLive, PageView);
