/**
 * effract recipes — one call-site pattern per file. Browse them in order; each
 * is self-contained and copy-pasteable.
 *
 *   01  read a service           (rec + mount)
 *   02  hooks and services       (+ hook — the three primitives)
 *   03  async data via Suspense
 *   04  signals (atoms + observe)
 *   05  a stateful service
 *   06  composing layers
 *   07  render a REC on the server — the same mount, the same import
 *   08  typed errors, rendered — exhaustive `.catch` over the error channel
 */
export * as Service from './01-service.tsx';
export * as HooksAndServices from './02-hooks-and-services.tsx';
export * as AsyncAndSuspense from './03-async-and-suspense.tsx';
export * as Signals from './04-signals.tsx';
export * as StatefulService from './05-stateful-service.tsx';
export * as LayerComposition from './06-layer-composition.tsx';
export * as Server from './07-server.tsx';
export * as TypedErrors from './08-typed-errors.tsx';
