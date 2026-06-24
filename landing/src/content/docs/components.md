---
title: Components
description: component, view, and hook — the two ways to write a component as an Effect program.
group: Core
order: 2
---

effract gives you two component constructors. Both produce a genuine React function component.

## `component` — the hook-capable REC

The headline. The body yields Effect services and effects, and `yield* hook(...)` for React hooks,
all interpreted inside the render pass.

```tsx
const Dashboard = component(function* () {
  const stats = yield* Stats;
  const [tab, setTab] = yield* hook(useState('overview'));
  return <Panel tab={tab} total={stats.total} onTab={setTab} />;
});
```

The component's required services are inferred from what it yields, so `<Runtime>` can be typed to
provide them.

## `view` — resolve up front

When a component is pure data → markup (no hooks), `view` runs it as a single Effect. It's the
simpler, RSC-friendly mode — ideal near the root for flags, the current user, or permissions.

```tsx
const Banner = view(
  Effect.gen(function* () {
    const flags = yield* Flags;
    return flags.beta ? <aside>You're on the beta.</aside> : null;
  }),
);
```

## Async and Suspense

Reading an asynchronous effect suspends the component through React Suspense and resumes inline when
the value is ready — no `useEffect`, no `isLoading` flag:

```tsx
const Profile = component(function* () {
  const api = yield* Api;
  const user = yield* api.fetchUser(); // suspends here
  return <h2>Welcome, {user.name}</h2>;
});

// wrap it in a boundary
<Suspense fallback={<Spinner />}>
  <Profile />
</Suspense>;
```

Errors in the Effect channel are thrown to the nearest React error boundary.
