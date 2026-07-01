/**
 * The runtime boundary owns an Effect `ManagedRuntime` for the lifetime of the
 * mounted subtree: built once, disposed when the boundary is gone. The subtle
 * part is *when* "gone" is true. React's StrictMode (and offscreen/`<Activity>`)
 * tears a passive effect down and sets it up again in the same tick to flush out
 * unsafe cleanup logic — so a boundary that disposes eagerly in its effect
 * cleanup finalizes the runtime (releases scoped resources, closes layers) out
 * from under a component that is still mounted. These tests pin the contract:
 * the runtime survives a StrictMode remount, yet is still disposed on a real
 * unmount.
 */
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { rec, mount } from '../../index.client.ts';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

class Stats extends Context.Service<Stats, { readonly total: number }>()('test/Stats') {}

/**
 * A layer whose service is a scoped resource: `acquire` runs when the runtime
 * builds it, `release` runs when the runtime is disposed (its layer scope
 * closes). Counting both lets a test observe the runtime's real lifecycle.
 */
const trackedLayer = (onAcquire: () => void, onRelease: () => void): Layer.Layer<Stats> =>
  Layer.effect(Stats)(
    Effect.acquireRelease(
      Effect.sync(() => {
        onAcquire();
        return { total: 42 };
      }),
      () => Effect.sync(onRelease),
    ),
  );

/** Let any deferred (microtask-scheduled) disposal settle. */
const flushMicrotasks = (): Promise<void> =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => container.remove());

describe('Runtime lifecycle', () => {
  it('does not dispose the runtime during a StrictMode remount (still mounted)', async () => {
    let acquired = 0;
    let released = 0;
    const Page = rec(function* () {
      const stats = yield* Stats;
      return <span>{stats.total}</span>;
    });

    const root = createRoot(container);
    await act(async () =>
      root.render(
        <StrictMode>
          {mount(
            trackedLayer(
              () => void acquired++,
              () => void released++,
            ),
            Page,
          )}
        </StrictMode>,
      ),
    );
    await flushMicrotasks();

    // StrictMode double-invokes effects (setup → cleanup → setup). The runtime
    // must survive that cycle: the tree rendered, and nothing was finalized.
    expect(container.textContent).toContain('42');
    expect(acquired).toBeGreaterThan(0);
    expect(released).toBe(0);

    await act(async () => root.unmount());
  });

  it('disposes the runtime on a real unmount', async () => {
    let released = 0;
    const Page = rec(function* () {
      const stats = yield* Stats;
      return <span>{stats.total}</span>;
    });

    const root = createRoot(container);
    await act(async () =>
      root.render(
        mount(
          trackedLayer(
            () => {},
            () => void released++,
          ),
          Page,
        ),
      ),
    );
    await flushMicrotasks();
    expect(released).toBe(0); // alive while mounted

    await act(async () => root.unmount());
    await flushMicrotasks();
    expect(released).toBe(1); // finalized exactly once when the boundary is gone
  });
});
