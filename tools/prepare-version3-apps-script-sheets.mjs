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
  "manageAccounts",
  "viewAccounts",
  "manageOperations",
  "manageNotices",
  "managePermissions",
  "manageMeetings",
  "manageCalendar",
  "viewPayments",
  "clockWork",
  "viewStudents",
  "manageStudents",
  "viewLessonLogs",
  "writeLessonLogs",
  "viewReservations",
  "manageReservations",
  "reserveLessonRoom",
  "reservePracticeRoom",
  "viewTeam",
  "viewMeetings",
  "viewCalendar",
  "reviewAccountRequests",
  "managePublicSettings"
];

const args = parseArgs(process.argv.slice(2));
const now = args.now || new Date().toISOString();
const seed = buildSeed({
  now,
  adminPassword: args.password || "bonsung1",
  salt: args.salt || randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 16)
});

if (args.printJson) {
  process.stdout.write(`${JSON.stringify(seed, null, 2)}\n`);
} else {
  const outDir = args.out || "version3-apps-script-sheets-export";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "version3-apps-script-sheets.seed.json"), `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  for (const [tableName, headers] of Object.entries(TABLES)) {
    const rows = seed.rows[tableName] || [];
    writeFileSync(join(outDir, `${tableName}.csv`), toCsv(headers, rows), "utf8");
  }
  process.stdout.write(`Prepared ${Object.keys(TABLES).length} tab files in ${outDir}\n`);
  process.stdout.write("Accounts seed contains only one login account: admin\n");
}

function buildSeed({ now, adminPassword, salt }) {
  const ownerPermissions = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true]));
  const rows = Object.fromEntries(Object.keys(TABLES).map((name) => [name, []]));
  rows.settings.push(row("settings", { id: "setting-schema-version", key: "schema_version", value: "2026-07-09-apps-script-pilot", created_at: now, updated_at: now }));
  rows.accounts.push(row("accounts", {
    id: "admin-1",
    login_id: "admin",
    password_hash: hashPassword(adminPassword, salt),
    password_salt: salt,
    password_algorithm: "sha256:salt:password",
    role: "owner",
    status: "active",
    name: "시스템 관리자",
    permissions_json: JSON.stringify(ownerPermissions),
    must_change_password: "true",
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
    role: "owner",
    permissions_before: "{}",
    permissions_after: JSON.stringify(ownerPermissions),
    occurred_at: now,
    created_at: now,
    updated_at: now
  }));
  rows.teachers.push(row("teachers", { id: "teacher-1", name: "대표 강사", major: "보컬", status: "active", memo: "파일럿 기본 강사 데이터", created_at: now, updated_at: now }));
  rows.students.push(row("students", { id: "student-sample-1", name: "샘플 수강생", major: "보컬", goal: "정규 레슨 적응", status: "active", teacher_id: "teacher-1", teacher_name: "대표 강사", memo: "실명 데이터 입력 전 교체 대상", created_at: now, updated_at: now }));
  rows.guardians.push(row("guardians", { id: "guardian-sample-1", student_id: "student-sample-1", name: "샘플 보호자", relation: "보호자", payer: "true", emergency: "true", memo: "실명 데이터 입력 전 교체 대상", created_at: now, updated_at: now }));
  rows.courses.push(row("courses", { id: "course-vocal-basic", name: "보컬 베이직", major: "보컬", teacher_id: "teacher-1", status: "active", tuition_amount: "200000", created_at: now, updated_at: now }));
  rows.enrollments.push(row("enrollments", { id: "enrollment-sample-1", student_id: "student-sample-1", course_id: "course-vocal-basic", teacher_id: "teacher-1", start_date: now.slice(0, 10), status: "active", memo: "파일럿 샘플 수강", created_at: now, updated_at: now }));
  rows.lessons.push(row("lessons", { id: "lesson-sample-1", student_id: "student-sample-1", teacher_id: "teacher-1", course_id: "course-vocal-basic", lesson_date: now.slice(0, 10), start_time: "18:00", duration_minutes: "60", room_id: "room-vocal-a", status: "scheduled", memo: "파일럿 샘플 수업", created_at: now, updated_at: now }));
  rows.attendance.push(row("attendance", { id: "attendance-sample-1", lesson_id: "lesson-sample-1", student_id: "student-sample-1", teacher_id: "teacher-1", status: "scheduled", makeup_needed: "false", memo: "출결 처리 전", created_at: now, updated_at: now }));
  rows.lesson_notes.push(row("lesson_notes", { id: "lesson-note-sample-1", lesson_id: "lesson-sample-1", student_id: "student-sample-1", teacher_id: "teacher-1", lesson_date: now.slice(0, 10), content: "샘플 레슨노트입니다.", homework: "호흡 연습", next_goal: "발성 안정화", created_at: now, updated_at: now }));
  rows.rooms.push(row("rooms", { id: "room-vocal-a", name: "Vocal A", type: "lesson", capacity: "2", status: "active", created_at: now, updated_at: now }));
  rows.rooms.push(row("rooms", { id: "room-practice-1", name: "Practice 1", type: "practice", capacity: "1", status: "active", created_at: now, updated_at: now }));
  rows.reservations.push(row("reservations", { id: "reservation-sample-1", room_id: "room-practice-1", room_name: "Practice 1", reserved_by: "admin-1", reserved_by_name: "시스템 관리자", student_id: "student-sample-1", reservation_date: now.slice(0, 10), start_time: "20:00", end_time: "21:00", purpose: "practice", status: "pending", created_at: now, updated_at: now }));
  rows.payments.push(row("payments", { id: "payment-sample-1", student_id: "student-sample-1", student_name: "샘플 수강생", enrollment_id: "enrollment-sample-1", registration_type: "신규등록", program_name: "보컬 베이직", amount: "200000", period_start: now.slice(0, 10), next_due_date: nextMonthDate(now), payment_status: "확인 필요", created_at: now, updated_at: now }));
  rows.consultations.push(row("consultations", { id: "consultation-sample-1", student_id: "student-sample-1", student_name: "샘플 수강생", phone: "", channel: "phone", major: "보컬", goal: "입시 상담", message: "파일럿 상담 요청입니다.", status: "접수", priority: "normal", assigned_to: "admin-1", assigned_to_name: "시스템 관리자", status_updated_at: now, unread_for_account_ids: "admin-1", created_at: now, updated_at: now }));
  rows.consultation_history.push(row("consultation_history", { id: "consultation-history-sample-1", consultation_id: "consultation-sample-1", actor_id: "admin-1", actor_name: "시스템 관리자", action: "seed_consultation", status: "접수", assigned_to: "admin-1", assigned_to_name: "시스템 관리자", occurred_at: now, created_at: now, updated_at: now }));
  rows.tasks.push(row("tasks", { id: "task-sample-1", title: "파일럿 데이터 확인", assignee_id: "admin-1", assignee_name: "시스템 관리자", due_date: now.slice(0, 10), status: "todo", priority: "normal", created_at: now, updated_at: now }));
  rows.meetings.push(row("meetings", { id: "meeting-sample-1", title: "Version.3 파일럿 점검", starts_at: `${now.slice(0, 10)}T19:00:00+09:00`, participant_ids: "admin-1", participant_names: "시스템 관리자", status: "scheduled", created_at: now, updated_at: now }));
  rows.calendar_events.push(row("calendar_events", { id: "calendar-sample-1", title: "파일럿 운영 시작", date: now.slice(0, 10), start_time: "10:00", target_roles: "owner,manager,teacher,student", created_at: now, updated_at: now }));
  rows.notices.push(row("notices", { id: "notice-pilot-open", title: "Version.3 파일럿 운영 안내", category: "운영", author_id: "admin-1", author_name: "시스템 관리자", body: "파일럿 기간에는 admin 계정만 로그인합니다.", target_roles: "owner,manager,teacher,student", pinned: "true", active: "true", created_at: now, updated_at: now }));
  rows.audit_logs.push(row("audit_logs", { id: "audit-seed-admin", actor_id: "admin-1", actor_name: "시스템 관리자", actor_role: "owner", action: "seed_apps_script_tabs", target_type: "system", target_id: "version3", target_name: "Version.3", metadata_json: JSON.stringify({ accountSeed: "admin-only" }), created_at: now, updated_at: now }));
  rows.public_settings.push(row("public_settings", { id: "public-setting-login-notice", key: "login_notice", value: "Version.3 파일럿 운영 중입니다.", updated_by: "admin-1", created_at: now, updated_at: now }));
  rows.public_settings.push(row("public_settings", { id: "public-setting-academy-phone", key: "academy_phone", value: "", updated_by: "admin-1", created_at: now, updated_at: now }));
  rows.public_settings.push(row("public_settings", { id: "public-setting-reservation-guide", key: "reservation_guide", value: "예약은 운영자 확인 후 확정됩니다.", updated_by: "admin-1", created_at: now, updated_at: now }));

  return {
    schemaVersion: "2026-07-09-apps-script-pilot",
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

function nextMonthDate(value) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
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
