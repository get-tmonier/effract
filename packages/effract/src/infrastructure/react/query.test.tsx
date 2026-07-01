/**
 * `query` is effract's async-data primitive: it suspends the render for its
 * value, refetches when its key changes, interrupts the in-flight fiber on
 * unmount, and — at the type level — contributes a loading obligation `S` that
 * `.suspense(fallback)` (or `mount(…, { loading })`) must discharge. These tests
 * pin the runtime behaviour; the block at the bottom pins the obligation tsgo
 * enforces. Typed-error handling rides on the same `E` channel as `.catch`.
 */
import { StrictMode, act, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { atom, hook, mount, query, rec, suspend } from '../../index.client.ts';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

class NotFound extends Data.TaggedError('NotFound')<{ readonly id: number }> {}

interface User {
  readonly name: string;
}

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
afterEach(() => container.remove());

describe('query — async data + loading obligation', () => {
  it('suspends for a query, then resolves inline', async () => {
    let resolve: (u: User) => void = () => {};
    const gate = new Promise<User>((r) => {
      resolve = r;
    });
    const Profile = rec(function* () {
      const user = yield* query(Effect.promise(() => gate));
      return <span>hi {user.name}</span>;
    }).suspense(<i>loading</i>);

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Profile)));
    expect(container.textContent).toContain('loading');

    await act(async () => {
      resolve({ name: 'Ada' });
      await gate;
    });
    await flush();
    expect(container.textContent).toContain('hi Ada');
    await act(async () => root.unmount());
  });

  it('refetches when the key changes, and not when it is unchanged', async () => {
    const calls: number[] = [];
    const load = (id: number): Effect.Effect<string> =>
      Effect.promise(() => {
        calls.push(id);
        return Promise.resolve(`user-${id}`);
      });

    const Profile = rec(function* (props: { readonly id: number }) {
      const name = yield* query(load(props.id), props.id);
      return <span data-x="name">{name}</span>;
    }).suspense(<i>loading</i>);

    const App = rec(function* () {
      const [id, setId] = yield* hook(useState(1));
      const [, bump] = yield* hook(useState(0));
      return (
        <div>
          <button data-x="next" onClick={() => setId(id + 1)}>
            next
          </button>
          <button data-x="rerender" onClick={() => bump((n) => n + 1)}>
            rerender
          </button>
          {yield* Profile.with({ id })}
        </div>
      );
    });

    const root = createRoot(container);
    const click = (x: string): Promise<void> =>
      act(async () => {
        container
          .querySelector(`[data-x="${x}"]`)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

    await act(async () => root.render(mount(Layer.empty, App)));
    await flush();
    expect(container.querySelector('[data-x="name"]')?.textContent).toBe('user-1');
    // Exactly one run despite suspending before commit — the cross-render store
    // dedupes every render attempt of the same query.
    expect(calls).toEqual([1]);

    // Re-render with the same key → the entry is reused, no refetch.
    await click('rerender');
    await flush();
    expect(calls).toEqual([1]);
    expect(container.querySelector('[data-x="name"]')?.textContent).toBe('user-1');

    // Change the key → exactly one refetch, for the new id.
    await click('next');
    await flush();
    expect(container.querySelector('[data-x="name"]')?.textContent).toBe('user-2');
    expect(calls).toEqual([1, 2]);

    await act(async () => root.unmount());
  });

  it('renders a typed fallback when a query fails (via .catch)', async () => {
    const Profile = rec(function* () {
      const user = yield* query(
        Effect.fail(new NotFound({ id: 9 })) as Effect.Effect<User, NotFound>,
      );
      return <span>hi {user.name}</span>;
    })
      .catch({ NotFound: (e) => <i>missing {e.id}</i> })
      .suspense(<i>loading</i>);

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Profile)));
    await flush();
    expect(container.textContent).toContain('missing 9');
    await act(async () => root.unmount());
  });

  it('interrupts the in-flight query fiber on unmount', async () => {
    let interrupted = false;
    const never = new Promise<number>(() => {});
    const Profile = rec(function* () {
      const n = yield* query(
        Effect.promise(() => never).pipe(
          Effect.onInterrupt(() => Effect.sync(() => void (interrupted = true))),
        ),
      );
      return <span>{n}</span>;
    }).suspense(<i>loading</i>);

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Profile)));
    expect(container.textContent).toContain('loading');

    await act(async () => root.unmount());
    // The abort is deferred a microtask (StrictMode-safe) and interruption is
    // async; give the fiber a moment to run its finalizer.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(interrupted).toBe(true);
  });

  it('suspend — the primitive — suspends for a value and carries the obligation', async () => {
    let resolve: (u: User) => void = () => {};
    const gate = new Promise<User>((r) => {
      resolve = r;
    });
    // `suspend` (no key) is the load-once primitive `query` is built on.
    const Profile = rec(function* () {
      const user = yield* suspend(Effect.promise(() => gate));
      return <span>hi {user.name}</span>;
    }).suspense(<i>loading</i>);

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Profile)));
    expect(container.textContent).toContain('loading');
    await act(async () => {
      resolve({ name: 'Ada' });
      await gate;
    });
    await flush();
    expect(container.textContent).toContain('hi Ada');
    await act(async () => root.unmount());
  });

  it('runs once and survives under StrictMode (no double-fetch on remount)', async () => {
    let runs = 0;
    let resolve: (u: User) => void = () => {};
    const gate = new Promise<User>((r) => {
      resolve = r;
    });
    const Profile = rec(function* () {
      const user = yield* query(
        Effect.promise(() => {
          runs++;
          return gate;
        }),
      );
      return <span>hi {user.name}</span>;
    }).suspense(<i>loading</i>);

    const root = createRoot(container);
    await act(async () => root.render(<StrictMode>{mount(Layer.empty, Profile)}</StrictMode>));
    await act(async () => {
      resolve({ name: 'Ada' });
      await gate;
    });
    await flush();
    expect(container.textContent).toContain('hi Ada');
    expect(runs).toBe(1);
    await act(async () => root.unmount());
  });

  it('discharges the loading obligation at the mount boundary with { loading }', async () => {
    let resolve: (u: User) => void = () => {};
    const gate = new Promise<User>((r) => {
      resolve = r;
    });
    const Profile = rec(function* () {
      const user = yield* query(Effect.promise(() => gate));
      return <span>hi {user.name}</span>;
    });

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Profile, { loading: <i>booting</i> })));
    expect(container.textContent).toContain('booting');
    await act(async () => {
      resolve({ name: 'Ada' });
      await gate;
    });
    await flush();
    expect(container.textContent).toContain('hi Ada');
    await act(async () => root.unmount());
  });

  it('a refetch that fails renders the .catch fallback in place (siblings survive)', async () => {
    // Mirrors the playground: a query keyed by a service atom, initially succeeds,
    // then the key changes to one whose fetch fails with a typed error. Gated
    // promises make the async settlement deterministic.
    const gates = new Map<number, { promise: Promise<string>; settle: () => void }>();
    const gateFor = (id: number): { promise: Promise<string>; settle: () => void } => {
      const existing = gates.get(id);
      if (existing) {
        return existing;
      }
      let settle: () => void = () => {};
      const promise = new Promise<string>((resolve, reject) => {
        settle = () => (id === 9 ? reject(new NotFound({ id })) : resolve(`product-${id}`));
      });
      const gate = { promise, settle };
      gates.set(id, gate);
      return gate;
    };
    const load = (id: number): Effect.Effect<string, NotFound> =>
      Effect.tryPromise({ try: () => gateFor(id).promise, catch: (e) => e as NotFound });

    const sku = atom(1);
    const tag = atom('•');
    // A reactive read comes AFTER the catchable query on purpose: a failure skips
    // it, so the render calls fewer hooks than the prior success. `.catch` is a
    // React error boundary, so the throwing render is discarded (no "rendered
    // fewer hooks" teardown) and the fallback shows regardless of yield order.
    const Product = rec(function* () {
      const id = yield* sku;
      const name = yield* query(load(id), id); // refetch when the id changes
      const mark = yield* tag; // ← skipped when the query throws
      return (
        <span data-x="name">
          {name} {mark}
        </span>
      );
    })
      .catch({ NotFound: (e) => <span data-x="err">missing {e.id}</span> })
      .suspense(<i>loading</i>);
    const Page = rec(function* () {
      return (
        <div>
          <span data-x="sibling">nav</span>
          {yield* Product}
        </div>
      );
    });

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Page)));
    await act(async () => {
      gateFor(1).settle();
      await gateFor(1).promise;
    });
    await flush();
    expect(container.querySelector('[data-x="name"]')?.textContent).toContain('product-1');

    // Refetch to a failing id — the .catch fallback renders in place, and the
    // sibling survives (the tree must NOT unmount).
    await act(async () => sku.set(9));
    await act(async () => {
      gateFor(9).settle();
      await gateFor(9).promise.catch(() => {});
    });
    await flush();
    expect(container.querySelector('[data-x="sibling"]')).not.toBeNull();
    expect(container.querySelector('[data-x="err"]')?.textContent).toBe('missing 9');

    // Recovery: because the REC rendered its fallback *inline* (it stayed mounted
    // and subscribed), navigating back to a valid id re-renders and refetches.
    await act(async () => sku.set(1));
    await flush();
    expect(container.querySelector('[data-x="err"]')).toBeNull();
    expect(container.querySelector('[data-x="name"]')?.textContent).toContain('product-1');

    await act(async () => root.unmount());
  });
});

