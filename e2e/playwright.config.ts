import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against a running local stack (`npm run dev` in the repo root).
 * Tests create their own events/problems through an admin API token and remove them afterwards,
 * so they do not depend on the seed clock (SEED_FIRST_EVENT_START) and can run on any seeded stack.
 *
 *   STRAPI_URL  (default http://localhost:1337)
 *   WEB_URL     (default http://localhost:1338)
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD  (default admin@colosseum.local / Admin12345!)
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  fullyParallel: false,
  workers: 1, // shared queue + executioner, keep it deterministic
  timeout: 240_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:1338',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    { name: 'limits', testMatch: /executioner\/.*\.spec\.ts/ },
    { name: 'ui', testMatch: /ui\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
