import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: 'sidepanel.html',
        background: 'src/background/serviceWorker.ts',
        content: 'src/content/contentScript.ts'
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'assets/background.js';
          if (chunk.name === 'content') return 'assets/content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
