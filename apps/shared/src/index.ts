/**
 * The shared example surface: composed services + layer, and the React Effect
 * Components every example renders.
 */
export {
  Config,
  Stats,
  Greeter,
  Store,
  ConfigLive,
  StatsLive,
  GreeterLive,
  StoreLive,
  AppLive,
} from './services.ts';
export type { Todo } from './services.ts';
// The universal, service-only badge — the very value `page.tsx` `serve`s on the
// server is what the client tree yields. Also re-exported from `./recs.tsx`.
export { StatsBadge } from './universal.tsx';
export { Counter, Likes, Todos, Greeting, Dashboard } from './recs.tsx';
