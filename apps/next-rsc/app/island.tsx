'use client';

/**
 * The interactive island. These are the SAME shared client RECs the SPA and Bun
 * SSR render — composed here into one island REC and handed to `mount`, which
 * provides the browser runtime and checks the tree's services at compile time.
 * The page shell around this island was a React Server Component.
 */
import type { ReactNode } from 'react';
import { rec, mount } from '@tmonier/effract';
import { AppLive, Counter, Likes, Todos } from '@effract/shared';

/** Composes the shared client RECs into the island's grid. */
const IslandView = rec(function* () {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {yield* Counter}
      {yield* Likes}
      {yield* Todos}
    </div>
  );
});

export function Island(): ReactNode {
  return mount(AppLive, IslandView);
}
