/**
 * The server `mount` — the implementation the `react-server` condition selects.
 * It proves the ergonomic half of the thesis: the same `mount(layer, Root)` call
 * a client makes returns, on the server, an async React Server Component that
 * resolves the tree's services against a runtime built from the layer — reused
 * across renders, with no per-call plumbing.
 */
import { describe, expect, it } from 'vitest';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { rec } from '#infrastructure/rec-core.tsx';
import { mount } from '#infrastructure/server/mount.ts';

class Stats extends Context.Service<Stats, { readonly total: number }>()('test/Stats') {}
class NotFound extends Data.TaggedError('NotFound')<{ readonly id: number }> {}

describe('server mount', () => {
  it('returns an async component that resolves services from the layer', async () => {
    const Badge = rec(function* () {
      const stats = yield* Stats;
      return `total:${stats.total}`;
    });
    const Root = mount(Layer.succeed(Stats)({ total: 9 }), Badge);
    expect(await Root()).toBe('total:9');
  });

  it('reuses one runtime per layer identity across renders', async () => {
    // The layer builds its service once; a second render that rebuilt the
    // runtime would bump the counter to 2.
    let builds = 0;
    const layer = Layer.sync(Stats)(() => {
      builds += 1;
      return { total: builds };
    });

    const Badge = rec(function* () {
      const stats = yield* Stats;
      return `total:${stats.total}`;
    });
    const Root = mount(layer, Badge);
    expect(await Root()).toBe('total:1');
    expect(await Root()).toBe('total:1');
    expect(builds).toBe(1);
  });

  it('renders a typed fallback via .catch — same API as the client', async () => {
    const Badge = rec(function* () {
      yield* Effect.fail(new NotFound({ id: 1 }));
      return 'never';
    }).catch({ NotFound: (e) => `empty:${e.id}` });
    const Root = mount(Layer.empty, Badge);
    expect(await Root()).toBe('empty:1');
  });
});
