import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // Retry once on failure — accounts for minor timing issues in CI
  retries: 1,
  use: {
    // BASE_URL is injected by docker-compose.yml as http://frontend
    // Falls back to localhost for running tests outside Docker
    baseURL: process.env.BASE_URL ?? 'http://localhost',
    headless: true,
  },
})
