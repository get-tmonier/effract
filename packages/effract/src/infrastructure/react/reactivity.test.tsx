/**
 * The signals bridge: a change to an atom re-renders precisely the components
 * that read it — and leaves the rest untouched.
 */
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Layer from 'effect/Layer';
import { Observe, atom, derive, mount, observe, rec, useAtom } from '../../index.client.ts';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => {
  container.remove();
});

describe('reactivity', () => {
  it('observe re-renders when a read atom changes', async () => {
    const count = atom(1);
    const Doubled = (): ReactNode => {
      const doubled = observe(($) => $(count) * 2);
      return <span>{doubled}</span>;
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(<Doubled />);
    });
    expect(container.textContent).toBe('2');

    await act(async () => {
      count.set(5);
    });
    expect(container.textContent).toBe('10');

    await act(async () => {
      root.unmount();
    });
  });

  it('useAtom reads and writes like useState, backed by Effect', async () => {
    const name = atom('ada');
    const Field = (): ReactNode => {
      const [value, setValue] = useAtom(name);
      return (
        <button type="button" onClick={() => setValue((prev) => `${prev}!`)}>
          {value}
        </button>
      );
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(<Field />);
    });
    expect(container.textContent).toBe('ada');

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toBe('ada!');

    await act(async () => {
      root.unmount();
    });
  });

  it('<Observe> tracks only the atoms it actually reads', async () => {
    const a = atom(1);
    const b = atom(100);
    let renders = 0;
    const View = (): ReactNode => {
      renders += 1;
      return <Observe>{($) => <em>{$(a)}</em>}</Observe>;
    };

    const root = createRoot(container);
    await act(async () => {
      root.render(<View />);
    });
    const baseline = renders;
    expect(container.textContent).toBe('1');

    // b is never read by the selector, so changing it must not re-render.
    await act(async () => {
      b.set(200);
    });
    expect(renders).toBe(baseline);

    await act(async () => {
      a.set(2);
    });
    expect(container.textContent).toBe('2');

    await act(async () => {
      root.unmount();
    });
  });

  it('yield* atom reads reactive state in a REC and re-renders on change', async () => {
    const count = atom(1);
    const Counter = rec(function* () {
      const n = yield* count; // read + subscribe — no hook(useAtomValue(...))
      return <span>{n}</span>;
    });

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Counter)));
    expect(container.textContent).toBe('1');

    await act(async () => count.set(5));
    expect(container.textContent).toBe('5');

    await act(async () => root.unmount());
  });

  it('derive computes from atoms, updates on change, and composes', async () => {
    const price = atom(10);
    const qty = atom(2);
    const subtotal = derive(($) => $(price) * $(qty));
    const withTax = derive(($) => Math.round($(subtotal) * 1.1)); // derived-of-derived

    const Total = rec(function* () {
      const total = yield* withTax;
      return <span>{total}</span>;
    });

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Total)));
    expect(container.textContent).toBe('22'); // 10*2=20 → *1.1=22

    await act(async () => qty.set(3));
    expect(container.textContent).toBe('33'); // 30 → 33

    await act(async () => price.set(20));
    expect(container.textContent).toBe('66'); // 60 → 66

    await act(async () => root.unmount());
  });

  it('derive.value reads imperatively (no component, no subscription)', () => {
    const n = atom(3);
    const doubled = derive(($) => $(n) * 2);
    expect(doubled.value).toBe(6);
    n.set(5);
    expect(doubled.value).toBe(10);
  });
});
