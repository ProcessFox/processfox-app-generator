import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward generator API calls to the agent backend during development.
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
});
