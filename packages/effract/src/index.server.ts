/**
 * effract — the **server-graph** entry (the `react-server` export condition).
 *
 * A React Server Component graph resolves `@tmonier/effract` to *this* module.
 * It exposes the same authoring surface — `rec` and the yield protocol — plus a
 * `mount` that renders on the server: it drives the REC
 * against an Effect runtime and returns an async React Server Component, with no
 * hooks and no client JavaScript. You never choose it: import `mount` from
 * `@tmonier/effract` and the bundler hands server components this version and
 * client components the sibling `index.client` one.
 *
 * Client-only APIs (`Runtime`, `observe`, `useAtom`, …) are intentionally absent
 * here — a component that needs them is a client island, and lives in the client
 * graph. The state *primitives* `atom`/`derive` are not client-only, though: they
 * are pure Effect-backed state, so a universal service that holds one stays
 * server-safe and they are exported here too.
 *
 * @packageDocumentation
 */

export const VERSION = '0.1.0';

// --- the yield protocol ---
// NOTE: `hook` is deliberately *not* exported here. React hooks are a client
// render-pass concept RSC has no equivalent for, so `hook(...)` does not exist
// in the server graph: reach for it in a Server Component and it is a compile
// error ("hook is not exported"), not a runtime surprise. (`observe`/`useAtom`
// are absent for the same reason — they live only in the client entry. `atom`
// and `derive`, being React-free state, are exported below.)
// `suspend`/`query` *are* exported: an async dependency has a sensible server
// meaning (its effect is awaited inline), so a universal REC that uses one stays
// server-safe — the loading obligation it carries is simply ignored here.
export {
  isPlacement,
  placement,
  PlacementTypeId,
  suspend,
  query,
  isSuspensable,
  SuspensableTypeId,
  isAtom,
  AtomTypeId,
} from '#domain/protocol.ts';
export type {
  AnyEffect,
  Suspensable,
  Suspends,
  Atom,
  ReadableAtom,
  Yieldable,
  RecBody,
  RecGenerator,
  RecHandle,
  RecPlacement,
  RequirementsOf,
  ErrorsOf,
  SuspendsOf,
} from '#domain/protocol.ts';

// `atom` / `derive` are server-safe (pure Effect-backed state), so a universal
// service that holds reactive state stays server-safe. The hooks that *read* them
// in a component are client-only and absent here (like `hook`/`observe`).
export { atom, derive, atomFamily, batch } from '#infrastructure/reactivity-core.ts';
export type { Read, AtomFamily, AsyncDerived } from '#infrastructure/reactivity-core.ts';

// --- components ---
export { rec, RecTypeId } from '#infrastructure/rec-core.tsx';
export type { REC, CatchHandlers, MissingServices, Effective } from '#infrastructure/rec-core.tsx';
export { mount } from '#infrastructure/server/mount.ts';

// --- the low-level server driver, for custom pipelines (per-request runtimes, Flight) ---
export { driveServerRec } from '#application/server-driver.ts';
export type { RunEffect } from '#application/server-driver.ts';
