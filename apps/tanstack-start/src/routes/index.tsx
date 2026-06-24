/**
 * The TanStack Start home route. It renders the very same `<Dashboard />` the
 * SPA and Bun SSR mount, behind the same `AppLive` runtime — server-rendered by
 * TanStack Start, then hydrated. Nothing about the components changed.
 */
import type { ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Runtime } from '@tmonier/effract';
import { AppLive, Dashboard } from '@effract/shared';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home(): ReactNode {
  return (
    <Runtime layer={AppLive}>
      <Dashboard />
    </Runtime>
  );
}
