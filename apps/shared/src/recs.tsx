/**
 * The shared React Effect Components. Every example renders these exact
 * components — in a SPA, in streaming SSR, in TanStack Start, and (via their
 * bodies) as React Server Components. Nothing here knows where it runs.
 *
 * Read the call sites: a service is `yield* Stats`; a React hook is
 * `yield* hook(useState(0))`; async data is `yield* greeter.greet(...)`; a
 * reactive value is `yield* hook(observe(($) => $(store.todos)))`. One uniform
 * stream of `yield*`, two runtimes underneath.
 */
import { Suspense, useState } from 'react';
import { component, hook, observe } from '@tmonier/effract';
import { statsBadge } from './bodies.tsx';
import { Config, Greeter, Stats, Store } from './services.ts';

const card = 'rounded-xl border border-slate-800 bg-slate-900/60 p-4';

/**
 * The service-only badge (its body lives in `./bodies.tsx`, so the same body
 * also renders as a React Server Component) as a client component.
 */
export const StatsBadge = component(statsBadge);

/**
 * The headline: a genuine `useState` hook and an Effect service, interleaved in
 * one render pass. Click it — the hook holds state, the service re-resolves.
 */
export const Counter = component(function* () {
  const stats = yield* Stats;
  const [n, setN] = yield* hook(useState(0));
  return (
    <button
      type="button"
      onClick={() => setN(n + 1)}
      className={`${card} text-left transition hover:border-violet-500`}
    >
      <span className="block text-2xl font-semibold text-slate-100">{n}</span>
      <span className="text-sm text-slate-400">local hook state · {stats.total} sessions</span>
    </button>
  );
});

/**
 * Wired to a *stateful* service. `observe` subscribes to the store's reactive
 * `likes` cell; the button calls a real service method that mutates it.
 */
export const Likes = component(function* () {
  const store = yield* Store;
  const likes = yield* hook(observe(($) => $(store.likes)));
  return (
    <button
      type="button"
      onClick={() => store.like()}
      className={`${card} text-left transition hover:border-violet-500`}
    >
      <span className="block text-2xl font-semibold text-teal-400">♥ {likes}</span>
      <span className="text-sm text-slate-400">Effect-managed state</span>
    </button>
  );
});

/**
 * The fullest call site: a stateful service (`Store`), a precise reactive read
 * (`observe`), and a local React hook (`useState` for the draft) — together.
 */
export const Todos = component(function* () {
  const store = yield* Store;
  const todos = yield* hook(observe(($) => $(store.todos)));
  const [draft, setDraft] = yield* hook(useState(''));

  const submit = (): void => {
    const text = draft.trim();
    if (text.length > 0) {
      store.addTodo(text);
      setDraft('');
    }
  };

  return (
    <div className={`${card} sm:col-span-2`}>
      <ul className="space-y-1">
        {todos.map((todo) => (
          <li key={todo.id}>
            <button
              type="button"
              onClick={() => store.toggleTodo(todo.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-slate-200 hover:bg-slate-800"
            >
              <span className={todo.done ? 'text-teal-400' : 'text-slate-500'}>
                {todo.done ? '☑' : '☐'}
              </span>
              <span className={todo.done ? 'line-through text-slate-500' : ''}>{todo.text}</span>
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="add a step…"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-500"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-800 bg-slate-800 px-3 py-2 text-slate-100 hover:border-violet-500"
        >
          add
        </button>
      </form>
    </div>
  );
});

/** An async service read — it suspends through React Suspense, then resolves. */
export const Greeting = component(function* () {
  const greeter = yield* Greeter;
  const message = yield* greeter.greet('world');
  return (
    <p className="rounded-xl border border-dashed border-slate-800 p-4 text-teal-400">{message}</p>
  );
});

/** Composes the shared RECs into one page. This is what every example mounts. */
export const Dashboard = component(function* () {
  const config = yield* Config;
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 text-slate-100">
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <h1 className="bg-gradient-to-r from-violet-500 to-teal-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          {config.appName}
        </h1>
        <StatsBadge />
      </header>
      <p className="mt-6 mb-8 leading-relaxed text-slate-400">{config.tagline}</p>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Counter />
        <Likes />
        <Todos />
        <Suspense
          fallback={
            <p className="rounded-xl border border-dashed border-slate-800 p-4 text-slate-500 sm:col-span-2">
              greeting…
            </p>
          }
        >
          <div className="sm:col-span-2">
            <Greeting />
          </div>
        </Suspense>
      </section>
    </main>
  );
});
