import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [
  {
    file: "app/version3-test/page.tsx",
    includes: ["version3TestLogin", "createVersion3TestAccountRequest", "테스트 로그인"]
  },
  {
    file: "lib/version3-test-mode.ts",
    includes: [
      "runVersion3TestAction",
      "createReservation",
      "createLessonLog",
      "reviewVersion3TestAccountRequest",
      "VERSION3_TEST_DATA_KEY"
    ]
  },
  {
    file: "lib/operations-data.ts",
    includes: ['source: "test"', "runVersion3TestAction", "VERSION3_TEST_DATA_CHANGE_EVENT"]
  },
  {
    file: "public/version3-offline-inspection.html",
    includes: ["./version3-test/", "localStorage", "실제 화면 점검"]
  }
];

const failures = [];

for (const check of checks) {
  const path = join(root, check.file);
  if (!existsSync(path)) {
    failures.push(`${check.file}: file is missing`);
    continue;
  }
  const source = readFileSync(path, "utf8");
  for (const needle of check.includes) {
    if (!source.includes(needle)) {
      failures.push(`${check.file}: missing ${needle}`);
    }
  }
}

if (failures.length) {
  console.error("Version.3 test-mode verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Version.3 test-mode verification passed.");
