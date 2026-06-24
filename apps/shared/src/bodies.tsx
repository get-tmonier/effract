/**
 * Server-safe REC bodies. These import nothing client-only (no hooks, no
 * `@tmonier/effract` runtime) — just services and JSX — so they can be driven
 * on the server as React Server Components *and* wrapped on the client. The
 * same generator runs in both places.
 */
import { Stats } from './services.ts';

/** A service-only body: reads `Stats`, returns markup. Runs anywhere. */
export function* statsBadge() {
  const stats = yield* Stats;
  return (
    <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm text-slate-400">
      <strong className="text-slate-100">{stats.online}</strong> online ·{' '}
      <strong className="text-slate-100">{stats.total}</strong> total
    </span>
  );
}
