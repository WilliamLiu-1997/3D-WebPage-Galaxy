import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const runtimeAssetDirs = ['JS', 'img', 'texture', 'obj', 'UFO2'];

function copyRuntimeAssetsPlugin() {
  return {
    name: 'copy-runtime-assets',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');

      for (const dir of runtimeAssetDirs) {
        const sourceDir = resolve(__dirname, dir);
        const targetDir = resolve(outDir, dir);

        if (existsSync(sourceDir)) {
          cpSync(sourceDir, targetDir, { recursive: true, force: true });
        }
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [copyRuntimeAssetsPlugin()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        solar: resolve(__dirname, 'solar.html'),
        island: resolve(__dirname, 'island.html'),
        lightning: resolve(__dirname, 'lightning.html'),
        alienBase: resolve(__dirname, 'alien_base.html'),
      },
    },
  },
});
