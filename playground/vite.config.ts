import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// A single copy of React and Effect — effract needs it (they're peers, resolved
// to your app's copy). In a real project the `@tmonier/effract-vite` plugin does
// this dedupe for you; here it's inline to keep the playground's deps minimal.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom', 'effect'] },
});
