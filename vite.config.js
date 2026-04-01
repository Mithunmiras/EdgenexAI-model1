import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api requests to Flask — avoids CORS issues
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    // Do NOT watch src/data/*.json — backend writes there during upload
    // and HMR would cause the page to refresh mid-upload
    watch: {
      ignored: ['**/src/data/**'],
    },
  },
});
