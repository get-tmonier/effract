/**
 * `.catch` renders a typed fallback for a REC's declared failures. Effect's
 * error channel `E` becomes an exhaustive, compile-checked handler map: a
 * failure — synchronous *or* async — renders its mapped node in place, while
 * defects and a child's own failures are left alone. These tests pin the runtime
 * behaviour; the block at the bottom pins the types tsgo enforces.
 */
import { Component, Suspense, act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { rec, mount } from '../../index.client.ts';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

class NotFound extends Data.TaggedError('NotFound')<{ readonly id: number }> {}
class Unauthorized extends Data.TaggedError('Unauthorized')<{ readonly reason: string }> {}

interface User {
  readonly name: string;
}

/** A service call with a real union error channel — the shape `.catch` shines on. */
const fetchUser = (
  outcome: 'ok' | 'missing' | 'denied',
): Effect.Effect<User, NotFound | Unauthorized> => {
  if (outcome === 'missing') return Effect.fail(new NotFound({ id: 7 }));
  if (outcome === 'denied') return Effect.fail(new Unauthorized({ reason: 'expired' }));
  return Effect.succeed({ name: 'Ada' });
};

/** The same call, but async — it suspends first, then settles into its failure. */
const fetchUserAsync = (gate: Promise<User>): Effect.Effect<User, NotFound | Unauthorized> =>
  Effect.tryPromise({ try: () => gate, catch: () => new NotFound({ id: 1 }) });

let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => container.remove());

/** Minimal boundary so an *un*caught failure is observable instead of fatal. */
class Boundary extends Component<{ children: ReactNode }, { readonly caught: string | null }> {
  override state = { caught: null as string | null };
  static getDerivedStateFromError(error: unknown): { caught: string } {
    return { caught: error instanceof Error ? error.message : String(error) };
  }
  override render(): ReactNode {
    return this.state.caught === null ? this.props.children : <i>boundary:{this.state.caught}</i>;
  }
}

describe('.catch — typed error rendering', () => {
  it('renders a typed fallback for a synchronous failure', () => {
    const Profile = rec(function* () {
      const user = yield* fetchUser('missing');
      return <span>hi {user.name}</span>;
    }).catch({
      NotFound: () => <span>empty</span>,
      Unauthorized: () => <span>login</span>,
    });

    expect(renderToStaticMarkup(mount(Layer.empty, Profile))).toContain('empty');
  });

  it('passes the tagged error to its handler', () => {
    const Profile = rec(function* () {
      const user = yield* fetchUser('missing');
      return <span>hi {user.name}</span>;
    }).catch({
      NotFound: (e) => <span>missing {e.id}</span>,
      Unauthorized: (e) => <span>{e.reason}</span>,
    });

    expect(renderToStaticMarkup(mount(Layer.empty, Profile))).toContain('missing 7');
  });

  it('dispatches on the failing tag among several', () => {
    const Profile = rec(function* () {
      const user = yield* fetchUser('denied');
      return <span>hi {user.name}</span>;
    }).catch({
      NotFound: () => <span>empty</span>,
      Unauthorized: (e) => <span>login:{e.reason}</span>,
    });

    expect(renderToStaticMarkup(mount(Layer.empty, Profile))).toContain('login:expired');
  });

  it('renders a typed fallback for an async failure, after Suspense', async () => {
    let reject: (e: unknown) => void = () => {};
    const gate = new Promise<User>((_, r) => {
      reject = r;
    });
    const Profile = rec(function* () {
      const user = yield* fetchUserAsync(gate);
      return <span>hi {user.name}</span>;
    }).catch({
      NotFound: () => <span>empty</span>,
      Unauthorized: () => <span>login</span>,
    });
    const Page = rec(function* () {
      return <Suspense fallback={<i>loading</i>}>{yield* Profile}</Suspense>;
    });

    const root = createRoot(container);
    await act(async () => root.render(mount(Layer.empty, Page)));
    expect(container.textContent).toContain('loading');

    await act(async () => {
      reject(new Error('boom'));
      await gate.catch(() => {});
    });
    expect(container.textContent).toContain('empty');
    await act(async () => root.unmount());
  });

  it('does not swallow a defect — it reaches the error boundary', async () => {
    const Boom = rec(function* () {
      yield* Effect.die(new Error('kaboom'));
      return <span>never</span>;
    }).catch({}); // no tagged errors in E, so `{}` is exhaustive

    const root = createRoot(container);
    await act(async () => root.render(<Boundary>{mount(Layer.empty, Boom)}</Boundary>));
    expect(container.textContent).toContain('boundary:kaboom');
    await act(async () => root.unmount());
  });

  it("composes as a child that owns its failure — the parent doesn't swallow it", () => {
    // The child catches its own failure; the parent has no handler at all, yet
    // the child's fallback renders in place (and the parent is unaffected).
    const Child = rec(function* () {
      const user = yield* fetchUser('missing');
      return <span>hi {user.name}</span>;
    }).catch({
      NotFound: () => <b>child-empty</b>,
      Unauthorized: () => <b>child-login</b>,
    });
    const Parent = rec(function* () {
      return <main>ok:{yield* Child}</main>;
    });

    const html = renderToStaticMarkup(mount(Layer.empty, Parent));
    expect(html).toContain('ok:');
    expect(html).toContain('child-empty');
  });
});

// --- type-level guarantees (checked by tsgo, not run) ---
{
  const base = rec(function* () {
    const user = yield* fetchUser('ok'); // E = NotFound | Unauthorized
    return <span>{user.name}</span>;
  });

  // ✓ exhaustive over the error channel:
  void base.catch({
    NotFound: (e) => <i>{e.id}</i>,
    Unauthorized: (e) => <i>{e.reason}</i>,
  });

  // ✗ a forgotten tag is a compile error:
  // @ts-expect-error effract: handler for 'Unauthorized' is missing
  void base.catch({ NotFound: () => <i>only</i> });

  // ✗ an unknown tag is rejected as an excess property:
  void base.catch({
    NotFound: () => <i />,
    Unauthorized: () => <i />,
    // @ts-expect-error effract: 'Nope' is not an error this REC can raise
    Nope: () => <i />,
  });

  // ✓ a caught REC is a plain REC (error channel discharged) — mounts anywhere:
  const Safe = base.catch({ NotFound: () => <i />, Unauthorized: () => <i /> });
  const _node: ReactNode = mount(Layer.empty, Safe);
  void _node;
}
