/**
 * Recipe 02 — hooks and services, in one render pass.
 *
 * The body interleaves an Effect service with a genuine React hook, both arriving
 * through `yield*`; the hook keeps its state across renders exactly like any React
 * component, because the body runs inside React's render pass.
 *
 * The canonical split: reach for `hook` for the things that are genuinely React's
 * — a DOM ref, a transition, an ephemeral bit of UI like "is this open?" — and
 * keep state and logic in services (recipe 05). Here the *data* is a service; the
 * hook only holds a throwaway "expanded" flag.
 */
import { useState, type ReactNode } from 'react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import { rec, hook, mount } from '@tmonier/effract';

class Profile extends Context.Service<Profile, { readonly name: string; readonly bio: string }>()(
  'recipes/Profile',
) {}
const ProfileLive = Layer.succeed(Profile)({
  name: 'Ada',
  bio: 'Countess of Lovelace — wrote the first algorithm.',
});

export const Card = rec(function* () {
  const profile = yield* Profile; // data — an Effect service
  const [open, setOpen] = yield* hook(useState(false)); // pure UI — a real React hook
  return (
    <button type="button" onClick={() => setOpen((v) => !v)}>
      {profile.name}
      {open ? ` — ${profile.bio}` : ' — show bio'}
    </button>
  );
});

export const App = (): ReactNode => mount(ProfileLive, Card);
