/**
 * effract — write React components as Effect programs.
 *
 * This is the **client-graph** entry (the `default` export condition). Whether a
 * component runs in a SPA, during SSR + hydration, or as a client island inside
 * an RSC page, it renders here through the in-render interpreter. A React Server
 * Component graph resolves the sibling `index.server`
 * entry instead (via the package's `react-server` condition) — so you import
 * `mount` from `@tmonier/effract` everywhere and the bundler picks where it runs.
 *
 * @packageDocumentation
 */

export const VERSION = '0.1.0';

// --- the yield protocol ---
export {
  hook,
  isHook,
  HookTypeId,
  isPlacement,
  placement,
  PlacementTypeId,
} from '#domain/protocol.ts';
export type {
  AnyEffect,
  Hook,
  Yieldable,
  RecBody,
  RecGenerator,
  RecHandle,
  RecPlacement,
  RequirementsOf,
  ErrorsOf,
} from '#domain/protocol.ts';

// --- components ---
// `rec` comes from the server-safe descriptor module directly — NOT via the
// `'use client'` `react/rec.tsx` — so a server module importing `rec` is not
// tagged as a client function by an RSC bundler. `mount` here is the client one.
export { rec, RecTypeId } from '#infrastructure/rec-core.tsx';
export type { REC, CatchHandlers, MissingServices, Effective } from '#infrastructure/rec-core.tsx';
export { mount } from '#infrastructure/react/rec.tsx';

// --- the runtime boundary (mount is canonical; Runtime is the low-level provider) ---
export { Runtime, useEffractRuntime } from '#infrastructure/react/runtime.tsx';
export type { RuntimeProps } from '#infrastructure/react/runtime.tsx';

// --- reactivity ---
export {
  observe,
  Observe,
  atom,
  useAtom,
  useAtomValue,
  useAtomSet,
} from '#infrastructure/react/reactivity.tsx';
export type { Read, ObserveProps } from '#infrastructure/react/reactivity.tsx';
