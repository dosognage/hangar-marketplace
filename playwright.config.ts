/**
 * Playwright configuration — Hangar Marketplace E2E suite.
 *
 * Tests run against a deployed environment (Vercel preview or production-like
 * staging) configured via PLAYWRIGHT_BASE_URL. The corresponding Supabase
 * project is the e2e-test branch (Pro tier), keyed via env vars below.
 *
 * Local dev:
 *   1. Copy tests/.env.test.example to .env.test and fill in values.
 *   2. npm run test:e2e:install  (installs Playwright browsers, one-time)
 *   3. npm run test:e2e          (or :ui / :headed / :debug)
 *
 * CI:
 *   GitHub Actions workflow at .github/workflows/e2e.yml runs the suite on
 *   every PR + push to main + weekly schedule. Secrets configured in repo
 *   settings (see tests/README.md for the full list).
 *
 * Browser strategy:
 *   - Chromium runs every CI invocation (primary signal).
 *   - Firefox + WebKit run only on the weekly schedule + on demand
 *     (tag-based: `@cross-browser`). Keeps PR feedback fast.
 *
 * Failure artifacts:
 *   - Trace, video, screenshot retained on first retry / failure.
 *   - HTML report at playwright-report/index.html.
 */

import { defineConfig, devices } from '@playwright/test'
import { config as loadDotenv } from 'dotenv'
import path from 'path'

// Load .env.test for local runs. CI provides env vars via secrets.
loadDotenv({ path: path.resolve(__dirname, '.env.test') })

// Default to localhost so a developer running `npm run dev` + `npm run test:e2e`
// works out of the box. CI overrides via PLAYWRIGHT_BASE_URL.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

// Cross-browser tests run on the weekly schedule or when explicitly requested
// by setting CROSS_BROWSER=1. Default PR runs hit Chromium only for speed.
const RUN_CROSS_BROWSER = process.env.CROSS_BROWSER === '1'

export default defineConfig({
  testDir: './tests/e2e/specs',
  outputDir: './tests/e2e/.test-results',

  // Each test is fully isolated — no shared state between them.
  fullyParallel: true,

  // Catch left-behind `test.only` calls before they sneak into main.
  forbidOnly: !!process.env.CI,

  // Flake tolerance. Local runs surface flakes immediately; CI retries to
  // distinguish real failures from network flakes.
  retries: process.env.CI ? 2 : 0,

  // Worker count: let Playwright auto-pick locally; cap in CI to avoid
  // overwhelming the test Supabase.
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['json',  { outputFile: 'tests/e2e/.test-results/results.json' }],
      ]
    : [['html', { open: 'on-failure' }], ['list']],

  use: {
    baseURL: BASE_URL,

    // Performance budgets. Most page loads should be well under these.
    actionTimeout:     10_000,
    navigationTimeout: 15_000,

    // Failure forensics: trace + video + screenshot retained on the first
    // retry. Locally without retries, captured on failure.
    trace:      'retain-on-failure',
    video:      'retain-on-failure',
    screenshot: 'only-on-failure',

    // Real users have a viewport — emulate desktop. Mobile coverage is a
    // future addition (separate project) once the suite stabilises.
    viewport: { width: 1440, height: 900 },

    // Ignore HTTPS errors when running against preview deploys with self-
    // signed certs (rare, but harmless for our threat model in tests).
    ignoreHTTPSErrors: true,
  },

  expect: {
    timeout: 8_000,
  },

  // Browser projects.
  //
  // Architecture:
  //   - `setup`  authenticates the seeded test users and saves storageState
  //     to disk. Only auth-requiring specs depend on it.
  //   - `chromium`  is the default project. Runs ALL specs, but specs that
  //     need an authenticated browser do `test.use({ storageState: AUTH_STATES.X })`
  //     internally — so the same project handles both public + authed tests.
  //     Setup is a dependency so the storage state files exist when needed.
  //   - When --no-deps is passed (smoke-only runs against environments where
  //     test users don't exist, e.g. against production), setup is skipped
  //     and only specs that don't `use({ storageState })` will pass cleanly.
  projects: [
    {
      name: 'setup',
      testDir: './tests/e2e/setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    ...(RUN_CROSS_BROWSER
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            dependencies: ['setup'],
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            dependencies: ['setup'],
          },
        ]
      : []),
  ],

  // For purely local runs against `npm run dev`, uncomment the webServer
  // block. Most contributors will run dev manually in another terminal.
  // webServer: {
  //   command: 'npm run dev',
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
})
