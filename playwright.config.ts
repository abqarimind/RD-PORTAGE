/**
 * Tests de bout en bout du tracking (e2e/), sur un écran d'iPhone.
 *
 * Le site est construit avec le Pixel et la mesure d'audience ACTIVÉS par
 * leurs drapeaux de debug (hors Vercel, ils sont coupés par défaut), puis
 * servi en mode production. Le serveur tourne sans aucune clé : CRM en mode
 * mock, emails simulés. Rien ne part vers Meta, Plausible ou Resend : les
 * scripts tiers sont remplacés par des doublures et leurs requêtes
 * interceptées (e2e/stubs.ts).
 */
import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    // Écran d'iPhone 13/14, navigateur intégré d'Instagram.
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.0.0 (iPhone14,5; iOS 17_5; fr_FR; fr; scale=3.00; 1170x2532; 600000000)",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build:e2e && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      CRM_PROVIDER: "mock",
      RESEND_API_KEY: "",
      DOSSIER_SECRET: "e2e-dossier-secret-0123456789abcdef",
      MAIL_INTERNAL_TO: "equipe@example.com",
      LEAD_RATE_LIMIT_MAX: "1000",
    },
  },
});
