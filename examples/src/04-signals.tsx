/**
 * Recipe 04 — signals.
 *
 * `atom` is an Effect reactive cell. Derive from it with `atom.derive` — the value
 * handed over directly, no `$`. In a component, read an atom with `useAtomValue`
 * (or `yield*` in a REC): it subscribes *precisely*, so the component re-renders
 * only when that atom changes. `useAtom` reads and writes one, the `useState`
 * shape. `<Observe>` is the inline-JSX form, for a reactive expression you don't
 * want to hoist.
 *
 * (State usually lives in a service — recipe 05 — so components just read it.)
 */
import type { ReactNode } from 'react';
import { Observe, atom, useAtom, useAtomValue } from '@tmonier/effract';

const count = atom(0);
const doubled = count.derive((n) => n * 2); // a derived atom — computed once, not in a component

export const Doubled = (): ReactNode => {
  const value = useAtomValue(doubled); // read + subscribe — re-renders only when doubled changes
  return <p>doubled: {value}</p>;
};

export const Increment = (): ReactNode => {
  const [n, setN] = useAtom(count); // read + write, the useState shape
  return (
    <button type="button" onClick={() => setN(n + 1)}>
      {n}
    </button>
  );
};

// The inline-JSX form, for a reactive expression you don't want to hoist out.
export const Live = (): ReactNode => <Observe>{($) => <b>{$(count)}</b>}</Observe>;
