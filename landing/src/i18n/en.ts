import type { SiteContent } from './types';

const en: SiteContent = {
  meta: {
    title: 'effract — write React components as Effect programs',
    description:
      'effract is an Effect-native React framework. Write a component once; the same component runs in a SPA, on a server, in a Web Worker, or as a React Server Component. Server vs client becomes an Effect runtime detail.',
  },
  nav: {
    thesis: 'Thesis',
    everywhere: 'Everywhere',
    features: 'Features',
    docs: 'Docs',
  },
  hero: {
    eyebrow: 'Effect-native React',
    titleLead: 'Write React components as',
    titleGradient: 'Effect programs.',
    subtitle:
      'The same component runs in a SPA, on a server, in a Web Worker, or as a React Server Component. "Server vs client" stops being an architectural fork and becomes an Effect runtime detail.',
    ctaPrimary: 'Read the docs',
    ctaSecondary: 'Star on GitHub',
    installNote: 'MIT · React 19.2+ · Effect v4',
  },
  thesis: {
    label: 'The thesis',
    title: 'Two fibers, one component',
    body: 'React schedules work on fibers. Effect schedules work on fibers. effract is the loom between the two. A component body is a generator interpreted inside React’s render pass — so one stream of yield* speaks both languages at once. It stays 100% real React. The reconciler is never forked.',
    rows: [
      { write: 'yield* Stats', does: 'resolves a service from the runtime — synchronously' },
      { write: 'yield* hook(useState(0))', does: 'a genuine React hook, in stable order' },
      { write: 'yield* fetchUser', does: 'suspends through React Suspense, resumes inline' },
      { write: 'a failure', does: 'throws to the nearest error boundary' },
    ],
  },
  everywhere: {
    label: 'One component, every runtime',
    title: 'Server vs client is just a <Runtime>',
    body: 'Provide a browser layer and it’s a SPA. Provide a server layer and it streams SSR. Drive it with the Flight renderer and it’s a React Server Component. The component never changes — only the runtime under it does.',
    runtimes: [
      { name: 'SPA', desc: 'Vite, in the browser' },
      { name: 'SSR', desc: 'Bun / Node streaming' },
      { name: 'Web Worker', desc: 'off the main thread' },
      { name: 'RSC', desc: 'Flight, streamed' },
    ],
    caption: 'The same RECs render in all four — proven by the example apps.',
  },
  philosophy: {
    label: 'Philosophy',
    title: 'Keep the rendering layer boring',
    body: 'A good React component should be clean and almost dull: structure and interaction, nothing more. The complex stuff — services, async data, flags, permissions, retries — belongs outside React. effract agrees. It resolves those dependencies at the composition boundary, inline, and hands your JSX the finished, typed result.',
    points: [
      {
        title: 'The hard parts live in Effect',
        desc: 'Retries, interruption, concurrency, caching, resource safety, tracing — handled by Effect, outside the render tree, where they are testable and reusable. Your component just declares what it needs.',
      },
      {
        title: 'Async composition becomes trivial',
        desc: 'No tree of hooks, loading flags and cascading dependencies. Everything is resolved before the component renders, so the body reads top-to-bottom and almost boring — and that is exactly the point.',
      },
      {
        title: 'RSC’s good idea, without the server',
        desc: 'The valuable part of React Server Components was moving dependency resolution to the composition root — not "React on the server". effract keeps that idea and drops the lock-in: it happens in any runtime.',
      },
      {
        title: 'One primitive, not a zoo',
        desc: 'Retire the stack of useEffect, a data-fetching library, context, a store and server actions. A single yield* over Effect expresses dependency, async and state — one mental model, end to end.',
      },
    ],
  },
  features: {
    label: 'Why effract',
    title: 'The call site, above all',
    items: [
      {
        title: 'Real React, all the way down',
        desc: 'Hooks keep their order. Suspense, error boundaries, memoization, hydration and RSC all just work — because effract renders through React, not around it.',
      },
      {
        title: 'Services, synchronously',
        desc: 'Reading a service is a Context lookup, not an async round-trip. No Effect.runSync footgun ever reaches your call site.',
      },
      {
        title: 'Signals without ceremony',
        desc: 'observe($ => $(count) * 2) re-renders precisely when — and only when — an atom you read changes. No provider, no selector boilerplate.',
      },
      {
        title: 'RSC, natively',
        desc: 'The same body drives an async Server Component and streams standard Flight, from a server or a Web Worker.',
      },
      {
        title: 'Layers, composed',
        desc: 'Services depend on services. Compose your runtime with Effect Layers and hand it to a <Runtime> — the components just read the result.',
      },
      {
        title: 'Typed end to end',
        desc: 'Requirements and errors are inferred from what you yield. Strict by design: tsgo, oxlint, dependency-cruiser, hexagonal boundaries.',
      },
    ],
  },
  cta: {
    title: 'Write it once. Run it anywhere a runtime does.',
    body: 'effract is MIT-licensed and published on npm. Start with the docs, or read the eight call-site recipes.',
    primary: 'Get started',
    secondary: 'View on GitHub',
  },
  footer: {
    tagline: 'React components, written as Effect programs.',
    builtBy: 'Built by Damien Meur',
    docs: 'Docs',
    npm: 'npm',
  },
};

export default en;
