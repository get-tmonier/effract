/**
 * The Vite SPA example. The runtime is a browser layer; the components are the
 * shared RECs. Nothing about them is SPA-specific — the same `<Dashboard />`
 * also renders on Bun, in TanStack Start, and as RSC.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Runtime } from '@tmonier/effract';
import { AppLive, Dashboard } from '@effract/shared';
import './styles.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('missing #root');
}

createRoot(root).render(
  <StrictMode>
    <Runtime layer={AppLive}>
      <Dashboard />
    </Runtime>
  </StrictMode>,
);
