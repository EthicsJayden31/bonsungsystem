import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "out/index.html",
  "out/login/index.html",
  "out/dashboard/index.html",
  "out/teachers/index.html",
  "out/data-quality/index.html",
  "out/profile-settings/index.html",
  "out/legacy-preview/index.html",
  "out/legacy-preview/test.html",
  "out/legacy-preview/app.js",
  "out/legacy-preview/config.js",
  "out/_next/static"
];

const requiredSourceSignals = [
  {
    file: "app/login/page.tsx",
    includes: ["/legacy-preview/", "previewLogin", "loginWithAppsScript", "readPreferences().startPage", "bonsung-logo-seal.png"],
    label: "login page separates Apps Script live login from preview role login and respects the preferred start page"
  },
  {
    file: "lib/preferences.ts",
    includes: ["bonsung_preferences", "startPages", "useState", "savePreferences"],
    label: "personalization settings are shared across app screens"
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
    file: "lib/client-session.ts",
    includes: ["clearClientSession", "PREVIEW_ROLE_KEY", "redirectToAppPath", "assetPath", "bonsung-session-change"],
    label: "client session helpers clear stale roles and use basePath-aware redirects"
  },
  {
    file: "tools/preserve-legacy-preview.mjs",
    includes: ["pages-preview", "out", "legacy-preview"],
    label: "legacy preview is preserved into the Pages artifact"
  },
  {
    file: "components/layout/app-shell.tsx",
    includes: ["MobileAppHeader", "MobileBottomTabs", "MobileMenuSheet", "usePreferences", "preferences.mobileMenu", "preferences.density", "오늘 운영", "사람", "강사", "수업과 공간", "개인화 설정", "bonsung-logo-seal.png"],
    label: "Next UI exposes app-like mobile navigation, teacher menu, user preferences, and template-derived logo"
  },
  {
    file: "components/ui/table.tsx",
    includes: ["모바일 표 카드", "lg:hidden", "lg:block"],
    label: "data tables convert to mobile cards on small screens"
  },
  {
    file: "app/dashboard/page.tsx",
    includes: ["usePreferences", "buildMobileQuickCards", "preferences.dashboardFocus"],
    label: "dashboard mobile quick actions respect the user's preferred focus"
  },
  {
    file: "components/layout/resource-page.tsx",
    includes: ["MobileListCard", "MobileCardList", "initialValues", "defaultValue={initialValues"],
    label: "resource pages expose mobile cards and form prefill values"
  },
  {
    file: "app/students/page.tsx",
    includes: ["mobileCards", "상세 보기", "권한 제한", "학생 관리", "URLSearchParams", "student-detail", "scrollIntoView"],
    label: "student page uses mobile cards, teacher-safe masking, detail deeplinks, and scrolls to details"
  },
  {
    file: "components/students/student-detail-panel.tsx",
    includes: ["role === \"teacher\" ? \"권한 제한\" : student.phone", "guardian.phone", "수납 정보를 표시하지 않습니다"],
    label: "student detail panel applies teacher-safe masking to private student data"
  },
  {
    file: "app/teachers/page.tsx",
    includes: ["강사별 조회", "TeacherDetailPanel", "담당 학생", "수업 일정", "레슨노트", "URLSearchParams", "teacher-detail", "scrollIntoView"],
    label: "teacher page exposes teacher-specific data drilldown, detail deeplinks, and scrolls to details"
  },
  {
    file: "app/practice-rooms/page.tsx",
    includes: ["reservationInitialValues", "예약 정보 입력하기", "initialValues={reservationInitialValues}", "formId=\"reservation-form\"", "setSelection(null)", "reservationPurposeOptions", "이론수업"],
    label: "room reservation page prefills and clears visual slot selections with role-aligned purposes"
  },
  {
    file: "components/rooms/room-reservation-board.tsx",
    includes: ["예약 가능", "예약됨", "RoomReservationSelection | null", "SegmentedControl", "timeFilter", "#reservation-form", "clearSelection", "표시할 강의실 또는 연습실이 없습니다"],
    label: "Next UI includes app-like visual room reservation selection with filter-safe clearing"
  },
  {
    file: "pages-preview/app.js",
    includes: ["bonsung-logo-seal.png", "bonsung-design-template.png"],
    label: "legacy preview uses uploaded template-derived brand assets"
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
