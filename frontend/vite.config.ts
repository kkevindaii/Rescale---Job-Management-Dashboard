import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  test: {
    // jsdom simulates a browser environment so React components can render
    environment: 'jsdom',
    // Run this file before each test suite — imports jest-dom matchers
    setupFiles: ['./src/test/setup.ts'],
    // Makes describe/it/expect/vi available globally without importing them
    globals: true,
  },

  server: {
    // Proxy API requests to the Django backend during local development.
    // In Docker, nginx handles this proxying instead (see nginx.conf).
    // Using a proxy means all API calls in the frontend use relative URLs
    // like /api/jobs/ — no hardcoded hostnames anywhere in the source code.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
