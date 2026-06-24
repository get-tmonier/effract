/**
 * The canonical model: RECs compose with `yield*`, requirements bubble to the
 * root, and `mount` is the typed boundary. RECs are not JSX element types —
 * `<Rec />` is a compile error (asserted at the bottom) — so this is the only
 * way to use one, and it stays 100% real React underneath.
 */
import { Suspense, act, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { rec, hook, mount } from '../../index.ts';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

class Stats extends Context.Service<Stats, { readonly total: number }>()('test/Stats') {}
const statsLayer = (total: number): Layer.Layer<Stats> => Layer.succeed(Stats)({ total });

let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => container.remove());

describe('REC composition + mount', () => {
  it('mounts a tree, resolving services and yield-composed children', () => {
    const Badge = rec(function* () {
      const stats = yield* Stats;
      return <span>{stats.total}</span>;
    });
    const Page = rec(function* () {
      return <main>online: {yield* Badge}</main>;
    });
    const html = renderToStaticMarkup(mount(statsLayer(42), Page));
    expect(html).toContain('42');
  });

  it('passes props with .with(), type-checked', () => {
    const Greet = rec(function* (props: { name: string }) {
      const stats = yield* Stats;
      return (
        <p>
          hi {props.name} ({stats.total})
        </p>
      );
    });
    const Page = rec(function* () {
      return <main>{yield* Greet.with({ name: 'Ada' })}</main>;
    });
    expect(renderToStaticMarkup(mount(statsLayer(3), Page))).toContain('hi Ada');
  });

  it('keeps a yield-composed child a real React child (hook state survives re-render)', async () => {
    const Counter = rec(function* () {
      const [n, setN] = yield* hook(useState(0));
      return (
        <button data-x="counter" onClick={() => setN(n + 1)}>
          {n}
        </button>
      );
    });
    const Parent = rec(function* () {
      const [p, setP] = yield* hook(useState(0));
      return (
        <div>
          <button data-x="parent" onClick={() => setP(p + 1)}>
            {p}
          </button>
          {yield* Counter}
        </div>
      );
    });

    const root = createRoot(container);
    const click = async (x: string) =>
      act(async () => {
        container
          .querySelector(`[data-x="${x}"]`)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

    await act(async () => root.render(mount(Layer.empty, Parent)));
    expect(container.querySelector('[data-x="counter"]')?.textContent).toBe('0');
    await click('counter');
    expect(container.querySelector('[data-x="counter"]')?.textContent).toBe('1');
    await click('parent'); // Parent re-renders → re-runs yield* Counter
    expect(container.querySelector('[data-x="parent"]')?.textContent).toBe('1');
    expect(container.querySelector('[data-x="counter"]')?.textContent).toBe('1'); // preserved
    await act(async () => root.unmount());
  });

  it('suspends an async effect through Suspense, then resolves', async () => {
    let release: (v: number) => void = () => {};
    const gate = new Promise<number>((r) => {
      release = r;
    });
    const Async = rec(function* () {
      const v = yield* Effect.promise(() => gate);
      return <span>val:{v}</span>;
    });
    const Page = rec(function* () {
      return <Suspense fallback={<i>loading</i>}>{yield* Async}</Suspense>;
    });
    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Page)));
    expect(container.textContent).toContain('loading');
    await act(async () => {
      release(7);
      await gate;
    });
    expect(container.textContent).toContain('val:7');
    await act(async () => root.unmount());
  });

  it('runs the SAME tree under two runtimes — server vs client is the mount', () => {
    const Total = rec(function* () {
      const stats = yield* Stats;
      return <output>{stats.total}</output>;
    });
    const Page = rec(function* () {
      return <div>{yield* Total}</div>;
    });
    expect(renderToStaticMarkup(mount(statsLayer(100), Page))).toContain('100');
    expect(renderToStaticMarkup(mount(statsLayer(1), Page))).toContain('1');
  });
});

// --- type-level guarantees (checked by tsgo, not run) ---
{
  const Needs = rec(function* () {
    const s = yield* Stats;
    return <i>{s.total}</i>;
  });
  const Root = rec(function* () {
    return <main>{yield* Needs}</main>;
  });
  // ✓ AppLive provides Stats:
  void mount(statsLayer(1), Root);
  // ✗ empty layer is missing Stats — mount returns a non-ReactNode error type:
  // @ts-expect-error effract: runtime is missing Stats
  const _bad: ReactNode = mount(Layer.empty, Root);
  void _bad;
  // ✗ a REC is not a JSX element type:
  // @ts-expect-error RECs cannot be used as JSX
  const _jsx = <Needs />;
  void _jsx;
}
