# Context Map

## Packages

- [`@tmonier/effract`](./packages/effract) — everything. The yield protocol, the in-render interpreter,
  the `Runtime` boundary, the signals bridge, **and** the server renderer. It ships two conditional
  entries: `index.client.ts` (the `default` condition — the client `mount`) and `index.server.ts` (the
  `react-server` condition — the server `mount`, driving RECs as async Server Components). Same import,
  the bundler picks the implementation.
- [`@tmonier/effract-vite`](./packages/effract-vite) — a thin Vite plugin (React Fast Refresh + de-dup).

## Shared concept

The **React Effect Component (REC)** — a component body written as a generator. A `rec(...)` value is
the unit of sharing: a service-only REC is *one value*, interpreted in-render on the client and driven
on the server — the very same `mount(layer, Root)` renders it in both places, with no separate body or
server form to keep in sync.

## Relationships

- **client vs server**: `mount` has two implementations in one package — `#infrastructure/react/rec.tsx`
  (client, `'use client'`, in-render interpreter) and `#infrastructure/server/mount.ts` (server, drives
  via `#application/server-driver.ts`). The `react-server` export condition selects between them, so a
  server module and a client module import the identical `mount`.
- **effract-vite → (vite, react)**: pure tooling; it knows nothing about the runtime.
- **apps/shared → effract**: defines the services, the composed `AppLive` layer, and the components every
  example renders. Universal (service-only) RECs live in `universal.tsx` — the same values `page.tsx`
  `mount`s on the server; hook-bearing client RECs live in `recs.tsx`.

## Layering (inside each package)

```
domain/           pure protocol + types — Effect vocabulary, never React
application/      the interpreter + the server driver — React-free, capabilities injected
infrastructure/   adapters — the client React binding, the server mount
```

Enforced by dependency-cruiser; the only composition seams are the `index.*` entries.
