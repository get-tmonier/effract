# effract playground

A self-contained Vite app you can open in the browser — this is what the
**[Open in StackBlitz](https://stackblitz.com/github/get-tmonier/effract/tree/main/playground)**
button loads.

It is deliberately **outside** the monorepo's pnpm workspace and uses plain,
pinned npm versions (no `catalog:` / `workspace:` protocol), so it installs and
runs anywhere — including StackBlitz's WebContainer, which can't resolve the
workspace catalog.

## What it shows

A tiny coffee shop, built to make each capability earn its place:

- **State in the Effect world.** The **cart** and the current **route** live in
  services (an `AtomRef` each), not React state — so the cart, mutated in the
  product view, is read by the header badge in a *different* subtree with no
  props or context between them.
- **`query`** fetches the selected product (async, refetches when the route
  changes), with **`.suspense`** for loading.
- **`.catch`** renders a typed fallback for each way the lookup can fail —
  product **#3** is sold out (`SoldOut`), **#9** doesn't exist (`NotFound`).
- **`useAtomValue`** reads a single atom into a variable; **`<Observe>`** is the
  inline-JSX sugar for the derived badge total; **`hook(useState)`** holds the one
  bit of genuinely local UI state (the quantity).
- **`Layer.mergeAll`** composes the services; **`mount`** is the one boundary.

```sh
npm install
npm run dev
```
