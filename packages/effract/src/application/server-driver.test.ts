/**
 * The server driver, exercised without React. It proves the RSC half of the
 * thesis: the same REC body the client interprets resolves on the server by
 * awaiting its yields against an Effect runtime, drives placed children inline,
 * and rejects hooks (which RSC forbids) with a clear error.
 */
import { describe, expect, it } from 'vitest';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { hook, placement, query, type CatchDispatch, type RecHandle } from '#domain/protocol.ts';
import { driveServerRec, type RunEffect } from '#application/server-driver.ts';

class Stats extends Context.Service<Stats, { readonly total: number }>()('test/Stats') {}
class NotFound extends Data.TaggedError('NotFound')<{ readonly id: number }> {}

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

  it('drives a placed child REC inline — universal composition, no client JS', async () => {
    // A child body and a placement of it, built from the pure protocol (no
    // renderer) — the interpreter drives the placed child on the server too.
    const childBody = function* () {
      const stats = yield* Stats;
      return `child:${stats.total}`;
    };
    const child: RecHandle<string> = { body: childBody, displayName: 'Child' };
    const parent = function* () {
      const rendered = yield* placement(child, {});
      return ['parent', rendered];
    };
    const node = await driveServerRec(parent(), runnerFor(Layer.succeed(Stats)({ total: 7 })));
    expect(node).toEqual(['parent', 'child:7']);
  });

  it('awaits a query inline — no loading state on the server', async () => {
    const body = function* () {
      const n = yield* query(Effect.promise(() => Promise.resolve(5)));
      const m = yield* query(Effect.succeed(2), 'k');
      return `n:${n}x${m}`;
    };
    const result = await driveServerRec(body(), runnerFor(Layer.empty));
    expect(result).toBe('n:5x2');
  });

  it('renders a typed fallback when an effect fails (server .catch)', async () => {
    const body = function* () {
      yield* Effect.fail(new NotFound({ id: 1 }));
      return 'never';
    };
    const handlers: CatchDispatch<string> = { NotFound: () => 'empty' };
    const result = await driveServerRec(body(), runnerFor(Layer.empty), handlers);
    expect(result).toBe('empty');
  });

  it('a placed child owns its failure — the parent does not catch it', async () => {
    const childBody = function* () {
      yield* Effect.fail(new NotFound({ id: 2 }));
      return 'never';
    };
    const child: RecHandle<string> = {
      body: childBody,
      displayName: 'Child',
      catchHandlers: { NotFound: () => 'child-empty' },
    };
    const parent = function* () {
      const rendered = yield* placement(child, {});
      return `parent:${rendered}`;
    };
    // The parent also handles NotFound, but the child's own handler wins and the
    // parent never sees the failure — matching the client, where the child is a
    // separate fiber this REC cannot catch.
    const parentHandlers: CatchDispatch<string> = { NotFound: () => 'PARENT-CAUGHT' };
    const node = await driveServerRec(parent(), runnerFor(Layer.empty), parentHandlers);
    expect(node).toBe('parent:child-empty');
  });

  it('re-throws a failure whose tag it does not handle', async () => {
    const body = function* () {
      yield* Effect.fail(new NotFound({ id: 3 }));
      return 'never';
    };
    // A dispatch for a different tag must not swallow this one.
    const handlers: CatchDispatch<string> = { Other: () => 'nope' };
    await expect(driveServerRec(body(), runnerFor(Layer.empty), handlers)).rejects.toThrow();
  });
});
