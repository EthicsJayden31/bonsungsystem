import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const legacyPreviewEnabled = process.env.NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW === "true";
const advancedVersion3UiEnabled = existsSync(resolve(root, "lib/version3-runtime-flags.ts"));

if (!advancedVersion3UiEnabled) {
  runLegacyCompatibleVerification();
  process.exit(0);
}

function runLegacyCompatibleVerification() {
  const legacyRequiredFiles = [
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

  const legacyRequiredSourceSignals = [
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
      includes: ["bonsung-logo-seal.png"],
      label: "legacy preview uses the uploaded template-derived logo"
    }
  ];

  const legacyForbiddenSourceSignals = [
    {
      file: "pages-preview/app.js",
      includes: ["bonsung-design-template.png", "brand-hero-card"],
      label: "legacy preview login should not render the large brand template image"
    },
    {
      file: "pages-preview/styles.css",
      includes: ["brand-hero-card"],
      label: "legacy preview styles should not keep unused brand template card CSS"
    }
  ];

  const legacyErrors = [];

  for (const file of legacyRequiredFiles) {
    if (!existsSync(resolve(root, file))) {
      legacyErrors.push(`Missing required Pages artifact: ${file}`);
    }
  }

  const rootHtml = readIfExists("out/index.html");
  if (rootHtml && !rootHtml.includes("/bonsungsystem/_next/static/")) {
    legacyErrors.push("Root Pages artifact does not look like the Next.js official UI.");
  }

  for (const signal of legacyRequiredSourceSignals) {
    const contents = readIfExists(signal.file);
    if (!contents) {
      legacyErrors.push(`Missing source file for surface verification: ${signal.file}`);
      continue;
    }

    for (const expected of signal.includes) {
      if (!contents.includes(expected)) {
        legacyErrors.push(`${signal.label}: expected ${signal.file} to include ${expected}`);
      }
    }
  }

  for (const signal of legacyForbiddenSourceSignals) {
    const contents = readIfExists(signal.file);
    if (!contents) continue;

    for (const forbidden of signal.includes) {
      if (contents.includes(forbidden)) {
        legacyErrors.push(`${signal.label}: expected ${signal.file} not to include ${forbidden}`);
      }
    }
  }

  if (legacyErrors.length) {
    console.error("Operating surface verification failed:");
    for (const error of legacyErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Operating surface verification passed.");
}

const requiredFiles = [
  "Dockerfile",
  ".dockerignore",
  ".env.production.example",
  "render.yaml",
  ".github/workflows/version3-server-image.yml",
  ".github/workflows/version3-external-verify.yml",
  "docs/project/version3-production-deploy.md",
  "docs/project/version3-verified-connection.md",
  "lib/version3-runtime-flags.ts",
  "lib/version3-server-client.ts",
  "server/version3-local-server.mjs",
  "tools/verify-version3-production-env.mjs",
  "tools/verify-version3-cleanup.mjs",
  "tools/verify-version3-server.mjs",
  "out/index.html",
  "out/login/index.html",
  "out/dashboard/index.html",
  "out/accounts/index.html",
  "out/teachers/index.html",
  "out/data-quality/index.html",
  "out/profile-settings/index.html",
  "out/_next/static"
];

if (legacyPreviewEnabled) {
  requiredFiles.push(
    "out/legacy-preview/index.html",
    "out/legacy-preview/test.html",
    "out/legacy-preview/app.js",
    "out/legacy-preview/config.js"
  );
}

const requiredSourceSignals = [
  {
    file: "app/login/page.tsx",
    includes: ["ENABLE_APPS_SCRIPT_TRANSITION", "ENABLE_LEGACY_PREVIEW", "ENABLE_PREVIEW_LOGIN", "isVersion3ServerConfigured", "loginWithVersion3Server", "setServerSession", "loginWithAppsScript", "readPreferences().startPage", "Version.3 서버 로그인", "bonsung-logo-seal.png"],
    label: "login page defaults to Version.3 server login and gates Apps Script, legacy, and preview paths"
  },
  {
    file: "lib/version3-runtime-flags.ts",
    includes: ["NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION", "NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW", "NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN"],
    label: "runtime flags keep transition-only paths out of default operation"
  },
  {
    file: "lib/preferences.ts",
    includes: ["bonsung_preferences", "startPages", "useState", "savePreferences"],
    label: "personalization settings are shared across app screens"
  },
  {
    file: "lib/operations-data.ts",
    includes: ["ENABLE_APPS_SCRIPT_TRANSITION", "ENABLE_PREVIEW_LOGIN", "emptyOperationsData", "ENABLE_PREVIEW_LOGIN ? previewData : emptyOperationsData", "const previewFallback = ENABLE_PREVIEW_LOGIN ? buildPreviewData(role) : emptyOperationsData", "guardians: liveGuardians.length ? liveGuardians : previewFallback.guardians", "courses: liveCourses.length ? liveCourses : previewFallback.courses", "reservations: liveReservations.length ? liveReservations : previewFallback.reservations", "APPS_SCRIPT_SESSION_TOKEN_KEY", "hasVersion3ServerSession", "callVersion3Server<BootstrapPayload>(\"/bootstrap\")", "callVersion3Server<DataQualityReport>(\"/data-quality\")", "useAuditLogs", "callVersion3Server<Version3AuditLog[]>(\"/audit-logs\")", "\"server\"", "\"live\"", "\"preview\"", "\"fallback\""],
    label: "Next UI prefers Version.3 server data, gates preview fallback, and only uses Apps Script when transition mode is enabled"
  },
  {
    file: "lib/version3-server-client.ts",
    includes: ["NEXT_PUBLIC_VERSION3_API_BASE_URL", "VERSION3_SERVER_SESSION_TOKEN_KEY", "bonsung_server_session_token", "loginWithVersion3Server", "/auth/login", "changeVersion3ServerPassword", "/auth/change-password", "logoutVersion3Server", "/auth/logout", "callVersion3Server", "hasVersion3ServerSession", "Authorization: `Bearer ${token}`"],
    label: "Version.3 server client uses a separate base URL, auth login endpoint, and bearer session token"
  },
  {
    file: "server/version3-local-server.mjs",
    includes: ["VERSION3_LOCAL_DATA_FILE", "VERSION3_SESSION_TTL_HOURS", "VERSION3_DISABLE_LOCAL_BACKUPS", "VERSION3_SERVER_HOST", "VERSION3_ALLOWED_ORIGINS", "assertServerRuntimeSafe", "healthReport", "/health", "passwordMinLength", "isValidPassword", "canLoginAccount", "loginFailureWindowMs", "loginFailureLockMs", "maxLoginFailures", "recordLoginFailure", "clearLoginFailures", "login_throttled", "systemActor", "/auth/login", "/auth/logout", "/auth/change-password", "/bootstrap", "/accounts", "/account-history", "/audit-logs", "/data-quality", "/data-export", "/data-import", "/data-backups", "listDataBackups", "backupEntries", "importData", "hydrateImportedAccountPasswords", "replaceDatabase", "keepOnlySession", "/actions/", "dashboardWorkQueue", "createStudent", "createTeacher", "createEnrollment", "createLesson", "updateAttendance", "createLessonLog", "createReservation", "createRegistration", "createTask", "Unsupported Version.3 action", "Student management permission is required", "Enrollment requires a valid teacher", "Lesson note requires an existing lesson", "Attendance requires a valid lesson", "Reservation end time must be after start time", "reference-integrity", "brokenReferences", "backupEnabled", "sanitizeDatabaseExport", "backupPathFor", "hashPassword", "verifyPassword", "migrateAccountPasswords", "isSelfAccountMutation", "invalidateAccountSessions", "createConsultation", "acknowledgeConsultation", "unreadForAccountIds", "Consultation triage permission is required", "findConsultationAssignee", "manageNotices", "saveDatabase", "addAuditLog", "export_data", "import_data"],
    label: "local Version.3 server implements the separate-server operating contract"
  },
  {
    file: ".gitignore",
    includes: ["out", ".version3-local-data.json", "version3-data.json", "*.bak"],
    label: "git ignore rules keep build output and Version.3 local data out of commits"
  },
  {
    file: ".env.production.example",
    includes: ["NODE_ENV=production", "VERSION3_SERVER_HOST=0.0.0.0", "VERSION3_LOCAL_SERVER_PASSWORD=replace-with-a-long-temporary-password", "VERSION3_ALLOWED_ORIGINS=https://ethicsjayden31.github.io", "VERSION3_LOCAL_DATA_FILE=/data/version3-data.json"],
    label: "production environment example separates public server settings from local development defaults"
  },
  {
    file: "tools/verify-version3-cleanup.mjs",
    includes: [".gitignore", ".dockerignore", "git", "ls-files", "status", "--porcelain", "Version.3 cleanup verification passed", "Generated/private artifacts", "version3-data.json", "*.bak"],
    label: "cleanup verifier blocks build output, private env, local data, and backup files from repository commits"
  },
  {
    file: "tools/verify-version3-production-env.mjs",
    includes: ["NODE_ENV", "VERSION3_LOCAL_SERVER_PASSWORD", "VERSION3_ALLOWED_ORIGINS", "VERSION3_LOCAL_DATA_FILE", "VERSION3_SESSION_TTL_HOURS", "Version.3 production server environment verified", "must not use the local default value", "must not be *", "must point to a persistent file"],
    label: "production environment verifier blocks unsafe public server settings"
  },
  {
    file: "docs/project/version3-production-deploy.md",
    includes: [".env.production.example", "verify:version3-production-env", "VERSION3_API_BASE_URL", "verify:version3-release", "verify:version3-server", "Build Version.3 Server Image", "Verify External Version.3 Server", "ghcr.io/ethicsjayden31/bonsung-version3-server", "/data/version3-data.json", "/data-backups", "Apps Script"],
    label: "production deployment checklist explains external server setup and verification gates"
  },
  {
    file: "docs/project/version3-verified-connection.md",
    includes: ["Deploy GitHub Pages Preview", "Verify External Version.3 Server", "server_url", "save_verified_server_url", "VERSION3_API_BASE_URL", "NEXT_PUBLIC_VERSION3_API_BASE_URL", "verify:version3-release", "verify:version3-server", "version3-inspection.html"],
    label: "verified connection note explains how a checked external server URL becomes the public UI server"
  },
  {
    file: "Dockerfile",
    includes: ["node:22-alpine", "NODE_ENV=production", "VERSION3_SERVER_HOST=0.0.0.0", "VERSION3_LOCAL_DATA_FILE=/data/version3-data.json", "HEALTHCHECK", "/health", "CMD [\"node\", \"server/version3-local-server.mjs\"]"],
    label: "Docker package runs the Version.3 server as a deployable separate service"
  },
  {
    file: ".dockerignore",
    includes: ["node_modules", "out", ".version3-local-data.json", ".env"],
    label: "Docker package excludes local build artifacts and private runtime data"
  },
  {
    file: "render.yaml",
    includes: ["bonsung-version3-server", "env: docker", "healthCheckPath: /health", "mountPath: /data", "VERSION3_ALLOWED_ORIGINS", "sync: false", "VERSION3_LOCAL_SERVER_PASSWORD"],
    label: "Render blueprint keeps runtime data on a disk and requires secret environment values"
  },
  {
    file: ".github/workflows/version3-server-image.yml",
    includes: ["Build Version.3 Server Image", "workflow_dispatch", "ghcr.io/ethicsjayden31/bonsung-version3-server", "docker/login-action@v3", "docker/metadata-action@v5", "docker/build-push-action@v6", "Dockerfile", "VERSION3_LOCAL_DATA_FILE: /data/version3-data.json", "node tools/verify-version3-production-env.mjs"],
    label: "Version.3 server image workflow builds a deployable container for external hosts"
  },
  {
    file: ".github/workflows/version3-external-verify.yml",
    includes: ["Verify External Version.3 Server", "workflow_dispatch", "server_url", "VERSION3_API_BASE_URL: ${{ inputs.server_url }}", "VERSION3_SERVER_VERIFY_BASE_URL: ${{ inputs.server_url }}", "pnpm verify:version3-release", "pnpm verify:version3-server"],
    label: "external Version.3 verifier can validate a hosted HTTPS server before Pages points to it"
  },
  {
    file: "tools/verify-version3-server.mjs",
    includes: ["VERSION3_SERVER_VERIFY_BASE_URL", "VERSION3_LOCAL_DATA_FILE", "Version.3 server verification passed", "/health", "assertPublicStartupGuard", "Public Version.3 server startup must reject the default seed password", "/auth/login", "/auth/logout", "/auth/change-password", "mustChangePassword", "/bootstrap", "/accounts", "/account-history", "/audit-logs", "/data-export", "/data-import", "/data-backups", "Only owner accounts must be allowed to import Version.3 data", "Only owner accounts must be allowed to list Version.3 data backups", "must expose backup metadata without full filesystem paths", "must restore the exported student count", "import_data", "/actions/createStudent", "/actions/createTeacher", "/actions/createEnrollment", "/actions/createLesson", "/actions/updateAttendance", "/actions/createLessonLog", "/actions/createReservation", "/actions/createRegistration", "/actions/createTask", "Unknown Version.3 actions must fail", "Teacher accounts must not create students", "createEnrollment must reject invalid teacher references", "updateAttendance must reject orphan attendance", "createLessonLog must reject notes that are not linked to an existing lesson", "createReservation must reject end times before start times", "createNotice must require both title and body", "reference-integrity", "brokenReferences", "backupEnabled", "must not expose account passwords", "must store account passwords as scrypt hashes", "Repeated invalid login attempts must be temporarily throttled", "login_throttled", "security audit entries", "must reject short initial passwords", "must reject duplicate login IDs", "must reject missing linked students", "Invited student accounts must be able to sign in", "Invited account first login must activate the account", "must reject short temporary passwords", "must not pause their own account", "must use profile settings", "must not edit their own permissions", "Password reset must invalidate existing sessions", "Permission changes must invalidate existing sessions", "export_data", "/actions/createConsultation", "/actions/acknowledgeConsultation", "unreadForAccountIds", "Student accounts must not be allowed to triage consultation requests", "Consultation assignee must not be a student account", "/data-quality"],
    label: "Version.3 server verifier checks local or external server contract endpoints"
  },
  {
    file: "tools/verify-version3-release.mjs",
    includes: ["VERSION3_API_BASE_URL", "VERSION3_RELEASE_ALLOW_TRANSITION_FLAGS", "NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION", "NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW", "NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN", "https:", "public deployment"],
    label: "Version.3 release verifier requires a real HTTPS server URL and disables transition-only flags by default"
  },
  {
    file: "tools/dev-version3-local.mjs",
    includes: ["NEXT_PUBLIC_VERSION3_API_BASE_URL", "server/version3-local-server.mjs", "http://127.0.0.1:${serverPort}", "http://127.0.0.1:${nextPort}/login/"],
    label: "Version.3 local dev mode starts the separate server and Next UI together"
  },
  {
    file: ".github/workflows/pages.yml",
    includes: ["NEXT_PUBLIC_VERSION3_API_BASE_URL", "vars.VERSION3_API_BASE_URL", "server_url", "save_verified_server_url", "inputs.server_url || vars.VERSION3_API_BASE_URL", "gh variable set VERSION3_API_BASE_URL", "pnpm verify:version3-server", "pnpm verify:version3-release", "VERSION3_RELEASE_ALLOW_TRANSITION_FLAGS"],
    label: "GitHub Pages workflow can verify, save, inject, and deploy the Version.3 server URL for release branches"
  },
  {
    file: "lib/apps-script-client.ts",
    includes: ["bonsung_session_token", "loginWithAppsScript"],
    label: "Next UI uses the shared Apps Script session and login client"
  },
  {
    file: "lib/client-session.ts",
    includes: ["clearClientSession", "setServerSession", "VERSION3_SERVER_SESSION_TOKEN_KEY", "VERSION3_SERVER_USER_KEY", "PREVIEW_ROLE_KEY", "PREVIEW_ACCOUNT_DRAFTS_KEY", "PREVIEW_ACCOUNT_HISTORY_KEY", "redirectToAppPath", "assetPath", "bonsung-session-change"],
    label: "client session helpers store server sessions, clear stale tokens, roles, and preview account drafts, and use basePath-aware redirects"
  },
  {
    file: "lib/use-current-user.ts",
    includes: ["VERSION3_SERVER_SESSION_TOKEN_KEY", "VERSION3_SERVER_USER_KEY", "serverUser ||", "ENABLE_PREVIEW_LOGIN ? users[role] : null", "linkedStudentId: user.linkedStudentId || user.linked_student_id", "mustChangePassword"],
    label: "current user hook prefers Version.3 server user cache and blocks stale preview users by default"
  },
  {
    file: "app/profile-settings/page.tsx",
    includes: ["changeVersion3ServerPassword", "updateServerSessionUser", "forcePasswordChange", "비밀번호 변경 필요", "Version.3 계정 보안"],
    label: "profile settings lets Version.3 server users clear forced password changes"
  },
  {
    file: "app/data-quality/page.tsx",
    includes: ["useAuditLogs", "callVersion3Server", "/data-export", "/data-import", "downloadJson", "운영 시작 체크리스트", "buildOperationsReadinessItems", "별도 서버 연결", "수강생 계정 연결", "백업 가능 상태", "운영 데이터 내보내기", "백업 가져오기", "가져오기 임시 비밀번호", "export_data", "import_data", "Version.3 감사 로그", "auditActionLabel", "auditTargetLabel", "formatAuditTime", "끊어진 참조", "qualityCheckBadge", "reference-integrity", "참조 무결성"],
    label: "data quality page exposes Version.3 server audit logs, export, and reference integrity checks for operators"
  },
  {
    file: "app/data-quality/page.tsx",
    includes: ["login_throttled", "로그인 제한", "security", "보안"],
    label: "data quality page labels login throttling security audit entries"
  },
  {
    file: "tools/preserve-legacy-preview.mjs",
    includes: ["NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW", "Skipped legacy preview artifact", "pages-preview", "out", "legacy-preview"],
    label: "legacy preview artifact is gated behind a transition flag"
  },
  {
    file: "components/layout/app-shell.tsx",
    includes: ["ENABLE_LEGACY_PREVIEW", "ENABLE_APPS_SCRIPT_TRANSITION", "ENABLE_PREVIEW_LOGIN", "getSessionUser(role) ?? (ENABLE_PREVIEW_LOGIN ? previewUsers[role] : null)", "MobileAppHeader", "MobileBottomTabs", "MobileMenuSheet", "usePreferences", "preferences.mobileMenu", "preferences.density", "VERSION3_SERVER_SESSION_TOKEN_KEY", "logoutVersion3Server", "mustChangePassword", "/profile-settings?forcePasswordChange=1", "오늘 운영", "사람", "강사", "수업과 공간", "개인화 설정", "bonsung-logo-seal.png"],
    label: "Next UI exposes app-like navigation and gates legacy/App Script transition paths"
  },
  {
    file: "components/ui/table.tsx",
    includes: ["모바일 표 카드", "lg:hidden", "lg:block"],
    label: "data tables convert to mobile cards on small screens"
  },
  {
    file: "app/dashboard/page.tsx",
    includes: ["usePreferences", "buildMobileQuickCards", "preferences.dashboardFocus", "useAccountsData", "canViewAccounts", "useOperationAction", "buildDashboardWorkQueue(data, 8", "buildConsultationAlerts", "unreadForAccountIds", "acknowledgeConsultation", "확인 처리", "상담요청 알림", "Version.3 서버 데이터"],
    label: "dashboard mobile quick actions, consultation unread alerts, server data label, and account work queue respect the user's role"
  },
  {
    file: "app/consultations/page.tsx",
    includes: ["useRequestedConsultationId", "URLSearchParams", "RequestedConsultationPanel", "consultation-request-focus", "scrollIntoView", "요청 바로 확인"],
    label: "consultation page resolves dashboard request links and highlights the selected one-way request"
  },
  {
    file: "lib/dashboard-work-queue.ts",
    includes: ["studentsWithoutAccounts", "수강생 계정 생성 필요", "sourceType: \"accounts\"", "returnTo=${encodeURIComponent(\"/dashboard\")}"],
    label: "dashboard work queue raises students without student accounts"
  },
  {
    file: "lib/version3-server-contract.ts",
    includes: ["\"계정\"", "\"accounts\"", "dashboardWorkQueue", "unreadForAccountIds"],
    label: "server contract accepts account-related dashboard work items"
  },
  {
    file: ".github/ISSUE_TEMPLATE/02-feature-settings.yml",
    includes: ["대표", "매니저", "강사", "수강생", "Version.3 서버 계약"],
    label: "feature issue template uses the Version.3 role names and server-contract language"
  },
  {
    file: "lib/accounts-data.ts",
    includes: ["AccountsDataOptions", "enabled?: boolean", "ENABLE_PREVIEW_LOGIN ? previewAccounts : []", "계정 생성은 Version.3 서버 로그인 세션이 필요합니다.", "setAccounts([])", "callVersion3Server<AccountRecord[]>(\"/accounts\")", "callVersion3Server<AccountRecord[]>(\"/account-history\")", "callVersion3Server<AccountRecord>(\"/accounts\"", "listAccounts", "PREVIEW_ACCOUNT_DRAFTS_KEY", "readPreviewAccountDrafts", "writePreviewAccountDrafts"],
    label: "account data hook prefers Version.3 server accounts, clears failed server data, and gates preview account drafts"
  },
  {
    file: "app/accounts/page.tsx",
    includes: ["readAccountReturnToPath", "redirectToAppPath(returnToPath)", "returnTo", "Version.3 서버 계정"],
    label: "account creation can return to the originating operating surface and reports Version.3 server source"
  },
  {
    file: "components/layout/resource-page.tsx",
    includes: ["MobileListCard", "MobileCardList", "initialValues", "defaultValue={initialValues"],
    label: "resource pages expose mobile cards and form prefill values"
  },
  {
    file: "app/students/page.tsx",
    includes: ["mobileCards", "상세 보기", "권한 제한", "학생 관리", "URLSearchParams", "student-detail", "scrollIntoView", "createStudent", "createAccountAfter", "assetPath", "accountCreatePath"],
    label: "student page uses mobile cards, teacher-safe masking, detail deeplinks, server student creation, and basePath-aware account handoff"
  },
  {
    file: "components/students/student-detail-panel.tsx",
    includes: ["role === \"teacher\" ? \"권한 제한\" : student.phone", "guardian.phone", "수납 정보를 표시하지 않습니다"],
    label: "student detail panel applies teacher-safe masking to private student data"
  },
  {
    file: "app/teachers/page.tsx",
    includes: ["강사별 조회", "TeacherDetailPanel", "담당 학생", "수업 일정", "레슨노트", "URLSearchParams", "teacher-detail", "scrollIntoView", "createTeacher", "Version.3 서버 세션에서는 강사 기록"],
    label: "teacher page exposes server-backed teacher creation, teacher-specific drilldown, detail deeplinks, and scrolls to details"
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
    includes: ["bonsung-logo-seal.png"],
    label: "legacy preview uses the uploaded template-derived logo"
  }
];

const forbiddenSourceSignals = [
  {
    file: "pages-preview/app.js",
    includes: ["bonsung-design-template.png", "brand-hero-card"],
    label: "legacy preview login should not render the large brand template image"
  },
  {
    file: "pages-preview/styles.css",
    includes: ["brand-hero-card"],
    label: "legacy preview styles should not keep unused brand template card CSS"
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
if (!legacyPreviewEnabled && legacyHtml) {
  errors.push("Legacy preview artifact should not be included unless NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW=true.");
}
if (legacyPreviewEnabled && legacyHtml && (!legacyHtml.includes("app.js") || !legacyHtml.includes("config.js"))) {
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

for (const signal of forbiddenSourceSignals) {
  const contents = readIfExists(signal.file);
  if (!contents) continue;

  for (const forbidden of signal.includes) {
    if (contents.includes(forbidden)) {
      errors.push(`${signal.label}: expected ${signal.file} not to include ${forbidden}`);
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
