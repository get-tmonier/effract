# effract playground

A self-contained Vite app you can open in the browser — this is what the
**[Open in StackBlitz](https://stackblitz.com/github/get-tmonier/effract/tree/main/playground)**
button loads.

It is deliberately **outside** the monorepo's pnpm workspace and uses plain,
pinned npm versions (no `catalog:` / `workspace:` protocol), so it installs and
runs anywhere — including StackBlitz's WebContainer, which can't resolve the
workspace catalog.

It pulls the **published** `@tmonier/effract` from npm and showcases the canonical
shape — **logic in Effect, React for render** — with a tiny coffee shop that makes
each capability earn its place:

- a **`Cart`** service owns the items, the pending quantity, and a **`derive`d**
  total (kept in sync from `items`, never summed in a component); it's mutated in
  the product view and read by the header badge with no props between them;
- a **`Route`** service holds the selected product id (app state → a service atom,
  not `useState`); nav and product view both `yield*` it, the nav writes it;
- **`query`** fetches the product (async, refetch on route change) with
  `.suspense` loading, and the lookup **fails in typed ways** (`SoldOut` #3,
  `NotFound` #9) rendered by `.catch`.

Every service is declared the idiomatic way (`Context.Service<Self>()(id, { make })`
+ a `static layer`), reads use `yield*`, and no component holds React state. Styled
with Tailwind v4. It needs the atom toolkit, so it targets
`@tmonier/effract@^0.5.0` — publish that release before the StackBlitz will resolve.

```sh
npm install
npm run dev
```
