/**
 * Render Flight off the main thread. The same `renderToFlightStream` runs
 * inside a Web Worker; the resulting byte stream is transferred back to the
 * page. Useful for keeping serialization work off an interactive thread, and a
 * neat demonstration that "where the Effect runtime lives" is just a detail.
 */

/** A worker that renders a request to a Flight stream. */
export interface FlightWorker<Req> {
  readonly render: (
    request: Req,
  ) => ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>;
}

interface MessageListenerScope {
  readonly addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
}

const workerScope = (): MessageListenerScope => self as unknown as MessageListenerScope;

/**
 * Install a Flight handler inside a Web Worker. Each request arrives with a
 * `MessagePort`; the rendered stream is transferred back through it.
 *
 * ```ts
 * // worker.ts
 * serveFlight({ render: (req) => renderToFlightStream(resolve(req), { runtime }) });
 * ```
 */
export const serveFlight = <Req>(
  worker: FlightWorker<Req>,
  scope: MessageListenerScope = workerScope(),
): void => {
  scope.addEventListener('message', (event) => {
    const data = event.data as { readonly request: Req; readonly port: MessagePort };
    void Promise.resolve(worker.render(data.request)).then((stream) => {
      data.port.postMessage(stream, [stream as unknown as Transferable]);
    });
  });
};

/**
 * Main-thread companion: ask a worker to render `request` and resolve with the
 * transferred Flight stream.
 *
 * ```ts
 * const stream = await flightFromWorker(worker, { route: '/dashboard' });
 * ```
 */
export const flightFromWorker = <Req>(
  worker: Worker,
  request: Req,
): Promise<ReadableStream<Uint8Array>> => {
  const channel = new MessageChannel();
  return new Promise((resolve, reject) => {
    channel.port1.addEventListener('message', (event: MessageEvent) => {
      resolve(event.data as ReadableStream<Uint8Array>);
    });
    channel.port1.start();
    try {
      worker.postMessage({ request, port: channel.port2 }, [channel.port2]);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
};
