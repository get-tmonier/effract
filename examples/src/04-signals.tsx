/**
 * Recipe 04 — signals.
 *
 * `atom` is an Effect reactive cell. `observe` reads one (or several) and
 * subscribes the component *precisely* — it re-renders only when an atom it
 * actually read changes. `useAtom` reads and writes one like `useState`. No
 * provider, no selector boilerplate, no `Effect.runSync` at the call site.
 */
import type { ReactNode } from 'react';
import { Observe, atom, observe, useAtom } from '@tmonier/effract';

// A module-level signal — shared by anything that reads it.
const count = atom(0);

export const Doubled = (): ReactNode => {
  const doubled = observe(($) => $(count) * 2); // re-renders only when count changes
  return <p>doubled: {doubled}</p>;
};

export const Increment = (): ReactNode => {
  const [n, setN] = useAtom(count);
  return (
    <button type="button" onClick={() => setN(n + 1)}>
      {n}
    </button>
  );
};

// The render-prop form, for inline reactive values inside JSX.
export const Live = (): ReactNode => <Observe>{($) => <b>{$(count)}</b>}</Observe>;
