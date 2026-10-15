import { defineConfig, devices } from "@playwright/test";

// Parcours de bout en bout sur la stack Docker (`make e2e`) : le web tourne en image `prod`
// (compose.e2e.yml) et Playwright dans le conteneur officiel, qui embarque les navigateurs.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "bureau", use: { ...devices["Desktop Chrome"] } },
    {
      // Plus petit écran visé par la définition de « terminé » (360 px)
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 760 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
