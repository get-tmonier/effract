---
title: Client & server
description: One mount, from one package, renders interactively or on the server — you never choose.
group: Core
order: 6
---

There is no separate server package and no separate server API. You render a REC on the server with the
**same `mount`** you use on the client, imported from the **same `@tmonier/effract`**. In a React
Server Component graph, the bundler's `react-server` export condition hands `mount` a server
implementation — it drives the tree on the server and returns an async Server Component, with no hooks
and no client JavaScript. You never choose client vs server; where the module runs decides.

## Render a REC on the server

A **service-only** REC (no hooks) is universal. `mount(layer, Root)` returns an async Server Component
you export or place as `<Page />`. You wire the runtime **once, at the root**, and compose the tree with
`yield*`, exactly as on the client — the runtime never appears in your markup.

```tsx
import { rec, mount } from '@tmonier/effract'; // the same import as the client

// Authored once. The same value mounts on the client, too.
const StatsBadge = rec(function* () {
  const stats = yield* Stats; // resolved on the server, no client JS
  return <span>{stats.online} online</span>;
});

// The page is a REC; children are composed with `yield*`.
const Page = rec(function* () {
  return <main>{yield* StatsBadge}</main>;
});

// The one boundary — the very same call a client root makes.
export default mount(AppLive, Page);
```

`mount` builds the Effect runtime from `layer` once (reused across renders) and drives the tree.
Because the service check lives on the `rec` argument, `mount(Layer.empty, Page)` — a layer missing a
service the tree needs — is a **type error that names the missing service**, on the server exactly as on
the client. A universal REC composed of other universal RECs (`{yield* Child}`) drives its children
inline on the server too — the whole subtree renders with no client JavaScript.

## Client → server is a move, not a rewrite

Because it's the same component and the same call, flipping a piece from an interactive client island to
a zero-JS server component is just moving where you `mount` it. A client island:

```tsx
// island.tsx  ('use client')  → interactive, ships JS
'use client';
import { mount } from '@tmonier/effract';
export const Badge = () => mount(AppLive, StatsBadge);
```

becomes a server component by `mount`ing it from a server module — **the component and the call are
identical**, only the file changes:

```tsx
// page.tsx  (a React Server Component)  → resolved on the server, no JS
import { mount } from '@tmonier/effract';
export default mount(AppLive, StatsBadge);
```

> **The one rule, enforced at compile time.** A hook-bearing REC can't be a Server Component — RSC has
> no hooks. You can't get it wrong: the hooks — `hook`, `observe`, `useAtom` — **aren't exported from
> the server build**, so reaching for one in a Server Component is a compile error (_"`hook` is not
> exported"_). (`atom` / `derive` _are_ exported there — reactive state is React-free, so a service can
> hold it on the server too; only _reading_ an atom in a component needs a hook.) Move the component to
> a `'use client'` module and it's a client island again.
