import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [
  {
    file: "app/version3-test/page.tsx",
    includes: ["version3TestLogin", "교육행정운영 통합 관리 시스템", "※계정 요청 및 패스워드 초기화는 매니저에게 문의 바랍니다.", "@Bonsungmusicacademy Alrights Reserved", "testing page"]
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
    file: "lib/demo-data.ts",
    includes: ["장윤호", "(신) 김태지", "본성 프리컬리지", "초기 등록 수납 확인", "개원 준비 체크리스트", "신규 수강상담 및 사전등록 시작"]
  },
  {
    file: "lib/auth-shared.ts",
    includes: ["student-1-account", "student-jang-yunho", "장윤호"]
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

const testPage = readFileSync(join(root, "app/version3-test/page.tsx"), "utf8");
for (const forbidden of ["quickLogin", "계정 요청 테스트", "createVersion3TestAccountRequest", "appLinks"]) {
  if (testPage.includes(forbidden)) {
    failures.push(`app/version3-test/page.tsx: should not include separate test-only UI ${forbidden}`);
  }
}

const demoData = readFileSync(join(root, "lib/demo-data.ts"), "utf8");
for (const forbidden of ["이도윤", "최서연", "문하준", "김건반", "박드럼", "최하나", "오민석"]) {
  if (demoData.includes(forbidden)) {
    failures.push(`lib/demo-data.ts: should not include old sample data ${forbidden}`);
  }
}

if (failures.length) {
  console.error("Version.3 test-mode verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Version.3 test-mode verification passed.");
