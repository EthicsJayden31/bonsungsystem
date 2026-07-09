#!/usr/bin/env node

import { createStageStorageAdapter, hashSessionToken, missingGoogleSheetsEnv } from "../server/stage-storage.mjs";

const missing = missingGoogleSheetsEnv();
if (missing.length) {
  console.log(`본성 스테이지 Google Sheets verification skipped: setup-needed (${missing.join(", ")})`);
  process.exit(0);
}

const storage = await createStageStorageAdapter({ driver: "google-sheets" });
const state = await storage.loadState();
if (!state) {
  console.log("본성 스테이지 Google Sheets connection verified, but _stage_state is empty. Run migrate:stage-google-sheets.");
  process.exit(0);
}

const probeTokenHash = hashSessionToken(`verify-google-sheets-${Date.now()}`);
await storage.createSession(probeTokenHash, {
  accountId: "verify-google-sheets",
  expiresAt: new Date(Date.now() + 60_000).toISOString()
});
const session = await storage.readSession(probeTokenHash);
await storage.deleteSession(probeTokenHash);

if (!session || session.accountId !== "verify-google-sheets") {
  throw new Error("Google Sheets session round-trip failed.");
}

console.log("본성 스테이지 Google Sheets verification passed.");
console.log(`State accounts: ${Array.isArray(state.accounts) ? state.accounts.length : 0}`);
console.log("Session storage: hashed token round-trip passed.");
