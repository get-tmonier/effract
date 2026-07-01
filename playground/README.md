# effract playground

A self-contained Vite app you can open in the browser — this is what the
**[Open in StackBlitz](https://stackblitz.com/github/get-tmonier/effract/tree/main/playground)**
button loads.

It is deliberately **outside** the monorepo's pnpm workspace and uses plain,
pinned npm versions (no `catalog:` / `workspace:` protocol), so it installs and
runs anywhere — including StackBlitz's WebContainer, which can't resolve the
workspace catalog.

It pulls the **published** `@tmonier/effract` from npm and showcases the canonical
shape: **logic in Effect, React for render** — a stateful `Cart` service (state +
`derive`d totals + `batch`), with components that only `yield*` and render. It
needs the atom toolkit, so it targets `@tmonier/effract@^0.5.0`; publish that
release before the StackBlitz will resolve.

```sh
npm install
npm run dev
```
