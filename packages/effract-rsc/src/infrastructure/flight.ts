/**
 * The Flight renderer. It drives a tree of effract Server Components with an
 * Effect runtime and streams the result as React Server Components (Flight) —
 * 100% compatible with the standard RSC wire, so it hydrates with the ordinary
 * React client.
 */
import { renderToReadableStream } from 'react-server-dom-webpack/server';
import type { ReactNode } from 'react';
import { provideRuntime, type ServerRuntime } from '#infrastructure/runtime-scope.ts';

export interface FlightOptions {
  /** A self-contained Effect runtime that provides every service the tree needs. */
  readonly runtime: ServerRuntime;
  /**
   * The bundler's client-component manifest. Defaults to `{}` for trees with no
   * client components; a real app passes the manifest its bundler emits.
   */
  readonly clientManifest?: unknown;
  readonly onError?: (error: unknown) => void;
  readonly signal?: AbortSignal;
}

/**
 * Render a tree of effract Server Components to a Flight byte stream. The Effect
 * runtime is held in an `AsyncLocalStorage` scope for the entire render, so
 * every async server component resolves its services against it.
 *
 * ```ts
 * const stream = renderToFlightStream(<Page />, { runtime });
 * return new Response(stream, { headers: { 'content-type': 'text/x-component' } });
 * ```
 */
export const renderToFlightStream = (
  node: ReactNode,
  options: FlightOptions,
): ReadableStream<Uint8Array> =>
  provideRuntime(options.runtime, () =>
    renderToReadableStream(node, options.clientManifest ?? {}, {
      ...(options.onError !== undefined ? { onError: options.onError } : {}),
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    }),
  );
