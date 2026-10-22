import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { xrayPlugin } from '@stinsky/xray/plugin';

export default defineConfig({
  plugins: [xrayPlugin({ bundler: 'vite' }), react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/wisp': { target: 'ws://localhost:8080', ws: true },
    },
  },
});
