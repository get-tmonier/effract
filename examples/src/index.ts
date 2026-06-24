/**
 * effract recipes — one call-site pattern per file. Browse them in order; each
 * is self-contained and copy-pasteable.
 *
 *   01  read a service
 *   02  hooks and services together
 *   03  async data via Suspense
 *   04  signals (atoms + observe)
 *   05  a stateful service
 *   06  composing layers
 *   07  resolve-up-front with `view`
 *   08  a React Server Component
 */
export * as Service from './01-service.tsx';
export * as HooksAndServices from './02-hooks-and-services.tsx';
export * as AsyncAndSuspense from './03-async-and-suspense.tsx';
export * as Signals from './04-signals.tsx';
export * as StatefulService from './05-stateful-service.tsx';
export * as LayerComposition from './06-layer-composition.tsx';
export * as ResolveUpFront from './07-resolve-up-front.tsx';
export * as ServerComponent from './08-server-component.tsx';
