/**
 * `@tmonier/effract-rsc/driver` — just the async REC driver, with none of the
 * Flight/Web-Worker machinery. Import this from frameworks that own their own
 * RSC pipeline (Next.js, etc.) to render an effract Server Component body
 * against a runtime you build yourself.
 *
 * @packageDocumentation
 */

export { driveServerRec } from '#application/server-driver.ts';
export type { RunEffect } from '#application/server-driver.ts';
