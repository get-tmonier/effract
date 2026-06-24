import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tanstackStart(), viteReact(), tailwindcss()],
  // Our workspace packages ship TypeScript source, so Vite must transpile them
  // (rather than treat them as pre-built externals) when rendering on the server.
  ssr: {
    noExternal: ['@tmonier/effract', '@effract/shared'],
  },
});
