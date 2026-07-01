/**
 * A React Server Component page — and it imports the *same* `mount` a client
 * file does, from `@tmonier/effract`. Because this module is in the server
 * (RSC) graph, the bundler's `react-server` condition hands it the server
 * `mount`, which drives the tree on the server with no client JS. The page is a
 * REC: it composes the shared `StatsBadge` with `yield*` — exactly as the client
 * tree does — and places the interactive `<Island />` as a plain client
 * component. Nothing about the composition changes between client and server.
 */
import { rec, mount } from '@tmonier/effract';
import { StatsBadge } from '@effract/shared/universal';
import { AppLive } from '@effract/shared/services';
import { Island } from './island.tsx';

const Page = rec(function* () {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 text-slate-100">
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <h1 className="bg-gradient-to-r from-violet-500 to-teal-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          effract
        </h1>
        {/* resolved on the server against AppLive — no client JavaScript */}
        {yield* StatsBadge}
      </header>
      <p className="mt-6 mb-8 leading-relaxed text-slate-400">
        The badge above is a React Server Component — its <code>Stats</code> service was resolved by
        an Effect runtime on the server, with no client JavaScript. The cards below are the same
        shared components, hydrated as client islands.
      </p>
      {/* a plain client component (its own 'use client' island) */}
      <Island />
    </main>
  );
});

// The one boundary — the very same call a client root makes.
export default mount(AppLive, Page);
