/**
 * The shared components every example renders — in a SPA, in streaming SSR, in
 * TanStack Start, and (via their bodies) as React Server Components.
 *
 * Two kinds of component live here, and that distinction is the whole point:
 *
 *   • **RECs** — made with `rec(...)`. They read the runtime (a service, a
 *     hook bridged through Effect) and are placed by *yielding* them:
 *     `{yield* Counter}`. You reach for a REC only when a component needs Effect.
 *
 *   • **Plain React components** — like `Footer` below. They read nothing from
 *     the runtime, so they stay ordinary React and are written `<Footer />`.
 *
 * effract is incremental: you don't rewrite your app. Keep every presentational
 * component exactly as it is; turn a component into a REC only when it actually
 * needs a service. The two compose freely in the same tree.
 */
import { Suspense, useState, type ReactNode } from 'react';
import { rec, hook, observe } from '@tmonier/effract';
import { StatsBadge } from './universal.tsx';
import { Config, Greeter, Stats, Store } from './services.ts';

// Re-exported so a page can pull every shared component from one place; the
// same value also `serve`s on the server (see `./universal.tsx`).
export { StatsBadge };

const card = 'rounded-xl border border-slate-800 bg-slate-900/60 p-4';

/**
 * A *plain* React component — no services, no effract, no `yield*`. It is
 * written and used exactly like any React component (`<Footer />`). It sits in
 * the same tree as the RECs to make the point: only runtime-touching components
 * change; everything else is normal React.
 */
function Footer(): ReactNode {
  return (
    <footer className="mt-12 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
      built with <span className="text-slate-300">effract</span> · by{' '}
      <a href="https://tmonier.com" className="text-violet-400 hover:text-violet-300">
        tmonier
      </a>
    </footer>
  );
}

/**
 * The headline: a genuine `useState` hook and an Effect service, interleaved in
 * one render pass. Click it — the hook holds state, the service re-resolves.
 */
export const Counter = rec(function* () {
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
export const Likes = rec(function* () {
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
export const Todos = rec(function* () {
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
export const Greeting = rec(function* () {
  const greeter = yield* Greeter;
  const message = yield* greeter.greet('world');
  return (
    <p className="rounded-xl border border-dashed border-slate-800 p-4 text-teal-400">{message}</p>
  );
});

/** Composes the shared RECs into one page. This is what every example mounts. */
export const Dashboard = rec(function* () {
  const config = yield* Config;
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 text-slate-100">
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <h1 className="bg-gradient-to-r from-violet-500 to-teal-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          {config.appName}
        </h1>
        {/* a REC (needs the `Stats` service) → placed by yielding it */}
        {yield* StatsBadge}
      </header>
      <p className="mt-6 mb-8 leading-relaxed text-slate-400">{config.tagline}</p>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {yield* Counter}
        {yield* Likes}
        {yield* Todos}
        <Suspense
          fallback={
            <p className="rounded-xl border border-dashed border-slate-800 p-4 text-slate-500 sm:col-span-2">
              greeting…
            </p>
          }
        >
          <div className="sm:col-span-2">{yield* Greeting}</div>
        </Suspense>
      </section>
      {/* a plain React component → written as ordinary JSX, no yield */}
      <Footer />
    </main>
  );
});
