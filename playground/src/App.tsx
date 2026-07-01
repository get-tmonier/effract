import { useState } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { hook, rec } from '@tmonier/effract';

// A service — resolved from the runtime, read synchronously inside a component.
export class Stats extends Context.Service<Stats, { readonly online: number }>()('demo/Stats') {}
export const AppLive = Layer.succeed(Stats)({ online: 1280 });

// A React Effect Component. The body is one stream of `yield*`: an Effect service
// and a genuine React hook, interpreted inside React's render pass.
export const Counter = rec(function* () {
  const stats = yield* Stats; // ← an Effect service, from the runtime
  const [n, setN] = yield* hook(useState(0)); // ← a real React hook
  return (
    <button
      onClick={() => setN(n + 1)}
      style={{ font: '600 15px system-ui', padding: '10px 16px', cursor: 'pointer' }}
    >
      clicked {n} times · {stats.online} online
    </button>
  );
});
