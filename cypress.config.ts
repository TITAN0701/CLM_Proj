import { defineConfig } from "cypress";
import allureWriter from "@shelex/cypress-allure-plugin/writer";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL,
    specPattern: "automation/e2e/specs/**/*.cy.ts",
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    retries: { runMode: 1, openMode: 0 },
    supportFile: "automation/e2e/support/e2e.ts",
    fixturesFolder: "automation/e2e/fixtures",
    screenshotsFolder: "artifacts/raw/screenshots/cypress",
    trashAssetsBeforeRuns: false,
    video: false,
    videosFolder: "artifacts/raw/cypress/videos",
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      allureWriter(on, config);
      return config;
    },
  },
  env: {
    allure: true,
    allureResultsPath: "artifacts/raw/allure-results",
  },
});
