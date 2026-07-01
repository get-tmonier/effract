/**
 * Universal RECs — authored once, rendered on any runtime.
 *
 * A service-only `rec(...)` body imports nothing client-only (no hooks, no
 * runtime), so the *same value* drives both ways: yielded into a tree under
 * `mount` on the client, and driven by `serve` (or streamed as Flight) on the
 * server, with no client JavaScript. There is no separate "server form" and no
 * separate "body" to keep in sync — this one declaration is the component.
 *
 * A component that needs a React hook cannot be universal (RSC has no hooks);
 * those live in `recs.tsx` as client RECs. That line is the honest boundary,
 * and effract keeps it in one place instead of three.
 */
import { rec } from '@tmonier/effract';
import { Stats } from './services.ts';

/** A service-only badge: reads `Stats`, renders markup. Runs anywhere. */
export const StatsBadge = rec(function* statsBadge() {
  const stats = yield* Stats;
  return (
    <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm text-slate-400">
      <strong className="text-slate-100">{stats.online}</strong> online ·{' '}
      <strong className="text-slate-100">{stats.total}</strong> total
    </span>
  );
});
