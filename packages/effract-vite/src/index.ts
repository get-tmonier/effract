/**
 * effract-vite — a one-import Vite setup for effract apps.
 *
 * Wraps `@vitejs/plugin-react` (so RECs get Fast Refresh and the automatic JSX
 * runtime) and de-duplicates `react`, `react-dom`, and `effect` across a pnpm
 * workspace, which is the usual source of "two copies of React/Effect" bugs.
 *
 * ```ts
 * import { defineConfig } from 'vite';
 * import { effract } from '@tmonier/effract-vite';
 *
 * export default defineConfig({ plugins: [effract()] });
 * ```
 *
 * @packageDocumentation
 */
import react from '@vitejs/plugin-react';
import type { Plugin, PluginOption } from 'vite';

export interface EffractViteOptions {
  /** Options forwarded to `@vitejs/plugin-react`. */
  readonly react?: Parameters<typeof react>[0];
  /** Extra packages to de-duplicate alongside react/react-dom/effect. */
  readonly dedupe?: ReadonlyArray<string>;
}

const dedupeDefaults = ['react', 'react-dom', 'effect'];

/** The effract Vite plugin: React Fast Refresh + Effect/React de-duplication. */
export const effract = (options: EffractViteOptions = {}): PluginOption[] => {
  const dedupe = [...new Set([...dedupeDefaults, ...(options.dedupe ?? [])])];
  const resolution: Plugin = {
    name: 'effract:resolution',
    config: () => ({
      resolve: { dedupe },
      optimizeDeps: { include: ['react', 'react-dom', 'react/jsx-runtime', 'effect'] },
    }),
  };
  return [react(options.react), resolution];
};
