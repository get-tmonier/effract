# @tmonier/effract-vite

A one-import Vite plugin for [effract](https://effract.tmonier.com) apps: React Fast Refresh
(via `@vitejs/plugin-react`) plus de-duplication of `react`, `react-dom`, and `effect` across a pnpm
workspace.

```ts
import { defineConfig } from 'vite';
import { effract } from '@tmonier/effract-vite';

export default defineConfig({
  plugins: [effract()],
});
```

MIT © Tmonier
