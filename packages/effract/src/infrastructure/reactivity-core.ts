/**
 * The reactive atoms — the server-safe half of the reactivity bridge. This
 * module carries no `'use client'` and imports no React: an `atom`/`derive` value
 * is pure Effect-backed data (a value you can read, write, subscribe to, and
 * `yield*`), so a *service* that holds one stays universal. The React binding
 * (`observe`, `useAtom`, and the in-render reader) lives in the sibling
 * `react/reactivity.tsx`, tagged `'use client'`; only *reading a signal in a
 * component* needs React, not owning one in a service.
 */
import * as Equal from 'effect/Equal';
import { AtomRef } from 'effect/unstable/reactivity';
import { AtomTypeId, type Atom, type ReadableAtom } from '#domain/protocol.ts';

/** Read an atom inside a `derive`/`observe` selector, subscribing to it. */
export type Read = <A>(atom: ReadableAtom<A>) => A;

/** The single-shot iterator that makes an atom `yield*`able: read + subscribe. */
const yieldSelf = <A>(self: ReadableAtom<A>): Iterator<ReadableAtom<A>, A> => {
  let yielded = false;
  return {
    next(sent?: unknown): IteratorResult<ReadableAtom<A>, A> {
      if (yielded) {
        return { done: true, value: sent as A };
      }
      yielded = true;
      return { done: false, value: self };
    },
  };
};

/**
 * Create a writable reactive atom. Read it with `yield*` in a REC, `.value`
 * imperatively (in an event handler or a service method), or `$(atom)` inside
 * `derive`/`<Observe>`; write it with `.set` / `.update`. Backed by Effect's
 * `AtomRef`, so its value is reachable from anywhere an Effect runs.
 */
export const atom = <A>(initial: A): Atom<A> => {
  const ref = AtomRef.make(initial);
  const self: Atom<A> = {
    [AtomTypeId]: true,
    get value() {
      return ref.value;
    },
    set: (value) => ref.set(value),
    update: (update) => ref.update(update),
    subscribe: (listener) => ref.subscribe(listener),
    [Symbol.iterator]: () => yieldSelf(self),
  };
  return self;
};

/**
 * A standalone tracked computation: it evaluates a selector, remembering which
 * atoms it read, and — while anyone is subscribed — keeps a memoised value in
 * sync by re-running when a tracked atom changes. Read with no subscribers, it
 * computes fresh. The engine behind both {@link derive} and `observe`.
 */
export interface Computation<A> {
  get(): A;
  subscribe(listener: () => void): () => void;
}

export const computation = <A>(selector: (read: Read) => A): Computation<A> => {
  const listeners = new Set<() => void>();
  let currentDeps: Array<ReadableAtom<unknown>> = [];
  let unsubscribes: Array<() => void> = [];
  let cached: A;
  let tracking = false;

  const evaluate = (): { value: A; deps: Array<ReadableAtom<unknown>> } => {
    const deps: Array<ReadableAtom<unknown>> = [];
    const read: Read = (atomRead) => {
      deps.push(atomRead as ReadableAtom<unknown>);
      return atomRead.value;
    };
    return { value: selector(read), deps };
  };

  const sameDeps = (deps: Array<ReadableAtom<unknown>>): boolean =>
    deps.length === currentDeps.length && deps.every((dep, i) => dep === currentDeps[i]);

  const listen = (deps: Array<ReadableAtom<unknown>>): void => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
    unsubscribes = deps.map((dep) => dep.subscribe(onChange));
    currentDeps = deps;
  };

  function onChange(): void {
    const { value, deps } = evaluate();
    // Only re-subscribe when the dependency *set* actually changed. Re-subscribing
    // on every value change would mutate the notifying atom's listener set while
    // it iterates — re-entrant, and for a derived-of-derived chain, an infinite loop.
    if (!sameDeps(deps)) {
      listen(deps);
    }
    const changed = !Equal.equals(value, cached);
    cached = value;
    if (changed) {
      // Snapshot the listeners: one may subscribe/unsubscribe while being notified.
      for (const listener of Array.from(listeners)) {
        listener();
      }
    }
  }

  return {
    get: () => (tracking ? cached : evaluate().value),
    subscribe: (listener) => {
      if (listeners.size === 0) {
        const first = evaluate();
        cached = first.value;
        tracking = true;
        listen(first.deps);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          for (const unsubscribe of unsubscribes) {
            unsubscribe();
          }
          unsubscribes = [];
          currentDeps = [];
          tracking = false;
        }
      };
    },
  };
};

/**
 * Create a *derived* atom: a read-only reactive value computed from other atoms.
 * `$` tracks exactly the atoms the selector reads, so the derived value
 * recomputes — and its readers re-render — precisely when a tracked atom changes.
 * Derived atoms compose: one may read another. Keep derivation here, in the
 * Effect world, rather than recomputing it in a component.
 *
 * ```ts
 * const total = derive(($) => $(items).reduce((sum, x) => sum + x.price, 0));
 * ```
 */
export const derive = <A>(selector: (read: Read) => A): ReadableAtom<A> => {
  const comp = computation(selector);
  const self: ReadableAtom<A> = {
    [AtomTypeId]: true,
    get value() {
      return comp.get();
    },
    subscribe: (listener) => comp.subscribe(listener),
    [Symbol.iterator]: () => yieldSelf(self),
  };
  return self;
};
