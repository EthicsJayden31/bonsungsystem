import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TABLES = {
  settings: ["id", "key", "value", "created_at", "updated_at", "deleted_at"],
  accounts: ["id", "login_id", "password_hash", "password_salt", "password_algorithm", "role", "status", "name", "email", "phone", "linked_student_id", "permissions_json", "must_change_password", "last_login_at", "created_at", "updated_at", "deleted_at"],
  account_requests: ["id", "login_id", "password_hash", "password_salt", "password_algorithm", "name", "email", "phone", "requested_role", "linked_student_id", "message", "status", "reviewed_by", "reviewed_at", "review_memo", "created_account_id", "created_at", "updated_at", "deleted_at"],
  account_history: ["id", "account_id", "account_name", "actor_id", "actor_name", "action", "role", "permissions_before", "permissions_after", "memo", "occurred_at", "created_at", "updated_at", "deleted_at"],
  teachers: ["id", "account_id", "name", "major", "email", "phone", "status", "memo", "created_at", "updated_at", "deleted_at"],
  students: ["id", "name", "birth_date", "phone", "major", "goal", "status", "teacher_id", "teacher_name", "memo", "created_at", "updated_at", "deleted_at"],
  guardians: ["id", "student_id", "name", "relation", "phone", "email", "payer", "emergency", "memo", "created_at", "updated_at", "deleted_at"],
  courses: ["id", "name", "major", "teacher_id", "status", "tuition_amount", "memo", "created_at", "updated_at", "deleted_at"],
  enrollments: ["id", "student_id", "course_id", "teacher_id", "start_date", "end_date", "status", "memo", "created_at", "updated_at", "deleted_at"],
  lessons: ["id", "student_id", "teacher_id", "course_id", "lesson_date", "start_time", "duration_minutes", "room_id", "status", "memo", "created_at", "updated_at", "deleted_at"],
  attendance: ["id", "lesson_id", "student_id", "teacher_id", "status", "makeup_needed", "checked_at", "memo", "created_at", "updated_at", "deleted_at"],
  lesson_notes: ["id", "lesson_id", "student_id", "teacher_id", "lesson_date", "content", "homework", "next_goal", "practice_request", "internal_memo", "created_at", "updated_at", "deleted_at"],
  rooms: ["id", "name", "type", "capacity", "status", "memo", "created_at", "updated_at", "deleted_at"],
  reservations: ["id", "room_id", "room_name", "reserved_by", "reserved_by_name", "student_id", "teacher_id", "reservation_date", "start_time", "end_time", "purpose", "status", "memo", "created_at", "updated_at", "deleted_at"],
  payments: ["id", "student_id", "student_name", "enrollment_id", "registration_type", "program_name", "amount", "period_start", "next_due_date", "paid_at", "payment_status", "method", "memo", "created_at", "updated_at", "deleted_at"],
  consultations: ["id", "student_id", "student_name", "guardian_name", "phone", "channel", "major", "goal", "message", "status", "priority", "assigned_to", "assigned_to_name", "follow_up_date", "acknowledged_at", "status_updated_at", "unread_for_account_ids", "memo", "created_at", "updated_at", "deleted_at"],
  consultation_history: ["id", "consultation_id", "actor_id", "actor_name", "action", "status", "assigned_to", "assigned_to_name", "memo", "occurred_at", "created_at", "updated_at", "deleted_at"],
  tasks: ["id", "title", "assignee_id", "assignee_name", "due_date", "status", "priority", "memo", "created_at", "updated_at", "deleted_at"],
  work_logs: ["id", "account_id", "account_name", "work_date", "clock_in_at", "clock_out_at", "memo", "created_at", "updated_at", "deleted_at"],
  meetings: ["id", "title", "starts_at", "participant_ids", "participant_names", "status", "memo", "created_at", "updated_at", "deleted_at"],
  calendar_events: ["id", "title", "date", "start_time", "target_roles", "memo", "created_at", "updated_at", "deleted_at"],
  notices: ["id", "title", "category", "author_id", "author_name", "body", "target_roles", "pinned", "active", "created_at", "updated_at", "deleted_at"],
  audit_logs: ["id", "actor_id", "actor_name", "actor_role", "action", "target_type", "target_id", "target_name", "metadata_json", "created_at", "updated_at", "deleted_at"],
  public_settings: ["id", "key", "value", "updated_by", "created_at", "updated_at", "deleted_at"],
  sessions: ["id", "token_hash", "account_id", "expires_at", "created_at", "last_seen_at", "revoked_at", "deleted_at"]
};

