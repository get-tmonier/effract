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
 * Batching: coalesce a burst of writes into a single notification wave. While a
 * `batch` runs, every atom/derived listener that would fire is collected instead
 * of called; when the outermost batch ends, each is called exactly once. So a
 * derived value that reads two atoms both changed in one batch recomputes once,
 * and a component reading them re-renders once, not twice. Batches nest — only
 * the outermost flush notifies.
 */
let batchDepth = 0;
const pending = new Set<() => void>();

const flush = (): void => {
  // Snapshot + clear before running: a listener may schedule further work, but
  // at depth 0 that fires synchronously and must not mutate the set we iterate.
  const wave = Array.from(pending);
  pending.clear();
  for (const listener of wave) {
    listener();
  }
};

/** Notify a listener set, deferring into the current batch if one is open. */
const notify = (listeners: Set<() => void>): void => {
  if (batchDepth > 0) {
    for (const listener of listeners) {
      pending.add(listener);
    }
  } else {
    // Snapshot: a listener may subscribe/unsubscribe while being notified.
    for (const listener of Array.from(listeners)) {
      listener();
    }
  }
};

/**
 * Run `writes` as one atomic notification wave: atoms may be `set` many times
 * inside, but subscribers (and the derived atoms and components downstream) are
 * notified once, after it returns. Returns whatever `writes` returns.
 *
 * ```ts
 * batch(() => {
 *   first.set('Ada');
 *   last.set('Lovelace');
 * }); // one re-render, not two
 * ```
 */
export const batch = <A>(writes: () => A): A => {
  batchDepth += 1;
  try {
    return writes();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0) {
      flush();
    }
  }
};

/**
 * Create a writable reactive atom. Read it with `yield*` in a REC, `.value`
 * imperatively (in an event handler or a service method), or `$(atom)` inside
 * `derive`/`<Observe>`; write it with `.set` / `.update`. Backed by Effect's
 * `AtomRef` for storage, so its value is reachable from anywhere an Effect runs;
 * writes that don't change the value (by `Equal`) notify no one, and writes made
 * inside {@link batch} are coalesced.
 */
export const atom = <A>(initial: A): Atom<A> => {
  const ref = AtomRef.make(initial);
  const listeners = new Set<() => void>();
  const write = (next: A): void => {
    if (Equal.equals(next, ref.value)) {
      return; // no-op write — nothing downstream needs to hear about it
    }
    ref.set(next);
    notify(listeners);
  };
  const self: Atom<A> = {
    [AtomTypeId]: true,
    get value() {
      return ref.value;
    },
    set: (value) => write(value),
    update: (update) => write(update(ref.value)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    [Symbol.iterator]: () => yieldSelf(self),
  };
  return self;
};

/**
 * A keyed collection of atoms — one lazily-created, memoised atom per key, so
 * per-entity state (a row, a cart line, a todo) is a family lookup rather than
 * one giant atom you slice. `family(key)` returns the same atom for equal keys;
 * `make` builds a fresh one the first time a key is seen. `forget`/`clear` drop
 * cached entries (e.g. when an entity is deleted). Non-primitive keys need a
 * `keyOf` to reduce them to a stable map key.
 *
 * ```ts
 * const quantities = atomFamily((_id: string) => atom(1));
 * quantities('sku-1').update((n) => n + 1); // independent per id
 * ```
 */
export interface AtomFamily<K, A> {
  (key: K): A;
  /** Drop the cached atom for `key` (the next lookup makes a fresh one). */
  forget(key: K): void;
  /** Drop every cached atom. */
  clear(): void;
}

export const atomFamily = <K, A>(
  make: (key: K) => A,
  keyOf: (key: K) => unknown = (key) => key,
): AtomFamily<K, A> => {
  const cache = new Map<unknown, A>();
  const family = ((key: K): A => {
    const id = keyOf(key);
    if (!cache.has(id)) {
      cache.set(id, make(key));
    }
    return cache.get(id) as A;
  }) as AtomFamily<K, A>;
  family.forget = (key) => {
    cache.delete(keyOf(key));
  };
  family.clear = () => {
    cache.clear();
  };
  return family;
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

const deriveReadonly = <A>(selector: (read: Read) => A): ReadableAtom<A> => {
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

/**
 * A *writable* derived atom: read like a `derive` (tracked, recomputes when a
 * source changes), but also `set`/`update`, with the write routed back through
 * `write` to the source atoms. For adapters and two-way projections — a form
 * field over a model, a unit conversion — where the value both derives from and
 * feeds the atoms beneath it.
 *
 * ```ts
 * const fahrenheit = derive.writable(
 *   ($) => $(celsius) * 1.8 + 32,
 *   (f) => celsius.set((f - 32) / 1.8),
 * );
 * ```
 */
const deriveWritable = <A>(selector: (read: Read) => A, write: (value: A) => void): Atom<A> => {
  const comp = computation(selector);
  const self: Atom<A> = {
    [AtomTypeId]: true,
    get value() {
      return comp.get();
    },
    set: (value) => write(value),
    update: (update) => write(update(comp.get())),
    subscribe: (listener) => comp.subscribe(listener),
    [Symbol.iterator]: () => yieldSelf(self),
  };
  return self;
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
 *
 * {@link deriveWritable | `derive.writable`} adds a two-way variant.
 */
export const derive = Object.assign(deriveReadonly, { writable: deriveWritable });
