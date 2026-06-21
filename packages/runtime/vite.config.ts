import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Skip minify: esbuild's native minifier spikes memory/can fail on the large
    // xlsx bundle in constrained container builds. nginx serves gzip anyway, so
    // the transfer size stays small. (Code-splitting/lazy chunks are unaffected.)
    minify: false,
  },
  server: {
    // Forward generator API calls to the agent backend during development.
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
});