const PERMISSION_KEYS = [
  "manageAccounts", "viewAccounts", "manageOperations", "manageNotices", "managePermissions",
  "manageMeetings", "manageCalendar", "viewPayments", "clockWork", "viewStudents",
  "manageStudents", "viewLessonLogs", "writeLessonLogs", "viewReservations", "manageReservations",
  "reserveLessonRoom", "reservePracticeRoom", "viewTeam", "viewMeetings", "viewCalendar",
  "reviewAccountRequests", "resetPasswords", "managePublicSettings"
];

const args = parseArgs(process.argv.slice(2));
const now = args.now || new Date().toISOString();
const seed = buildSeed({
  now,
  adminPassword: args.password || "bonsung_2020_03",
  salt: args.salt || randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 16)
});

if (args.printJson) {
  process.stdout.write(`${JSON.stringify(seed, null, 2)}\n`);
} else {
  const outDir = args.out || "stage-apps-script-sheets-export";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "stage-apps-script-sheets.seed.json"), `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  for (const [tableName, headers] of Object.entries(TABLES)) {
    writeFileSync(join(outDir, `${tableName}.csv`), toCsv(headers, seed.rows[tableName] || []), "utf8");
  }
  process.stdout.write(`Prepared ${Object.keys(TABLES).length} empty operation tab files in ${outDir}\n`);
  process.stdout.write("Accounts seed contains only one login account: admin\n");
}

function buildSeed({ now, adminPassword, salt }) {
  const adminPermissions = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true]));
  const rows = Object.fromEntries(Object.keys(TABLES).map((name) => [name, []]));

  rows.settings.push(row("settings", { id: "setting-schema-version", key: "schema_version", value: "2026-07-09-apps-script-operating", created_at: now, updated_at: now }));
  rows.accounts.push(row("accounts", {
    id: "admin-1",
    login_id: "admin",
    password_hash: hashPassword(adminPassword, salt),
    password_salt: salt,
    password_algorithm: "sha256:salt:password",
    role: "admin",
    status: "active",
    name: "시스템 관리자",
    permissions_json: JSON.stringify(adminPermissions),
    must_change_password: "false",
    created_at: now,
    updated_at: now
  }));
  rows.account_history.push(row("account_history", {
    id: "account-history-seed-admin",
    account_id: "admin-1",
    account_name: "시스템 관리자",
    actor_id: "admin-1",
    actor_name: "시스템 관리자",
    action: "seed_admin_account",
    role: "admin",
    permissions_before: "{}",
    permissions_after: JSON.stringify(adminPermissions),
    occurred_at: now,
    created_at: now,
    updated_at: now
  }));
  rows.audit_logs.push(row("audit_logs", {
    id: "audit-seed-admin",
    actor_id: "admin-1",
    actor_name: "시스템 관리자",
    actor_role: "admin",
    action: "seed_apps_script_tabs",
    target_type: "system",
    target_id: "stage",
    target_name: "본성 스테이지",
    metadata_json: JSON.stringify({ accountSeed: "admin-only", operationRows: "empty" }),
    created_at: now,
    updated_at: now
  }));
  rows.public_settings.push(row("public_settings", { id: "public-setting-login-notice", key: "login_notice", value: "계정 요청 및 패스워드 초기화는 매니저에게 문의 바랍니다.", updated_by: "admin-1", created_at: now, updated_at: now }));
  rows.public_settings.push(row("public_settings", { id: "public-setting-academy-phone", key: "academy_phone", value: "", updated_by: "admin-1", created_at: now, updated_at: now }));
  rows.public_settings.push(row("public_settings", { id: "public-setting-reservation-guide", key: "reservation_guide", value: "공간 예약은 정각부터 1시간 단위로 신청합니다.", updated_by: "admin-1", created_at: now, updated_at: now }));

  return {
    schemaVersion: "2026-07-09-apps-script-operating",
    generatedAt: now,
    accountSeedPolicy: "admin-only",
    adminLoginId: "admin",
    passwordStorage: "sha256:salt:password; no plaintext password is exported",
    tables: TABLES,
    rows
  };
}

function row(tableName, values) {
  return Object.fromEntries(TABLES[tableName].map((header) => [header, values[header] ?? ""]));
}

function hashPassword(password, salt) {
  return createHash("sha256").update(`${salt}:${password}`, "utf8").digest("hex");
}

function toCsv(headers, rows) {
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--print-json") parsed.printJson = true;
    else if (arg === "--out") parsed.out = argv[++index];
    else if (arg.startsWith("--out=")) parsed.out = arg.slice("--out=".length);
    else if (arg === "--password") parsed.password = argv[++index];
    else if (arg.startsWith("--password=")) parsed.password = arg.slice("--password=".length);
    else if (arg === "--salt") parsed.salt = argv[++index];
    else if (arg.startsWith("--salt=")) parsed.salt = arg.slice("--salt=".length);
    else if (arg === "--now") parsed.now = argv[++index];
    else if (arg.startsWith("--now=")) parsed.now = arg.slice("--now=".length);
  }
  return parsed;
}
