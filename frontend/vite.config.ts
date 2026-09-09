import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split heavy libraries into their own cacheable chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/](three|@react-three)[\\/]/.test(id)) return 'three';
          if (id.includes('recharts')) return 'charts';
          return undefined;
        },
      },
    },
  },
});
