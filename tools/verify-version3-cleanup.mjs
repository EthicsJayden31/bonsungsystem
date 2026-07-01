import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

const requiredGitignoreEntries = [
  ".next",
  "node_modules",
  "out",
  ".env",
  ".env*.local",
  "*.tsbuildinfo",
  ".version3-local-data.json",
  ".version3-local-data.json.*.tmp",
  "version3-data.json",
  "version3-data.json.*.tmp",
  "*.bak"
];

const requiredDockerignoreEntries = [
  "node_modules",
  "out",
  ".env",
  ".env*.local",
  ".version3-local-data.json",
  "*.bak"
];

assertIgnoreEntries(".gitignore", requiredGitignoreEntries);
assertIgnoreEntries(".dockerignore", requiredDockerignoreEntries);
assertNoTrackedForbiddenFiles();
assertNoVisibleForbiddenWorktreeFiles();

if (errors.length) {
  console.error("Version.3 cleanup verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Version.3 cleanup verification passed.");

function assertIgnoreEntries(file, entries) {
  const contents = readIfExists(file);
  if (!contents) {
    errors.push(`${file} is missing.`);
    return;
  }

  const lines = new Set(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
  );

  for (const entry of entries) {
    if (!lines.has(entry)) errors.push(`${file} must ignore ${entry}.`);
  }
}

function assertNoTrackedForbiddenFiles() {
  const tracked = git(["ls-files"]).split(/\r?\n/).filter(Boolean);
  const bad = tracked.filter(isForbiddenPath);
  if (bad.length) {
    errors.push(`Repository must not track generated/private Version.3 artifacts: ${bad.join(", ")}.`);
  }
}

function assertNoVisibleForbiddenWorktreeFiles() {
  const status = git(["status", "--porcelain", "--untracked-files=all"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/g, "/"));

  const bad = status.filter(isForbiddenPath);
  if (bad.length) {
    errors.push(`Generated/private artifacts are visible to git and need ignore cleanup: ${bad.join(", ")}.`);
  }
}

function isForbiddenPath(path) {
  const normalized = path.replace(/\\/g, "/");
  const name = normalized.split("/").pop() || normalized;
  return (
    normalized === ".env" ||
    (normalized.startsWith(".env.") && !normalized.endsWith(".example")) ||
    normalized === "out" ||
    normalized.startsWith("out/") ||
    normalized === ".next" ||
    normalized.startsWith(".next/") ||
    normalized === "node_modules" ||
    normalized.startsWith("node_modules/") ||
    normalized.endsWith(".tsbuildinfo") ||
    name === ".version3-local-data.json" ||
    name.startsWith(".version3-local-data.json.") ||
    name === "version3-data.json" ||
    name.startsWith("version3-data.json.") ||
    name.endsWith(".bak")
  );
}

function readIfExists(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}
