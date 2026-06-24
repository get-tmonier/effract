/**
 * Hydration. The server streamed the shared RECs as HTML; here the very same
 * `<Dashboard />`, under the very same `AppLive` runtime, hydrates them into a
 * live, interactive app. One component description, two runtimes.
 */
import { hydrateRoot } from 'react-dom/client';
import { Runtime } from '@tmonier/effract';
import { AppLive, Dashboard } from '@effract/shared';

const root = document.getElementById('root');
if (root !== null) {
  hydrateRoot(
    root,
    <Runtime layer={AppLive}>
      <Dashboard />
    </Runtime>,
  );
}
