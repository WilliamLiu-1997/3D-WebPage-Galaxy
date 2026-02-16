import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        solar: resolve(__dirname, 'solar.html'),
        island: resolve(__dirname, 'island.html'),
        lightning: resolve(__dirname, 'lightning.html'),
        alienBase: resolve(__dirname, 'alian_base.html'),
      },
    },
  },
});
