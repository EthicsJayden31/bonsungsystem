#!/usr/bin/env node

import { createStageStorageAdapter, googleSheetsSetupSummary, missingGoogleSheetsEnv } from "../server/stage-storage.mjs";

const dryRun = process.argv.includes("--dry-run");
const summary = googleSheetsSetupSummary();
const missing = missingGoogleSheetsEnv();

console.log("본성 스테이지 Google Sheets setup");
console.log(`Required tabs: ${summary.requiredTabs.join(", ")}`);
console.log(`State headers: ${summary.stateHeaders.join(", ")}`);
console.log(`Session headers: ${summary.sessionHeaders.join(", ")}`);

if (dryRun) {
  console.log(missing.length ? `setup-needed: missing ${missing.join(", ")}` : "dry-run: schema can be created or verified.");
  process.exit(0);
}

if (missing.length) {
  console.error(`setup-needed: missing ${missing.join(", ")}`);
  process.exit(1);
}

await createStageStorageAdapter({ driver: "google-sheets" });
console.log("본성 스테이지 Google Sheets schema verified.");
