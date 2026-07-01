/**
 * Recipe 12 — atom collections & batching.
 *
 * `atomFamily` gives one lazily-created, memoised atom per key — per-entity state
 * (a row, a cart line, a person) as a lookup rather than one giant atom you slice.
 * Each reader subscribes to *its own* atom, so toggling one row re-renders only
 * that row. `batch` coalesces a burst of writes into a single notification wave:
 * "reset everyone" writes every atom but each row re-renders once, not once per
 * write.
 *
 * The collection and the reset logic live in the service; a row is a REC that
 * reads its own atom and fires events.
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { atom, atomFamily, batch, mount, rec, type Atom, type AtomFamily } from '@tmonier/effract';

interface Person {
  readonly id: string;
  readonly name: string;
}
const people: ReadonlyArray<Person> = [
  { id: 'ada', name: 'Ada' },
  { id: 'alan', name: 'Alan' },
  { id: 'grace', name: 'Grace' },
];

class Roster extends Context.Service<
  Roster,
  {
    readonly people: ReadonlyArray<Person>;
    readonly attendanceOf: AtomFamily<string, Atom<boolean>>; // one atom per person
    readonly toggle: (id: string) => void;
    readonly resetAll: () => void;
  }
>()('recipes/Roster') {}

const RosterLive = Layer.sync(Roster)(() => {
  const attendanceOf = atomFamily((_id: string) => atom(false));
  return {
    people,
    attendanceOf,
    toggle: (id) => attendanceOf(id).update((here) => !here),
    // One notification wave for the whole roster — each row re-renders once.
    resetAll: () =>
      batch(() => {
        for (const person of people) {
          attendanceOf(person.id).set(false);
        }
      }),
  };
});

// A row reads *its own* atom, so a toggle re-renders only this row.
const Row = rec(function* (props: Person) {
  const roster = yield* Roster;
  const here = yield* roster.attendanceOf(props.id);
  return (
    <li>
      <button type="button" onClick={() => roster.toggle(props.id)}>
        {props.name}: {here ? 'here' : '—'}
      </button>
    </li>
  );
});

export const Attendance = rec(function* () {
  const roster = yield* Roster;
  const rows: Array<ReactNode> = [];
  for (const person of roster.people) {
    rows.push(yield* Row.with(person));
  }
  return (
    <div>
      <ul>{rows}</ul>
      <button type="button" onClick={roster.resetAll}>
        reset all
      </button>
    </div>
  );
});

export const App = (): ReactNode => mount(RosterLive, Attendance);
