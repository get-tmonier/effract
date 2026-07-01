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
 * Client-only APIs (`Runtime`, `observe`, `atom`, …) are intentionally absent
 * here — a component that needs them is a client island, and lives in the client
 * graph.
 *
 * @packageDocumentation
 */

export const VERSION = '0.1.0';

// --- the yield protocol ---
// NOTE: `hook` is deliberately *not* exported here. React hooks are a client
// render-pass concept RSC has no equivalent for, so `hook(...)` does not exist
// in the server graph: reach for it in a Server Component and it is a compile
// error ("hook is not exported"), not a runtime surprise. (`observe`/`atom` are
// absent for the same reason — they live only in the client entry.)
// `query` *is* exported: an async data dependency has a sensible server meaning
// (its effect is awaited inline), so a universal REC that uses it stays
// server-safe — the loading obligation it carries is simply ignored here.
export {
  isPlacement,
  placement,
  PlacementTypeId,
  query,
  isQuery,
  QueryTypeId,
} from '#domain/protocol.ts';
export type {
  AnyEffect,
  Query,
  Suspends,
  Yieldable,
  RecBody,
  RecGenerator,
  RecHandle,
  RecPlacement,
  RequirementsOf,
  ErrorsOf,
  SuspendsOf,
} from '#domain/protocol.ts';

// --- components ---
export { rec, RecTypeId } from '#infrastructure/rec-core.tsx';
export type { REC, CatchHandlers, MissingServices, Effective } from '#infrastructure/rec-core.tsx';
export { mount } from '#infrastructure/server/mount.ts';

// --- the low-level server driver, for custom pipelines (per-request runtimes, Flight) ---
export { driveServerRec } from '#application/server-driver.ts';
export type { RunEffect } from '#application/server-driver.ts';
