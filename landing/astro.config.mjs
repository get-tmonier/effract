// @ts-check

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://effract.tmonier.com',
  output: 'static',
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  integrations: [sitemap()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr'],
    routing: { prefixDefaultLocale: false },
  },
  build: {
    inlineStylesheets: 'always',
  },
  markdown: {
    shikiConfig: { theme: 'poimandres' },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
