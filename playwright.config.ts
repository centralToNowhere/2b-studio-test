import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
const local = existsSync('.test-env.json')
  ? JSON.parse(readFileSync('.test-env.json', 'utf8'))
  : null;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'yarn dev --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: local?.url ?? 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: local?.key ?? '',
    },
  },
});
