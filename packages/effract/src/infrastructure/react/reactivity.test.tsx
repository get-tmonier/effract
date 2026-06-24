/**
 * The signals bridge: a change to an atom re-renders precisely the components
 * that read it — and leaves the rest untouched.
 */
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Observe, atom, observe, useAtom } from '../../index.ts';

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
});
