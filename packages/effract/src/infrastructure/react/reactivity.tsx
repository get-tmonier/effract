'use client';

/**
 * The signals bridge. Effect's reactive cell is `AtomRef`; this binds it to
 * React so a component re-renders precisely when — and only when — an atom it
 * actually read changes.
 *
 *   observe($ => $(count) * 2)          // a hook: read + auto-subscribe
 *   <Observe>{$ => <b>{$(count)}</b>}</Observe>   // the same, as an element
 *   const [n, setN] = useAtom(count)    // read + write a single atom
 *
 * `observe` tracks exactly the atoms touched during its selector and subscribes
 * to that set, re-tracking on every change so dynamic dependencies stay
 * correct. No `Effect.runSync` at the call site, no manual dependency arrays.
 */
import { useCallback, useRef, useSyncExternalStore, type ReactNode } from 'react';
import * as Equal from 'effect/Equal';
import { AtomRef } from 'effect/unstable/reactivity';

type Ref<A> = AtomRef.AtomRef<A>;

/** Read an atom inside `observe`, subscribing the component to it. */
export type Read = <A>(ref: Ref<A>) => A;

/** Create a reactive cell. Sugar for `AtomRef.make`. */
export const atom = <A,>(initial: A): Ref<A> => AtomRef.make(initial);

interface ObserveState<A> {
  selector: (read: Read) => A;
  deps: Map<Ref<unknown>, unknown>;
  value: A;
  initialized: boolean;
}

const depsEqual = (a: Map<Ref<unknown>, unknown>, b: Map<Ref<unknown>, unknown>): boolean => {
  if (a.size !== b.size) {
    return false;
  }
  for (const [ref, value] of a) {
    if (!b.has(ref) || !Equal.equals(value, b.get(ref))) {
      return false;
    }
  }
  return true;
};

/**
 * Run the selector, tracking which atoms it reads. Returns a *stable* reference
 * when the tracked atoms and their values are unchanged, so it is safe to call
 * from `getSnapshot` without provoking a render loop.
 */
const compute = <A,>(state: ObserveState<A>): A => {
  const nextDeps = new Map<Ref<unknown>, unknown>();
  const read: Read = (ref) => {
    const value = ref.value;
    nextDeps.set(ref as Ref<unknown>, value);
    return value;
  };
  const next = state.selector(read);
  if (state.initialized && depsEqual(state.deps, nextDeps)) {
    state.deps = nextDeps;
    return state.value;
  }
  state.deps = nextDeps;
  state.value = next;
  state.initialized = true;
  return next;
};

/**
 * Subscribe to a derived view over one or more atoms. Re-renders precisely when
 * a read atom changes.
 *
 * ```tsx
 * const doubled = observe(($) => $(count) * 2);
 * ```
 */
export const observe = <A,>(selector: (read: Read) => A): A => {
  const stateRef = useRef<ObserveState<A> | null>(null);
  if (stateRef.current === null) {
    stateRef.current = { selector, deps: new Map(), value: undefined as A, initialized: false };
  }
  stateRef.current.selector = selector;

  const subscribe = useCallback((onStoreChange: () => void) => {
    const state = stateRef.current;
    if (state === null) {
      return () => {};
    }
    let unsubscribes: Array<() => void> = [];
    const resubscribe = (): void => {
      for (const unsub of unsubscribes) {
        unsub();
      }
      unsubscribes = [...state.deps.keys()].map((ref) => ref.subscribe(handleChange));
    };
    function handleChange(): void {
      compute(state as ObserveState<A>);
      resubscribe();
      onStoreChange();
    }
    compute(state);
    resubscribe();
    return () => {
      for (const unsub of unsubscribes) {
        unsub();
      }
    };
  }, []);

  const getSnapshot = useCallback(() => compute(stateRef.current as ObserveState<A>), []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/** Read a single atom's value, subscribing the component to it. */
export const useAtomValue = <A,>(ref: Ref<A>): A => {
  const subscribe = useCallback((onStoreChange: () => void) => ref.subscribe(onStoreChange), [ref]);
  const getSnapshot = useCallback(() => ref.value, [ref]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/** A stable setter for an atom, supporting both values and updater functions. */
export const useAtomSet = <A,>(ref: Ref<A>): ((value: A | ((prev: A) => A)) => void) =>
  useCallback(
    (value) => {
      if (typeof value === 'function') {
        ref.update(value as (prev: A) => A);
      } else {
        ref.set(value);
      }
    },
    [ref],
  );

/** Read and write a single atom — the `useState` shape, backed by Effect. */
export const useAtom = <A,>(ref: Ref<A>): readonly [A, (value: A | ((prev: A) => A)) => void] => [
  useAtomValue(ref),
  useAtomSet(ref),
];

export interface ObserveProps<A extends ReactNode> {
  readonly children: (read: Read) => A;
}

/** The render-prop form of {@link observe}. */
export const Observe = <A extends ReactNode>({ children }: ObserveProps<A>): ReactNode =>
  observe(children);
