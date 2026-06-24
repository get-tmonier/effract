/**
 * The proof that effract is 100% real React: a React Effect Component is an
 * ordinary component that React renders, holds hook state for, suspends, and
 * re-renders — with Effect services resolved in the same pass.
 */
import { Suspense, act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { Runtime, component, hook } from '../../index.ts';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

class Stats extends Context.Service<Stats, { readonly total: number }>()('test/Stats') {}
const statsLayer = (total: number): Layer.Layer<never, never, never> =>
  Layer.succeed(Stats)({ total });

let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => {
  container.remove();
});

describe('component (React Effect Component)', () => {
  it('renders a service + hook REC to static markup in one pass', () => {
    const Dashboard = component(function* () {
      const stats = yield* Stats;
      const [tab] = yield* hook(useState('overview'));
      return (
        <div>
          {tab}:{stats.total}
        </div>
      );
    });

    const html = renderToStaticMarkup(
      <Runtime layer={statsLayer(42)}>
        <Dashboard />
      </Runtime>,
    );
    expect(html).toContain('overview');
    expect(html).toContain('42');
  });

  it('holds genuine hook state across re-renders while re-resolving services', async () => {
    const Counter = component(function* () {
      const stats = yield* Stats;
      const [n, setN] = yield* hook(useState(0));
      return (
        <button type="button" onClick={() => setN(n + 1)}>
          {n}/{stats.total}
        </button>
      );
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <Runtime layer={statsLayer(42)}>
          <Counter />
        </Runtime>,
      );
    });
    expect(container.textContent).toBe('0/42');

    // Clicking drives a real useState update: the generator re-runs, the hook
    // remembers its state, and the Stats service resolves again in the new pass.
    const button = container.querySelector('button');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toBe('1/42');

    await act(async () => {
      root.unmount();
    });
  });

  it('suspends an async effect through React Suspense, then resolves it', async () => {
    let release: (value: number) => void = () => {};
    const gate = new Promise<number>((resolve) => {
      release = resolve;
    });

    const AsyncPanel = component(function* () {
      const value = yield* Effect.promise(() => gate);
      return <span>val:{value}</span>;
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <Runtime layer={Layer.empty}>
          <Suspense fallback={<i>loading</i>}>
            <AsyncPanel />
          </Suspense>
        </Runtime>,
      );
    });
    expect(container.textContent).toContain('loading');

    await act(async () => {
      release(7);
      await gate;
    });
    expect(container.textContent).toContain('val:7');

    await act(async () => {
      root.unmount();
    });
  });

  it('runs the SAME component under two runtimes — server vs client is a runtime detail', () => {
    const Total = component(function* () {
      const stats = yield* Stats;
      return <output>{stats.total}</output>;
    });

    const onServer = renderToStaticMarkup(
      <Runtime layer={statsLayer(100)}>
        <Total />
      </Runtime>,
    );
    const onClient = renderToStaticMarkup(
      <Runtime layer={statsLayer(1)}>
        <Total />
      </Runtime>,
    );

    expect(onServer).toContain('100');
    expect(onClient).toContain('1');
    expect(onServer).not.toBe(onClient);
  });
});
