# Context Map

## Packages

- [`@tmonier/effract`](./packages/effract) — the core. The yield protocol, the in-render interpreter, the
  `<Runtime>` boundary, and the signals bridge.
- [`@tmonier/effract-rsc`](./packages/effract-rsc) — the server side. Drives REC bodies as async React
  Server Components and streams Flight; includes a Web Worker variant.
- [`@tmonier/effract-vite`](./packages/effract-vite) — a thin Vite plugin (React Fast Refresh + de-dup).

## Shared concept

The **React Effect Component (REC)** — a component body written as a generator. Its *body* is the unit of
sharing: the same body is interpreted in-render on the client by `@tmonier/effract` and awaited on the
server by `@tmonier/effract-rsc`.

## Relationships

- **effract-rsc → effract**: the RSC driver imports the protocol (`hook`, `isHook`, REC types) from the
  core's public entry; it re-resolves the same yields against a per-request runtime.
- **effract-vite → (vite, react)**: pure tooling; it knows nothing about the runtime.
- **apps/shared → effract, effract-rsc**: defines the services, the composed `AppLive` layer, and the
  components every example renders. Server-safe REC bodies live in `bodies.tsx`; client components in
  `recs.tsx`.

## Layering (inside each package)

```
domain/           pure protocol + types — Effect vocabulary, never React
application/      the interpreter + ports — React-free, capabilities injected
infrastructure/   adapters — the React binding, the Flight renderer, the worker
```

Enforced by dependency-cruiser; the only composition seams are `index.ts` and the subpath entries.
