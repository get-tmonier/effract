# effract playground

A self-contained Vite app you can open in the browser — this is what the
**[Open in StackBlitz](https://stackblitz.com/github/get-tmonier/effract/tree/main/playground)**
button loads.

It is deliberately **outside** the monorepo's pnpm workspace and uses plain,
pinned npm versions (no `catalog:` / `workspace:` protocol), so it installs and
runs anywhere — including StackBlitz's WebContainer, which can't resolve the
workspace catalog.

It pulls the **published** `@tmonier/effract` from npm, so it showcases the core
(`rec` + `hook` + `mount` + a service). When a release ships `query` / `.catch` /
`.suspense`, bump the version here to demo them too.

```sh
npm install
npm run dev
```
