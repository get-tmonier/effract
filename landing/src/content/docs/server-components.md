---
title: Server Components
description: Drive REC bodies as React Server Components and stream standard Flight.
group: Advanced
order: 1
---

`@tmonier/effract-rsc` drives the **same REC bodies** on the server and streams standard Flight, so
the ordinary React client hydrates them. On the server there's no render pass to suspend and no hooks
— a Server Component is simply `async` and awaits its data.

```bash
pnpm add @tmonier/effract-rsc
```

## A server component

`serverComponent` lifts a service-only body (no hooks) into an async React Server Component. The body
is identical in shape to one a client `component` would accept:

```tsx
import { serverComponent, renderToFlightStream } from '@tmonier/effract-rsc';
import * as ManagedRuntime from 'effect/ManagedRuntime';

function* statsBadge() {
  const stats = yield* Stats; // resolved on the server
  return <span>{stats.online} online</span>;
}

export const StatsBadge = serverComponent(statsBadge);

// stream it as Flight, behind an Effect runtime:
const runtime = ManagedRuntime.make(AppLive);
const stream = renderToFlightStream(<StatsBadge />, { runtime }); // → text/x-component
```

The runtime is held in an `AsyncLocalStorage` scope for the whole render, so every async server
component resolves its services against it.

## Inside a framework

Frameworks like Next.js own their own RSC pipeline. Import just the driver and render a body against
a runtime you build yourself:

```tsx
import { driveServerRec } from '@tmonier/effract-rsc/driver';

const runtime = ManagedRuntime.make(AppLive);

export default async function Page() {
  const badge = await driveServerRec(statsBadge(), (e) => runtime.runPromise(e as never));
  return <main>{badge}</main>;
}
```

## In a Web Worker

`@tmonier/effract-rsc/worker` renders Flight off the main thread and transfers the byte stream back
to the page with `serveFlight` (worker side) and `flightFromWorker` (page side).
