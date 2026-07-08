#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVersion3StorageAdapter, missingGoogleSheetsEnv } from "../server/version3-storage.mjs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
const fileArg = process.argv.find((item) => item.startsWith("--file="));
const sourceFile = resolve(process.cwd(), fileArg ? fileArg.slice("--file=".length) : process.env.VERSION3_LOCAL_DATA_FILE || ".version3-local-data.json");

if (!existsSync(sourceFile)) {
  console.error(`Version.3 source data file was not found: ${sourceFile}`);
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(sourceFile, "utf8"));
const counts = Object.fromEntries(["accounts", "students", "lessons", "attendance", "lessonNotes", "consultations", "payments", "reservations", "auditLogs"].map((key) => [key, Array.isArray(snapshot[key]) ? snapshot[key].length : 0]));
console.log("Version.3 Google Sheets migration");
console.log(`Source file: ${sourceFile}`);
console.log(`Record counts: ${JSON.stringify(counts)}`);
console.log(`Overwrite existing state: ${force ? "yes" : "no"}`);

const missing = missingGoogleSheetsEnv();
if (dryRun) {
  console.log(missing.length ? `dry-run setup-needed: missing ${missing.join(", ")}` : "dry-run: migration can write the snapshot.");
  process.exit(0);
}

if (missing.length) {
  console.error(`setup-needed: missing ${missing.join(", ")}`);
  process.exit(1);
}

const storage = await createVersion3StorageAdapter({ driver: "google-sheets" });
await storage.initializeState(snapshot, { force });
console.log("Version.3 Google Sheets state initialized.");
console.log("Backup note: keep the source JSON export until Google Sheets verification and Vercel login checks pass.");
