/**
 * The narrow slice of `react-server-dom-webpack/server` that effract-rsc uses.
 * Declaring it here keeps typecheck independent of the `react-server` export
 * condition (which only resolves inside a bundler configured for RSC), while
 * documenting exactly the API surface we depend on.
 */
declare module 'react-server-dom-webpack/server' {
  import type { ReactNode } from 'react';

  export interface RenderToReadableStreamOptions {
    readonly onError?: (error: unknown) => void;
    readonly signal?: AbortSignal;
    readonly identifierPrefix?: string;
  }

  /**
   * Serialize a React tree (Server Components and references to Client
   * Components) to the Flight wire format as a byte stream.
   */
  export function renderToReadableStream(
    model: ReactNode,
    webpackMap?: unknown,
    options?: RenderToReadableStreamOptions,
  ): ReadableStream<Uint8Array>;
}
