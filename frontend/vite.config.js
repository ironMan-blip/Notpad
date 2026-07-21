/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ai': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/auth': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/notes': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/groups': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/uploads': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
})