// --- type-level guarantees (checked by tsgo, not run) ---
{
  const Async = rec(function* () {
    const user = yield* query(Effect.succeed({ name: 'x' } as User));
    return <i>{user.name}</i>;
  });

  // ✗ a query left the loading obligation unhandled — mount refuses it:
  // @ts-expect-error effract: loading not handled
  void mount(Layer.empty, Async);

  // ✓ discharged with .suspense:
  void mount(Layer.empty, Async.suspense(<i>loading</i>));

  // ✓ discharged at the boundary with { loading }:
  void mount(Layer.empty, Async, { loading: <i>loading</i> });

  // The obligation bubbles: a parent that places `Async` inherits it.
  const Parent = rec(function* () {
    return <div>{yield* Async}</div>;
  });
  // @ts-expect-error effract: loading not handled (bubbled up from the child)
  void mount(Layer.empty, Parent);
  void mount(Layer.empty, Parent.suspense(<i>loading</i>));

  // `suspend` (the primitive) carries the obligation too — not just `query`:
  const Susp = rec(function* () {
    const v = yield* suspend(Effect.succeed(1));
    return <i>{v}</i>;
  });
  // @ts-expect-error effract: loading not handled
  void mount(Layer.empty, Susp);
  void mount(Layer.empty, Susp.suspense(<i>loading</i>));

  // A REC with a plain (non-suspensable) effect has no obligation — mounts with neither:
  const Plain = rec(function* () {
    const n = yield* Effect.succeed(1);
    return <i>{n}</i>;
  });
  const _node: ReactNode = mount(Layer.empty, Plain);
  void _node;

  // Opt-in: a *raw async* effect still suspends at runtime, but carries no loading
  // obligation — `query` is what opts a REC into type-tracked loading. So this
  // mounts without `.suspense` (you bring your own <Suspense>, as in recipe 03).
  const RawAsync = rec(function* () {
    const v = yield* Effect.promise(() => Promise.resolve(1));
    return <i>{v}</i>;
  });
  const _raw: ReactNode = mount(Layer.empty, RawAsync);
  void _raw;
}
