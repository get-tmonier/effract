import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { effract } from '@tmonier/effract-vite';

export default defineConfig({
  plugins: [effract(), tailwindcss()],
});
