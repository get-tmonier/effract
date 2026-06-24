/**
 * effract — write React components as Effect programs.
 *
 * The same component runs in a SPA, on a Bun/Node server, in a Web Worker, or
 * as a React Server Component. "Server vs client" is an Effect runtime detail,
 * supplied by a `<Runtime>` boundary — not an architectural fork.
 *
 * @packageDocumentation
 */

export const VERSION = '0.1.0';

// --- the yield protocol ---
export { hook, isHook, HookTypeId } from '#domain/protocol.ts';
export type {
  AnyEffect,
  Hook,
  Yieldable,
  RecBody,
  RecGenerator,
  RequirementsOf,
  ErrorsOf,
} from '#domain/protocol.ts';

// --- components ---
export { component, view } from '#infrastructure/react/component.tsx';
export type { Component } from '#infrastructure/react/component.tsx';

// --- the runtime boundary ---
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
