'use client';

/**
 * The interactive island. These are the SAME shared RECs the SPA and Bun SSR
 * render — here they hydrate on the client under a browser `<Runtime>`, while
 * the page shell around them was a React Server Component.
 */
import type { ReactNode } from 'react';
import { Runtime } from '@tmonier/effract';
import { AppLive, Counter, Likes, Todos } from '@effract/shared';

export function Island(): ReactNode {
  return (
    <Runtime layer={AppLive}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Counter />
        <Likes />
        <Todos />
      </div>
    </Runtime>
  );
}
