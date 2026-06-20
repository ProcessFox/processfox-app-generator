import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Builds the standalone player into ONE self-contained HTML file (all JS/CSS
 * inlined) under dist-player/. The file contains a manifest placeholder; the
 * exporter injects a specific app's manifest to produce the final download.
 */
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: 'dist-player',
    emptyOutDir: true,
    rollupOptions: { input: 'player.html' },
  },
});
