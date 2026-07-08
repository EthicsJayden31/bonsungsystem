import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVersion3StorageAdapter } from "../server/version3-storage.mjs";

const options = parseArgs(process.argv.slice(2));
const databaseUrl = process.env.VERSION3_DATABASE_URL || "";
const sourceFile = resolve(process.cwd(), options.file || process.env.VERSION3_LOCAL_DATA_FILE || ".version3-local-data.json");

if (!databaseUrl) {
  fail("VERSION3_DATABASE_URL is required. Set it to the target PostgreSQL connection string before running this migration.");
}

if (!existsSync(sourceFile)) {
  fail(`Version.3 source file was not found: ${sourceFile}`);
}

const snapshot = normalizeSnapshot(JSON.parse(readFileSync(sourceFile, "utf8")));
const summary = summarize(snapshot);

console.log("Version.3 file-to-Postgres migration");
console.log(`- source: ${sourceFile}`);
console.log(`- target: VERSION3_DATABASE_URL`);
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

const adapter = await createVersion3StorageAdapter({
  driver: "postgres",
  databaseUrl,
  dataFileSetting: "memory",
  backupEnabled: false
});

const existing = await adapter.loadState();
if (existing && !options.replace) {
  fail("PostgreSQL already has a version3_state row. Use --replace only after taking an export/backup.");
}

await adapter.saveState(snapshot);

console.log("Migration complete.");
console.log("Keep the source JSON file as a rollback backup, and verify the server with VERSION3_DATABASE_URL plus pnpm run verify:version3-server.");

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
  if (!value || typeof value !== "object") fail("Source file must contain a Version.3 JSON object.");
  const snapshot = { ...value };
  snapshot.accounts = array(snapshot.accounts).map((account) => ({
    ...account,
    role: normalizeRole(account.role, "manager")
  }));
  snapshot.accountRequests = array(snapshot.accountRequests).map((request) => ({
    ...request,
    requestedRole: normalizeRole(request.requestedRole, "student")
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
  if (role === "owner" || role === "admin" || role === "system") return "owner";
  if (role === "manager" || role === "staff") return "manager";
  if (role === "teacher" || role === "coach") return "teacher";
  if (role === "student" || role === "artist") return "student";
  return fallback;
}

function normalizeRoleList(value) {
  const roles = array(value).length ? array(value) : String(value || "").split(/[,|/]/);
  const normalized = roles.map((role) => normalizeRole(role, "")).filter(Boolean);
  return normalized.length ? Array.from(new Set(normalized)) : ["owner", "manager", "teacher", "student"];
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function fail(message) {
  console.error(`Version.3 migration failed: ${message}`);
  process.exit(1);
}
