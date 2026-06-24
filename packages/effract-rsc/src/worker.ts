/**
 * `@tmonier/effract-rsc/worker` — the Web Worker Flight surface.
 *
 * Import `serveFlight` inside a worker to render Flight off the main thread, and
 * `flightFromWorker` on the page to request and receive the transferred stream.
 *
 * @packageDocumentation
 */

export { serveFlight, flightFromWorker } from '#infrastructure/worker.ts';
export type { FlightWorker } from '#infrastructure/worker.ts';
