import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createStageStorageAdapter } from "../server/stage-storage.mjs";

const options = parseArgs(process.argv.slice(2));
const databaseUrl = process.env.BONSUNG_DATABASE_URL || "";
const sourceFile = resolve(process.cwd(), options.file || process.env.BONSUNG_LOCAL_DATA_FILE || ".stage-local-data.json");

if (!databaseUrl) {
  fail("BONSUNG_DATABASE_URL is required. Set it to the target PostgreSQL connection string before running this migration.");
}

if (!existsSync(sourceFile)) {
  fail(`본성 스테이지 source file was not found: ${sourceFile}`);
}

const snapshot = normalizeSnapshot(JSON.parse(readFileSync(sourceFile, "utf8")));
const summary = summarize(snapshot);

console.log("본성 스테이지 file-to-Postgres migration");
console.log(`- source: ${sourceFile}`);
console.log(`- target: BONSUNG_DATABASE_URL`);
console.log(`- accounts: ${summary.accounts}`);
console.log(`- students: ${summary.students}`);
console.log(`- lessons: ${summary.lessons}`);
console.log(`- auditLogs: ${summary.auditLogs}`);
console.log(`- canonicalRoles: ${summary.roles.join(", ") || "none"}`);

if (options.dryRun) {
  console.log("Dry run only. No PostgreSQL rows were written.");
  process.exit(0);
}

if (!options.yes) {
  fail("Refusing to write without --yes. Re-run with --dry-run first, then --yes when the target is confirmed.");
}

const adapter = await createStageStorageAdapter({
  driver: "postgres",
  databaseUrl,
  dataFileSetting: "memory",
  backupEnabled: false
});

const existing = await adapter.loadState();
if (existing && !options.replace) {
  fail("PostgreSQL already has a stage_state row. Use --replace only after taking an export/backup.");
}

await adapter.saveState(snapshot);

console.log("Migration complete.");
console.log("Keep the source JSON file as a rollback backup, and verify the server with BONSUNG_DATABASE_URL plus pnpm run verify:stage-server.");

function parseArgs(args) {
  const parsed = { file: "", dryRun: false, yes: false, replace: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--file") parsed.file = args[index += 1] || "";
    else if (arg.startsWith("--file=")) parsed.file = arg.slice("--file=".length);
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--yes") parsed.yes = true;
    else if (arg === "--replace") parsed.replace = true;
    else fail(`Unknown option: ${arg}`);
  }
  return parsed;
}

function normalizeSnapshot(value) {
  if (!value || typeof value !== "object") fail("Source file must contain a 본성 스테이지 JSON object.");
  const snapshot = { ...value };
  snapshot.accounts = array(snapshot.accounts).map((account) => ({
    ...account,
    role: normalizeRole(account.role, "manager")
  }));
  snapshot.accountRequests = array(snapshot.accountRequests).map((request) => ({
    ...request,
    requestedRole: normalizeRole(request.requestedRole, "artist")
  }));
  snapshot.notices = array(snapshot.notices).map((notice) => ({
    ...notice,
    targetRoles: normalizeRoleList(notice.targetRoles || notice.target_roles),
    target_roles: normalizeRoleList(notice.targetRoles || notice.target_roles).join(",")
  }));
  snapshot.calendarEvents = array(snapshot.calendarEvents).map((event) => ({
    ...event,
    targetRoles: normalizeRoleList(event.targetRoles || event.target_roles),
    target_roles: normalizeRoleList(event.targetRoles || event.target_roles).join(",")
  }));
  return snapshot;
}

function summarize(snapshot) {
  return {
    accounts: array(snapshot.accounts).length,
    students: array(snapshot.students).length,
    lessons: array(snapshot.lessons).length,
    auditLogs: array(snapshot.auditLogs).length,
    roles: Array.from(new Set(array(snapshot.accounts).map((account) => account.role).filter(Boolean))).sort()
  };
}

function normalizeRole(value, fallback) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "owner" || role === "admin" || role === "system") return "admin";
  if (role === "manager" || role === "staff") return "manager";
  if (role === "teacher" || role === "coach") return "coach";
  if (role === "student" || role === "artist") return "artist";
  return fallback;
}

function normalizeRoleList(value) {
  const roles = array(value).length ? array(value) : String(value || "").split(/[,|/]/);
  const normalized = roles.map((role) => normalizeRole(role, "")).filter(Boolean);
  return normalized.length ? Array.from(new Set(normalized)) : ["admin", "manager", "coach", "artist"];
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function fail(message) {
  console.error(`본성 스테이지 migration failed: ${message}`);
  process.exit(1);
}
