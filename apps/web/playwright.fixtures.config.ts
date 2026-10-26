import { defineConfig, devices } from "@playwright/test";

// Tests fonctionnels sur fixtures (docs/tests/PLAN-DE-TESTS.md, § 3) : le front de production (`pnpm build` d'abord) tourne
// contre la fausse API de `e2e/fausse-api/`, sans base ni vraie API. `localhost` partout : le cookie de session posé
// pour le navigateur est ainsi relayé par le serveur Next à la fausse API, comme en production sous un domaine parent.
const WEB_PORT = 3100;
const API_PORT = 4010;
const apiUrl = `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.fixtures.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Pas de reprise : un test instable se corrige à la cause
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-fixtures" }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: "fr-FR",
    timezoneId: "Africa/Porto-Novo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node e2e/fausse-api/server.ts",
      url: `${apiUrl}/__fx/health`,
      env: { FAUSSE_API_PORT: String(API_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm exec next start -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/`,
      env: { API_URL: apiUrl, PUBLIC_API_URL: apiUrl },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: "bureau", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true },
    },
  ],
});
