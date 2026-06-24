/**
 * effract-rsc — drive React Effect Components with an Effect runtime and stream
 * them as React Server Components (Flight).
 *
 * The same REC body the client interprets becomes an async Server Component
 * here; its yields resolve against a per-request Effect runtime held in an
 * `AsyncLocalStorage` scope. The output is the standard Flight wire, so it
 * hydrates with the ordinary React client.
 *
 * @packageDocumentation
 */

export const VERSION = '0.1.0';

export { serverComponent, serverView } from '#infrastructure/server-component.tsx';
export { renderToFlightStream } from '#infrastructure/flight.ts';
export type { FlightOptions } from '#infrastructure/flight.ts';
export { provideRuntime, currentRuntime } from '#infrastructure/runtime-scope.ts';
export type { ServerRuntime } from '#infrastructure/runtime-scope.ts';
export { driveServerRec } from '#application/server-driver.ts';
export type { RunEffect } from '#application/server-driver.ts';
