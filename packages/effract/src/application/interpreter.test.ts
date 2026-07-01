/**
 * The interpreter, exercised with no React at all. This is the payoff of
 * keeping it in the application layer: the entire fiber-bridging logic — hook
 * unwrapping, synchronous service resolution, async suspension, error
 * propagation — is testable against plain fakes.
 */
import { describe, expect, it } from 'vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { hook } from '#domain/protocol.ts';
import { driveRec } from '#application/interpreter.ts';
import type {
  Executor,
  InterpreterDeps,
  Placer,
  Reader,
  SuspensableResolver,
  RenderCache,
  Suspender,
} from '#application/ports.ts';

class Stats extends Context.Service<Stats, { readonly total: number }>()('test/Stats') {}

const executorWith = (layer: Layer.Layer<never, never, never>): Executor => {
  const runtime = ManagedRuntime.make(layer) as unknown as ManagedRuntime.ManagedRuntime<
    unknown,
    unknown
  >;
  return {
    runSyncExit: (effect) => runtime.runSyncExit(effect),
    runPromise: (effect) => runtime.runPromise(effect),
  };
};

const neverSuspend: Suspender = {
  use: () => {
    throw new Error('did not expect to suspend');
  },
};

const neverPlace: Placer = {
  place: () => {
    throw new Error('did not expect to place a child');
  },
};

const neverResolveSuspensable: SuspensableResolver = {
  resolve: () => {
    throw new Error('did not expect a query');
  },
};

/** A trivial reader: the current value, no subscription (enough for these tests). */
const staticReader: Reader = { read: (atomRead) => atomRead.value };

const makeDeps = (
  layer: Layer.Layer<never, never, never>,
  suspender: Suspender = neverSuspend,
): InterpreterDeps => ({
  executor: executorWith(layer),
  suspender,
  cache: new Map(),
  suspensableResolver: neverResolveSuspensable,
  reader: staticReader,
  placer: neverPlace,
});

describe('driveRec', () => {
  it('unwraps lifted hooks without touching the runtime', () => {
    const result = driveRec(
      (function* () {
        const a = yield* hook(10);
        const b = yield* hook(20);
        return a + b;
      })(),
      makeDeps(Layer.empty),
    );
    expect(result).toBe(30);
  });

  it('resolves a service Tag synchronously from the runtime', () => {
    const result = driveRec(
      (function* () {
        const stats = yield* Stats;
        return stats.total;
      })(),
      makeDeps(Layer.succeed(Stats)({ total: 42 })),
    );
    expect(result).toBe(42);
  });

  it('interleaves services and hooks in one render pass — the fiber bridge', () => {
    const result = driveRec(
      (function* () {
        const stats = yield* Stats;
        const label = yield* hook('overview');
        const suffix = yield* hook('!');
        return `${label}:${stats.total}${suffix}`;
      })(),
      makeDeps(Layer.succeed(Stats)({ total: 7 })),
    );
    expect(result).toBe('overview:7!');
  });

  it('suspends on an async effect, caching a stable promise, then returns on retry', async () => {
    const deps = makeDeps(Layer.empty, {
      use: (promise) => {
        throw promise;
      },
    });
    const body = function* () {
      const value = yield* Effect.promise(() => Promise.resolve(99));
      return value;
    };

    // First pass: the async effect cannot finish synchronously, so it suspends.
    let suspended: unknown;
    try {
      driveRec(body(), deps);
      expect.unreachable('should have suspended');
    } catch (thrown) {
      suspended = thrown;
    }
    expect(suspended).toBeInstanceOf(Promise);
    expect(deps.cache.size).toBe(1);

    // The cached promise settles to the effect's value.
    await expect(deps.cache.get(0)?.promise).resolves.toBe(99);

    // Retry with a suspender that returns settled values: now it resolves inline.
    const retryDeps: InterpreterDeps = {
      executor: deps.executor,
      cache: deps.cache,
      suspensableResolver: neverResolveSuspensable,
      reader: staticReader,
      suspender: { use: () => 99 as never },
      placer: neverPlace,
    };
    expect(driveRec(body(), retryDeps)).toBe(99);
  });

  it('throws a genuine Effect failure to the error boundary', () => {
    expect.assertions(1);
    try {
      driveRec(
        (function* () {
          const value = yield* Effect.fail('boom');
          return value;
        })(),
        makeDeps(Layer.empty),
      );
    } catch (thrown) {
      expect(thrown).toBe('boom');
    }
  });

  it('rejects a yield that is neither an Effect nor a hook', () => {
    const cache: RenderCache = new Map();
    const body = function* () {
      yield 5 as never; // a bare yield of a non-instruction: the interpreter must reject it
      return null;
    };
    expect(() =>
      driveRec(body(), {
        executor: executorWith(Layer.empty),
        suspender: neverSuspend,
        cache,
        suspensableResolver: neverResolveSuspensable,
        reader: staticReader,
        placer: neverPlace,
      }),
    ).toThrow(TypeError);
  });
});
