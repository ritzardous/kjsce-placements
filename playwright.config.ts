import { defineConfig, devices } from '@playwright/test';
const port = process.env.E2E_PORT ?? '5173';

export default defineConfig({
  reporter: 'list',
  testDir: './tests/e2e', timeout: 30000, fullyParallel: true, workers: process.env.CI ? 2 : 4,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run dev:web -- --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: process.env.E2E_REUSE_SERVER === 'true' && process.env.E2E_FIREBASE === 'true',
    env: {
      VITE_USE_FIREBASE_EMULATORS: 'true', VITE_FIREBASE_PROJECT_ID: 'demo-placementstats',
      VITE_FIREBASE_API_KEY: 'demo-api-key', VITE_FIREBASE_AUTH_DOMAIN: 'demo-placementstats.firebaseapp.com', VITE_FIREBASE_APP_ID: '1:123456789:web:demo',
    },
  },
});
