/**
 * The signals bridge: a change to an atom re-renders precisely the components
 * that read it — and leaves the rest untouched.
 */
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import {
  Observe,
  atom,
  atomFamily,
  batch,
  derive,
  mount,
  observe,
  rec,
  useAtom,
} from '../../index.client.ts';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const flush = (): Promise<void> =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

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

  it('an unchanged write (by Equal) notifies no one', () => {
    const n = atom(1);
    let notifications = 0;
    const unsub = n.subscribe(() => {
      notifications += 1;
    });
    n.set(1); // same value — no-op
    expect(notifications).toBe(0);
    n.set(2);
    expect(notifications).toBe(1);
    unsub();
  });

  it('batch coalesces writes into a single notification wave', () => {
    const a = atom(1);
    const b = atom(2);
    const sum = derive(($) => $(a) + $(b));
    let notifications = 0;
    const unsub = sum.subscribe(() => {
      notifications += 1;
    });

    // Without a batch: two writes → two recomputations, two notifications.
    a.set(10);
    b.set(20);
    expect(notifications).toBe(2);
    expect(sum.value).toBe(30);

    // With a batch: two writes → one recomputation, one notification.
    notifications = 0;
    batch(() => {
      a.set(100);
      b.set(200);
    });
    expect(notifications).toBe(1);
    expect(sum.value).toBe(300);

    unsub();
  });

  it('atomFamily memoises one independent atom per key', () => {
    const quantities = atomFamily((_id: string) => atom(1));
    const first = quantities('sku-1');
    expect(quantities('sku-1')).toBe(first); // same key → same atom
    expect(quantities('sku-2')).not.toBe(first); // different key → its own atom

    first.update((n) => n + 4);
    expect(quantities('sku-1').value).toBe(5);
    expect(quantities('sku-2').value).toBe(1); // independent

    quantities.forget('sku-1');
    expect(quantities('sku-1')).not.toBe(first); // forgotten → a fresh atom
    expect(quantities('sku-1').value).toBe(1);
  });

  it('derive.writable reads a derived value and writes back to its sources', () => {
    const celsius = atom(0);
    const fahrenheit = derive.writable(
      ($) => $(celsius) * 1.8 + 32,
      (f) => celsius.set((f - 32) / 1.8),
    );

    expect(fahrenheit.value).toBe(32);
    celsius.set(100);
    expect(fahrenheit.value).toBe(212);

    fahrenheit.set(32); // write flows back to the source
    expect(celsius.value).toBe(0);
    fahrenheit.update((f) => f + 18); // 32 → 50 → celsius 10
    expect(celsius.value).toBe(10);
  });

  it('derive.writable is a reactive atom a component can yield and drive', async () => {
    const celsius = atom(0);
    const fahrenheit = derive.writable(
      ($) => $(celsius) * 1.8 + 32,
      (f) => celsius.set((f - 32) / 1.8),
    );
    const Thermostat = rec(function* () {
      const f = yield* fahrenheit;
      return (
        <button type="button" onClick={() => fahrenheit.set(f + 18)}>
          {f}
        </button>
      );
    });

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Thermostat)));
    expect(container.textContent).toBe('32');

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toBe('50'); // +18°F → celsius 10 → 50°F
    expect(celsius.value).toBe(10);

    await act(async () => root.unmount());
  });

  it('derive.effect suspends, resolves, and refetches when a source atom changes', async () => {
    const calls: number[] = [];
    // A per-id gate so we can observe the loading frame deterministically.
    const gates = new Map<number, { promise: Promise<number>; settle: (n: number) => void }>();
    const gateFor = (id: number): { promise: Promise<number>; settle: (n: number) => void } => {
      const existing = gates.get(id);
      if (existing) {
        return existing;
      }
      let settle: (n: number) => void = () => {};
      const promise = new Promise<number>((resolve) => {
        settle = resolve;
      });
      const gate = { promise, settle };
      gates.set(id, gate);
      return gate;
    };

    const sku = atom(1);
    // Read the atom *synchronously* in the selector (so it is tracked), then use
    // the value inside the effect.
    const price = derive.effect(($) => {
      const id = $(sku);
      return Effect.promise(() => {
        calls.push(id);
        return gateFor(id).promise;
      });
    });
    const Price = rec(function* () {
      const p = yield* price;
      return <span data-x="price">{p}</span>;
    }).suspense(<i>loading</i>);

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Price)));
    expect(container.textContent).toContain('loading'); // suspended on the effect
    expect(calls).toEqual([1]);

    await act(async () => {
      gateFor(1).settle(10);
      await gateFor(1).promise;
    });
    await flush();
    expect(container.querySelector('[data-x="price"]')?.textContent).toBe('10');

    // A source change re-renders (it subscribed) and refetches, keyed by the new value.
    await act(async () => sku.set(3));
    await flush();
    expect(calls).toEqual([1, 3]);
    await act(async () => {
      gateFor(3).settle(30);
      await gateFor(3).promise;
    });
    await flush();
    expect(container.querySelector('[data-x="price"]')?.textContent).toBe('30');

    await act(async () => root.unmount());
  });

  it('derive.effect does not refetch when a source is written its current value', async () => {
    const calls: number[] = [];
    const sku = atom(2);
    const price = derive.effect(($) => {
      const id = $(sku);
      return Effect.promise(() => {
        calls.push(id);
        return Promise.resolve(id * 10);
      });
    });
    const Price = rec(function* () {
      const p = yield* price;
      return <span>{p}</span>;
    }).suspense(<i>loading</i>);

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Price)));
    await flush();
    expect(container.textContent).toBe('20');
    expect(calls).toEqual([2]);

    // Same value → no notification, no re-render, no refetch.
    await act(async () => sku.set(2));
    await flush();
    expect(calls).toEqual([2]);

    await act(async () => root.unmount());
  });
});

// --- type-level: derive.effect carries the loading obligation (checked by tsgo) ---
{
  const sku = atom(1);
  const AsyncPrice = rec(function* () {
    const p = yield* derive.effect(($) => Effect.succeed($(sku) * 10));
    return <i>{p}</i>;
  });
  // @ts-expect-error effract: loading not handled — derive.effect suspends
  void mount(Layer.empty, AsyncPrice);
  // ✓ discharged with .suspense:
  void mount(Layer.empty, AsyncPrice.suspense(<i>loading</i>));
}
