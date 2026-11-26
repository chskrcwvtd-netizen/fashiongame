import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  use: { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 },
  projects: [
    { name: 'browser', testMatch: /playthrough|sound/, use: { baseURL: 'http://localhost:4173' } },
    { name: 'desktop', testMatch: /electron/ },
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
