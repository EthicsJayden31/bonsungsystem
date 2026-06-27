import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "out/index.html",
  "out/login/index.html",
  "out/dashboard/index.html",
  "out/data-quality/index.html",
  "out/profile-settings/index.html",
  "out/legacy-preview/index.html",
  "out/legacy-preview/test.html",
  "out/legacy-preview/app.js",
  "out/legacy-preview/config.js"
];

const requiredSourceSignals = [
  {
    file: "app/login/page.tsx",
    includes: ["/legacy-preview/", "preview", "loginWithAppsScript"],
    label: "login page separates Apps Script live login from preview role login"
  },
  {
    file: "lib/operations-data.ts",
    includes: ["APPS_SCRIPT_SESSION_TOKEN_KEY", "DataSource", "\"live\"", "\"preview\"", "\"fallback\""],
    label: "Next UI switches between Apps Script live data and preview fallback"
  },
  {
    file: "lib/apps-script-client.ts",
    includes: ["bonsung_session_token", "loginWithAppsScript"],
    label: "Next UI uses the shared Apps Script session and login client"
  },
  {
    file: "tools/preserve-legacy-preview.mjs",
    includes: ["pages-preview", "out", "legacy-preview"],
    label: "legacy preview is preserved into the Pages artifact"
  },
  {
    file: "components/layout/app-shell.tsx",
    includes: ["오늘 운영", "사람", "수업과 공간", "개인화 설정"],
    label: "Next UI exposes grouped navigation for mobile and desktop"
  },
  {
    file: "components/rooms/room-reservation-board.tsx",
    includes: ["예약 가능", "예약됨", "RoomReservationSelection"],
    label: "Next UI includes visual room reservation selection"
  }
];

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    errors.push(`Missing required Pages artifact: ${file}`);
  }
}

const rootHtml = readIfExists("out/index.html");
if (rootHtml && !rootHtml.includes("/bonsungsystem/_next/static/")) {
  errors.push("Root Pages artifact does not look like the Next.js official UI.");
}

const legacyHtml = readIfExists("out/legacy-preview/index.html");
if (legacyHtml && (!legacyHtml.includes("app.js") || !legacyHtml.includes("config.js"))) {
  errors.push("Legacy preview artifact does not load its Apps Script client files.");
}

for (const signal of requiredSourceSignals) {
  const contents = readIfExists(signal.file);
  if (!contents) {
    errors.push(`Missing source file for surface verification: ${signal.file}`);
    continue;
  }

  for (const expected of signal.includes) {
    if (!contents.includes(expected)) {
      errors.push(`${signal.label}: expected ${signal.file} to include ${expected}`);
    }
  }
}

if (errors.length) {
  console.error("Operating surface verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Operating surface verification passed.");

function readIfExists(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}
