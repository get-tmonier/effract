/**
 * The server driver, exercised without React. It proves the RSC half of the
 * thesis: the same REC body the client interprets resolves on the server by
 * awaiting its yields against an Effect runtime — and that hooks, which RSC
 * forbids, are rejected with a clear error.
 */
import { describe, expect, it } from 'vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { hook } from '@tmonier/effract';
import { driveServerRec, type RunEffect } from '#application/server-driver.ts';

class Stats extends Context.Service<Stats, { readonly total: number }>()('test/Stats') {}

const runnerFor = (layer: Layer.Layer<never, never, never>): RunEffect => {
  const runtime = ManagedRuntime.make(layer) as unknown as ManagedRuntime.ManagedRuntime<
    unknown,
    unknown
  >;
  return (effect) => runtime.runPromise(effect);
};

describe('driveServerRec', () => {
  it('resolves services and awaits async effects', async () => {
    const body = function* () {
      const stats = yield* Stats;
      const delayed = yield* Effect.promise(() => Promise.resolve(2));
      return `${stats.total}x${delayed}`;
    };
    const result = await driveServerRec(body(), runnerFor(Layer.succeed(Stats)({ total: 5 })));
    expect(result).toBe('5x2');
  });

  it('rejects React hooks — RSC has no render-pass hooks', async () => {
    const body = function* () {
      const value = yield* hook(1);
      return value;
    };
    await expect(driveServerRec(body(), runnerFor(Layer.empty))).rejects.toThrow(
      /hooks are not available/,
    );
  });
});
