import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build can be served from any sub-path (e.g. GitHub Pages).
  base: './',
  // three.js alone is ~550 kB and already split into its own lazily loaded chunk.
  build: { chunkSizeWarningLimit: 600 },
});
