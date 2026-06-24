/**
 * Plain Bun streaming SSR — no framework. The same `<Dashboard />` the SPA
 * mounts is rendered to an HTML stream here, behind a server-side Effect
 * runtime, and then hydrated by `client.tsx`. "Server vs client" is just which
 * runtime renders it.
 */
import type { ReactElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { Runtime } from '@tmonier/effract';
import { AppLive, Dashboard } from '@effract/shared';

const port = Number(Bun.env.PORT ?? '3000');

// Build the hydration bundle and load the compiled stylesheet once at startup.
const clientBuild = await Bun.build({
  entrypoints: ['./src/client.tsx'],
  target: 'browser',
  minify: true,
});
const clientJs = await clientBuild.outputs[0]!.text();
const appCss = await Bun.file('./public/app.css')
  .text()
  .catch(() => '');

function Document(): ReactElement {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>effract · Bun streaming SSR</title>
        <style dangerouslySetInnerHTML={{ __html: appCss }} />
      </head>
      <body>
        <div id="root">
          <Runtime layer={AppLive}>
            <Dashboard />
          </Runtime>
        </div>
      </body>
    </html>
  );
}

Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/client.js') {
      return new Response(clientJs, {
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      });
    }
    const stream = await renderToReadableStream(<Document />, {
      bootstrapModules: ['/client.js'],
    });
    return new Response(stream, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  },
});

console.log(`effract bun-ssr → http://localhost:${port}`);
