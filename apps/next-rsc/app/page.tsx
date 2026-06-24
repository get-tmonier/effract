/**
 * A React Server Component page. The badge is a shared, service-only REC body
 * rendered *on the server* by driving it with an Effect runtime — no client JS
 * for that part. The interactive cards below are client islands of the same
 * shared RECs. One component library, both sides of the RSC boundary.
 */
import type { ReactNode } from 'react';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { driveServerRec } from '@tmonier/effract-rsc/driver';
import { statsBadge } from '@effract/shared/bodies';
import { AppLive } from '@effract/shared/services';
import { Island } from './island.tsx';

// One runtime per server process, providing the shared app layer.
const runtime = ManagedRuntime.make(AppLive);

export default async function Page(): Promise<ReactNode> {
  // Drive a shared REC body as an async Server Component, resolving its Effect
  // service against the runtime above.
  const badge = await driveServerRec(statsBadge(), (effect) =>
    runtime.runPromise(effect as Parameters<typeof runtime.runPromise>[0]),
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 text-slate-100">
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <h1 className="bg-gradient-to-r from-violet-500 to-teal-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          effract
        </h1>
        {badge}
      </header>
      <p className="mt-6 mb-8 leading-relaxed text-slate-400">
        The badge above is a React Server Component — its <code>Stats</code> service was resolved by
        an Effect runtime on the server, with no client JavaScript. The cards below are the same
        shared components, hydrated as client islands.
      </p>
      <Island />
    </main>
  );
}
