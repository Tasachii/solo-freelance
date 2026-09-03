import { defineConfig, devices } from '@playwright/test'

/** เทสวิ่งกับ build จริงเสมอ ไม่ใช่ dev server — เพราะสิ่งที่คนเห็นคือ dist */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:4173/solo-tutor/',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    url: 'http://localhost:4173/solo-tutor/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
