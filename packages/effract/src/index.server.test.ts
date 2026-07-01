/**
 * The server entry's public surface. Client-only APIs — hooks and signals — must
 * NOT be exported here: a Server Component resolves `@tmonier/effract` through the
 * `react-server` condition to this entry, so their *absence* is exactly what makes
 * `hook(...)` / `observe(...)` a compile error in a Server Component instead of a
 * runtime surprise. This test guards that surface so the enforcement can't
 * silently regress (a `next build` proves it end-to-end; this proves it in unit).
 */
import { describe, expect, it } from 'vitest';
import * as server from './index.server.ts';

describe('server entry surface (react-server condition)', () => {
  it('exports the authoring + server-render API', () => {
    expect(typeof server.rec).toBe('function');
    expect(typeof server.mount).toBe('function');
    expect(typeof server.driveServerRec).toBe('function');
  });

  it('does NOT export client-only APIs — they cannot exist in a Server Component', () => {
    for (const name of ['hook', 'observe', 'atom', 'useAtom', 'useAtomValue', 'Runtime', 'view']) {
      expect(name in server, `${name} must not be exported from the server entry`).toBe(false);
    }
  });
});
