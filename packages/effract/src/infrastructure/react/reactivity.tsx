'use client';

/**
 * The React binding for reactive atoms — the client half of the reactivity
 * bridge. The atoms themselves (`atom`, `derive`) are server-safe and live in
 * `../reactivity-core`; this module adds the hooks that read them in a component
 * (`observe`, `<Observe>`, `useAtom*`) and the in-render reader the interpreter
 * uses for a yielded atom. Owning a signal in a service needs no React; only
 * *reading one in the render pass* does — which is why this half is `'use client'`.
 *
 *   const doubled = observe(($) => $(count) * 2);   // hook: derived read
 *   <Observe>{($) => <b>{$(count)}</b>}</Observe>   // the same, inline in JSX
 *   const [n, setN] = useAtom(count);               // read + write, useState-shaped
 */
import { useCallback, useRef, useSyncExternalStore, type ReactNode } from 'react';
import type { Atom, ReadableAtom } from '#domain/protocol.ts';
import type { Reader } from '#application/ports.ts';
import { computation, type Computation, type Read } from '#infrastructure/reactivity-core.ts';

/**
 * Subscribe a component to a derived view over one or more atoms — the hook form,
 * for inline use. Re-renders precisely when a read atom changes. Prefer `derive`
 * for values shared across components, and `<Observe>` for inline JSX.
 *
 * ```tsx
 * const doubled = observe(($) => $(count) * 2);
 * ```
 */
export const observe = <A,>(selector: (read: Read) => A): A => {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const compRef = useRef<Computation<A> | null>(null);
  if (compRef.current === null) {
    compRef.current = computation((read) => selectorRef.current(read));
  }
  const comp = compRef.current;
  const subscribe = useCallback(
    (onStoreChange: () => void) => comp.subscribe(onStoreChange),
    [comp],
  );
  const getSnapshot = useCallback(() => comp.get(), [comp]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/** Read a single atom's value, subscribing the component to it. */
export const useAtomValue = <A,>(atomRead: ReadableAtom<A>): A => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => atomRead.subscribe(onStoreChange),
    [atomRead],
  );
  const getSnapshot = useCallback(() => atomRead.value, [atomRead]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/** A stable setter for a writable atom, supporting both values and updater functions. */
export const useAtomSet = <A,>(atomWrite: Atom<A>): ((value: A | ((prev: A) => A)) => void) =>
  useCallback(
    (value) => {
      if (typeof value === 'function') {
        atomWrite.update(value as (prev: A) => A);
      } else {
        atomWrite.set(value);
      }
    },
    [atomWrite],
  );

/** Read and write a single atom — the `useState` shape, backed by Effect. */
export const useAtom = <A,>(
  atomWrite: Atom<A>,
): readonly [A, (value: A | ((prev: A) => A)) => void] => [
  useAtomValue(atomWrite),
  useAtomSet(atomWrite),
];

export interface ObserveProps<A extends ReactNode> {
  readonly children: (read: Read) => A;
}

/** The render-prop form of {@link observe}, for inline reactive values in JSX. */
export const Observe = <A extends ReactNode>({ children }: ObserveProps<A>): ReactNode =>
  observe(children);

/**
 * The reader the interpreter uses to resolve a yielded atom: read its current
 * value and subscribe this render to it (React's `useSyncExternalStore`). Called
 * once per atom read during the render pass, in the body's stable order.
 */
export const atomReader: Reader = {
  // `atom.subscribe` is a stable reference on the atom, so pass it directly —
  // React must not see a new `subscribe` each render or it re-subscribes every
  // time (and, for an object-valued derived atom, could churn).
  read: (atomRead) =>
    useSyncExternalStore(atomRead.subscribe, getValue(atomRead), getValue(atomRead)),
};

const snapshots = new WeakMap<ReadableAtom<unknown>, () => unknown>();
/** A per-atom stable `getSnapshot` (`() => atom.value`), memoised by atom identity. */
const getValue = <A,>(atomRead: ReadableAtom<A>): (() => A) => {
  let snapshot = snapshots.get(atomRead) as (() => A) | undefined;
  if (snapshot === undefined) {
    snapshot = () => atomRead.value;
    snapshots.set(atomRead, snapshot);
  }
  return snapshot;
};
