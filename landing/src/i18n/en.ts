import type { SiteContent } from './types';

const en: SiteContent = {
  meta: {
    title: 'effract — write React components as Effect programs',
    description:
      'Write React components as Effect programs. One component, one mount, running in a SPA, during SSR, or as a React Server Component — server vs client is just a runtime detail.',
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
      'The same component, the same mount, runs in a SPA, during SSR, or as a React Server Component — server vs client is just a [[runtime detail]].',
    ctaPrimary: 'Read the docs',
    ctaSecondary: 'Star on GitHub',
    installNote: 'MIT · React 19+ · Effect v4 · ~1.7 kB',
  },
  weave: {
    react: 'React fibers',
    effect: 'Effect fibers',
    aria: 'React fibers and Effect fibers braided into one component',
    caption: 'Two fibers, woven in one render pass —',
    captionEnd: 'speaks both.',
  },
  callsite: {
    caption: 'A service and a real React hook in one body — [[checked at compile time]].',
  },
  thesis: {
    label: 'The thesis',
    title: 'Two fibers, one component',
    body: 'React and Effect both schedule work on fibers. effract drives a component’s generator inside React’s render pass — one stream of yield* for both. [[100% real React, no forked reconciler]].',
    rows: [
      { write: 'yield* Stats', does: 'a service, resolved synchronously' },
      { write: 'yield* hook(useState(0))', does: 'a real React hook, stable order' },
      { write: 'yield* query(data, id)', does: 'suspends; loading tracked in the type' },
      { write: 'a typed failure', does: 'renders a .catch fallback' },
    ],
  },
  everywhere: {
    label: 'One component, one mount, every runtime',
    title: 'You never type “server” or “client”',
    body: 'The same mount(layer, Root), from the same package, in every file. In an RSC graph the bundler hands it a server implementation — no client JS; everywhere else it renders interactively. The component [[never changes]]; only where you mount it does.',
    runtimes: [
      { name: 'SPA', desc: 'Vite, in the browser' },
      { name: 'SSR', desc: 'Bun / Node streaming' },
      { name: 'Start', desc: 'TanStack Start' },
      { name: 'RSC', desc: 'Next.js, no client JS' },
    ],
    caption: 'The same RECs in all four — proven by the example apps.',
  },
  typedErrors: {
    label: 'Typed errors',
    title: 'Every failure has a face',
    body: 'A REC’s failures ride in its type. [[.catch turns them into UI]] — one fallback per error tag, checked exhaustively. No try/catch, no error instanceof, no untyped boundary. Sync or async, on the client or the server.',
    caption: 'Forget a case and it [[won’t compile]] — the error channel keeps you honest.',
  },
  loading: {
    label: 'Loading, handled',
    title: 'A loading state you can’t forget',
    body: 'Async data goes through [[query]] — it suspends for the value, refetches on key, and cancels its fiber on unmount. And, like .catch for errors, it puts a loading obligation in the type: mount [[won’t compile]] until you handle it, with .suspense(fallback) or { loading }. Retries and timeouts are just Effect combinators.',
    caption: 'The obligation bubbles to the root — one boundary discharges the subtree.',
  },
  philosophy: {
    label: 'Philosophy',
    title: 'Keep the rendering layer boring',
    body: 'A React component should be [[almost dull]] — structure and interaction, nothing more. The hard parts live [[outside React]], resolved at the composition boundary and handed to your JSX as a typed result.',
    points: [
      {
        title: 'The hard parts live in Effect',
        desc: 'Retries, concurrency, caching, tracing — Effect’s job, outside the render tree, testable and reusable.',
      },
      {
        title: 'Async composition becomes trivial',
        desc: 'No loading flags, no cascading hooks. Everything resolves before render; the body reads top-to-bottom.',
      },
      {
        title: 'RSC’s good idea, without the server',
        desc: 'RSC’s real win was resolving dependencies at the composition root. effract keeps that, drops the lock-in.',
      },
      {
        title: 'One primitive, not a zoo',
        desc: 'Retire useEffect, a fetch library, context, a store, server actions — one yield* covers all three.',
      },
    ],
  },
  features: {
    label: 'Why effract',
    title: 'The call site, above all',
    items: [
      {
        title: 'Incremental, not a rewrite',
        desc: 'Plain components [[stay plain]] <Component /> JSX. Write a REC only where one needs a service.',
      },
      {
        title: 'Real React, all the way down',
        desc: 'Hooks, Suspense, error boundaries, hydration, RSC — [[all just work]]. effract renders through React.',
      },
      {
        title: 'Services, synchronously',
        desc: 'Reading a service is a [[Context lookup]], not an async round-trip. No Effect.runSync at the call site.',
      },
      {
        title: 'Signals without ceremony',
        desc: 'observe($ => $(count) * 2) re-renders [[exactly when]] an atom you read changes. No provider, no selectors.',
      },
      {
        title: 'RSC, natively',
        desc: 'The same value renders as an [[async Server Component]] with the same mount — one package, no separate server form, no client JS.',
      },
      {
        title: 'Tiny, and never doubled',
        desc: 'The client core is ~1.7 kB min+gzip. React and Effect stay peers (your app’s copy) — [[never bundled or shipped twice]], even across minor versions.',
      },
      {
        title: 'Typed end to end',
        desc: 'Requirements and errors are inferred from your yields — [[mount won’t compile without them]].',
      },
    ],
  },
  cta: {
    title: 'Write it once. Run it anywhere a runtime does.',
    body: 'MIT, on npm. Start with the docs, or the nine call-site recipes.',
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
