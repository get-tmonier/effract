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
  weave: {
    react: 'React fibers',
    effect: 'Effect fibers',
    aria: 'React fibers and Effect fibers braided into one component',
    caption: 'Two fiber systems, braided in one render pass —',
    captionEnd: 'speaks both languages at once.',
  },
  thesis: {
    label: 'The thesis',
    title: 'Two fibers, one component',
    body: 'React schedules work on fibers; so does Effect. A component body is a generator interpreted inside React’s render pass — one stream of yield* that speaks both languages. 100% real React, no forked reconciler.',
    rows: [
      { write: 'yield* Stats', does: 'resolves a service from the runtime — synchronously' },
      { write: 'yield* hook(useState(0))', does: 'a genuine React hook, in stable order' },
      { write: 'yield* fetchUser', does: 'suspends through React Suspense, resumes inline' },
      { write: 'a failure', does: 'throws to the nearest error boundary' },
    ],
  },
  everywhere: {
    label: 'One component, every runtime',
    title: 'Server vs client is just a mount(...)',
    body: 'A browser layer makes it a SPA. A server layer streams SSR. The Flight renderer makes it an RSC. The component never changes — only the runtime under it.',
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
    body: 'A React component should be almost dull: structure and interaction, nothing more. The hard parts — services, async, flags, retries — belong outside React, resolved at the composition boundary and handed to your JSX as a finished, typed result.',
    points: [
      {
        title: 'The hard parts live in Effect',
        desc: 'Retries, concurrency, caching, resource safety, tracing — handled by Effect, outside the render tree, where they’re testable and reusable.',
      },
      {
        title: 'Async composition becomes trivial',
        desc: 'No tree of loading flags and cascading hooks: everything resolves before render, so the body reads top-to-bottom.',
      },
      {
        title: 'RSC’s good idea, without the server',
        desc: 'The win of RSC was moving dependency resolution to the composition root. effract keeps that and drops the lock-in — it works in any runtime.',
      },
      {
        title: 'One primitive, not a zoo',
        desc: 'Retire useEffect, a data-fetching library, context, a store and server actions — one yield* expresses dependency, async and state.',
      },
    ],
  },
  features: {
    label: 'Why effract',
    title: 'The call site, above all',
    items: [
      {
        title: 'Incremental, not a rewrite',
        desc: 'Plain React components stay untouched — ordinary <Component /> JSX. Reach for a REC only where one needs a service, and place it with {yield* Rec}.',
      },
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
        title: 'Typed end to end',
        desc: 'Every service a component needs and every error it can raise is inferred from what it yields — and mount won’t compile unless the runtime provides them.',
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
