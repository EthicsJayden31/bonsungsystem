#!/usr/bin/env node

import { createVersion3StorageAdapter, hashSessionToken, missingGoogleSheetsEnv } from "../server/version3-storage.mjs";

const missing = missingGoogleSheetsEnv();
if (missing.length) {
  console.log(`Version.3 Google Sheets verification skipped: setup-needed (${missing.join(", ")})`);
  process.exit(0);
}

const storage = await createVersion3StorageAdapter({ driver: "google-sheets" });
const state = await storage.loadState();
if (!state) {
  console.log("Version.3 Google Sheets connection verified, but _version3_state is empty. Run migrate:version3-google-sheets.");
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

console.log("Version.3 Google Sheets verification passed.");
console.log(`State accounts: ${Array.isArray(state.accounts) ? state.accounts.length : 0}`);
console.log("Session storage: hashed token round-trip passed.");
