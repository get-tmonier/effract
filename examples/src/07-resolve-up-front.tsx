/**
 * Recipe 07 — resolve-up-front with `view`.
 *
 * When a component is pure data → markup (no hooks), `view` runs it as a single
 * Effect and renders the result. This is the simpler, RSC-friendly mode — ideal
 * near the root for feature flags, the current user, or permissions resolved
 * once per request.
 */
import type { ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { mount, view } from '@tmonier/effract';

class Flags extends Context.Service<Flags, { readonly beta: boolean }>()('recipes/Flags') {}
const FlagsLive = Layer.succeed(Flags)({ beta: true });

export const Banner = view(
  Effect.gen(function* () {
    const flags = yield* Flags;
    return flags.beta ? <aside>You&rsquo;re on the beta channel.</aside> : null;
  }),
);

export const App = (): ReactNode => mount(FlagsLive, Banner);
