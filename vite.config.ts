import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest-and-fix',
      writeBundle() {
        const dist = resolve(__dirname, 'dist');
        copyFileSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'));
        copyFileSync(resolve(__dirname, 'cors_rules.json'), resolve(dist, 'cors_rules.json'));
        const iconsDir = resolve(dist, 'icons');
        if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
        ['icon-16.png', 'icon-48.png', 'icon-128.png'].forEach(icon => {
          const src = resolve(__dirname, 'src/assets/icons', icon);
          if (existsSync(src)) copyFileSync(src, resolve(iconsDir, icon));
        });
        // Move HTML files to dist root and fix paths
        for (const [name, subdir] of [['popup', 'src/popup'], ['sidepanel', 'src/sidepanel']]) {
          const htmlPath = resolve(dist, subdir, 'index.html');
          if (existsSync(htmlPath)) {
            let html = readFileSync(htmlPath, 'utf-8');
            html = html.replace(/\.\.\/\.\.\//g, './');
            writeFileSync(resolve(dist, `${name}.html`), html);
          }
        }
      }
    }
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          if (chunk.name === 'content') return 'content.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
