import { defineConfig, devices } from '@playwright/test'

// E2E suite (audit task 2.2, closes F16). Ported from the three tests/*-UAT.md
// operator scripts so UAT regression detection no longer depends on a human
// (or a Claude session) walking the steps.
//
// Target resolution:
//   BASE_URL set      -> run against that deployment (Vercel preview/prod);
//                        no local server is started.
//   BASE_URL unset    -> build + serve the production bundle locally via
//                        `vite preview` (hermetic; what ci.yml uses).
//
// Role credentials come from env (never the repo — admin-bootstrap-UAT.md:101
// keeps passwords in the operator's password manager):
//   E2E_SEEKER_EMAIL / E2E_SEEKER_PASSWORD
//   E2E_EMPLOYER_EMAIL / E2E_EMPLOYER_PASSWORD
//   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
// Role-gated tests skip cleanly when their creds are absent; anonymous flows
// always run.

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
