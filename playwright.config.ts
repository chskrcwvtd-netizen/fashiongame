import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  use: { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 },
  projects: [
    { name: 'browser', testMatch: /playthrough|sound|handtohand/, use: { baseURL: 'http://localhost:4173' } },
    { name: 'desktop', testMatch: /electron/ },
    { name: 'iphone', testMatch: /iphone/, use: { ...devices['iPhone 15'], browserName: 'chromium', baseURL: 'http://localhost:4173', actionTimeout: 8_000 } },
    { name: 'iphone-webkit', testMatch: /iphone/, use: { ...devices['iPhone 15'], browserName: 'webkit', baseURL: 'http://localhost:4173', actionTimeout: 8_000 } },
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
