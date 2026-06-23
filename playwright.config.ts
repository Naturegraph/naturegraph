/**
 * Playwright config : Tests E2E critical path Naturegraph
 * ============================================================================
 *
 * Refs : T-007 + T-009 (MASTER_TODO) + BATCH 20
 *
 * Strategy MVP :
 *   - Browsers : chromium uniquement (eco-conception, suffisant pour MVP)
 *   - Parallel : par defaut (workers = nb CPU - 1)
 *   - Retries : 2 en CI, 0 en local (rapidite dev)
 *   - baseURL : http://localhost:5173 (Vite default)
 *   - Web server : npm run dev demarre automatiquement
 *
 * Pour installer le browser : `npx playwright install chromium`
 * Pour lancer : `npm run test:e2e` (= `playwright test`)
 * Pour debug : `npm run test:e2e:ui` (= `playwright test --ui`)
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile project active si on a le temps de stabiliser :
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
