/**
 * Bonsung Stage Version.3 Apps Script pilot Web App.
 *
 * Deploy as a Web App and connect the Vercel UI with:
 * NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION=true
 * NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT=<web-app-url>
 */
const VERSION3_SCHEMA_VERSION = "2026-07-09-apps-script-pilot";
const VERSION3_DEFAULT_ADMIN_PASSWORD = "bonsung_2020_03";
const VERSION3_SESSION_TTL_HOURS = 12;

const VERSION3_TABLES = {
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

const VERSION3_LOCKED_ACTIONS = {
  createAccount: true,
  createReservation: true,
  createLesson: true,
  updateAttendance: true,
  createLessonLog: true,
  createRegistration: true,
  dataImport: true
};

const VERSION3_PERMISSION_KEYS = [
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
  "resetPasswords",
  "managePublicSettings"
];

const VERSION3_ROLE_PERMISSIONS = {
  admin: allPermissions(true),
  manager: mergePermissions({
    manageAccounts: true,
    resetPasswords: true,
    viewAccounts: true,
    manageOperations: true,
    manageNotices: true,
    viewPayments: true,
    clockWork: true,
    viewStudents: true,
    manageStudents: true,
    viewLessonLogs: true,
    writeLessonLogs: true,
    viewReservations: true,
    manageReservations: true,
    reserveLessonRoom: true,
    reservePracticeRoom: true,
    viewTeam: true,
    viewMeetings: true,
    manageMeetings: true,
    viewCalendar: true,
    manageCalendar: true,
    reviewAccountRequests: true,
    managePublicSettings: true
  }),
  coach: mergePermissions({
    clockWork: true,
    viewStudents: true,
    viewLessonLogs: true,
    writeLessonLogs: true,
    viewReservations: true,
    reserveLessonRoom: true,
    reservePracticeRoom: true,
    viewTeam: true,
    viewCalendar: true
  }),
  artist: mergePermissions({
    viewLessonLogs: true,
    viewReservations: true,
    reservePracticeRoom: true,
    viewCalendar: true
  })
};

function doGet(event) {
  return handleVersion3Request(event);
}

function doPost(event) {
  return handleVersion3Request(event);
}

function handleVersion3Request(event) {
  try {
    const request = parseRequest(event);
    const action = String(request.action || "health");
    ensureWorkbook();

    if (action === "health") return jsonSuccess(health());
    if (action === "setup" || action === "bootstrapAdmin") return jsonSuccess(runWithOptionalLock(action, () => setupWorkbook(request)));
    if (action === "login") return jsonSuccess(login(request));
    if (action === "createAccountRequest" || action === "requestAccount") return jsonSuccess(createAccountRequest(null, request.accountRequest || request));
    if (action === "logout") return jsonSuccess(logout(request.token));

    const user = authorize(request.token);
    const result = runWithOptionalLock(action, () => dispatchAction(action, request, user));
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}

function dispatchAction(action, request, user) {
  if (action === "changePassword") return changePassword(user, request.currentPassword, request.newPassword);
  if (action === "bootstrap") return bootstrap(user);
  if (action === "getAccounts" || action === "listAccounts") return listAccounts(user);
  if (action === "createAccount") return createAccount(user, request.account || request);
  if (action === "updateAccountStatus") return updateAccountStatus(user, request.accountId, request.active);
  if (action === "resetAccountPassword") return resetAccountPassword(user, request.accountId, request.password);
  if (action === "updateAccountPermissions") return updateAccountPermissions(user, request.accountId, request.permissions || {});
  if (action === "getAccountHistory" || action === "listAccountHistory") return listAccountHistory(user, request.accountId);
  if (action === "listAccountRequests") return listAccountRequests(user);
  if (action === "reviewAccountRequest") return reviewAccountRequest(user, request.requestId, request.decision, request.review || {});
  if (action === "getAuditLogs") return getAuditLogs(user);
  if (action === "getDataQualityReport") return getDataQualityReport(user);
  if (action === "dataExport") return dataExport(user);
  if (action === "dataImport") return dataImport(user, request.data || {});
  if (action === "createStudent") return createStudent(user, request.student || request);
  if (action === "createConsultation") return createConsultation(user, request.consultation || request);
  if (action === "updateConsultationStatus") return updateConsultationStatus(user, request.consultationId, request.status, request.assignedTo);
  if (action === "acknowledgeConsultation") return acknowledgeConsultation(user, request.consultationId);
  if (action === "createLesson") return createLesson(user, request.lesson || request);
  if (action === "updateAttendance") return updateAttendance(user, request.attendance || request);
  if (action === "createLessonLog") return createLessonLog(user, request.log || request);
  if (action === "createReservation") return createReservation(user, request.reservation || request);
  if (action === "createRegistration") return createRegistration(user, request.registration || request);
  if (action === "createTask") return createTask(user, request.task || request);
  if (action === "clockWork") return clockWork(user, request.workLog || request);
  if (action === "createMeeting") return createMeeting(user, request.meeting || request);
  if (action === "createCalendarEvent") return createCalendarEvent(user, request.event || request.calendarEvent || request);
  if (action === "createNotice") return createNotice(user, request.notice || request);
  if (action === "updatePublicSettings") return updatePublicSettings(user, request.publicSettings || request.settings || request);
  throw new Error("Unknown action: " + action);
}

function health() {
  const spreadsheet = getSpreadsheet();
  const present = spreadsheet.getSheets().map((sheet) => sheet.getName());
  const required = Object.keys(VERSION3_TABLES);
  return {
    ok: true,
    mode: "apps-script-sheets",
    schemaVersion: VERSION3_SCHEMA_VERSION,
    spreadsheetId: spreadsheet.getId(),
    missingTabs: required.filter((name) => present.indexOf(name) === -1),
    accountCount: readRows("accounts").length
  };
}

function setupWorkbook(request) {
  const accounts = readRows("accounts");
  const setupKey = PropertiesService.getScriptProperties().getProperty("SETUP_KEY") || "";
  if (setupKey && request.setupKey !== setupKey) throw new Error("Invalid setup key.");
  if (accounts.length && !request.token) throw new Error("Setup is already complete.");
  if (accounts.length && request.token) {
    const user = authorize(request.token);
    requireRole(user, ["admin"]);
  }

  if (!accounts.length) {
    const now = isoNow();
    const salt = makeSalt();
    const password = String(request.password || VERSION3_DEFAULT_ADMIN_PASSWORD);
    appendRecord("accounts", {
      id: "admin-1",
      login_id: String(request.loginId || "admin").trim(),
      password_hash: hashPassword(password, salt),
      password_salt: salt,
      password_algorithm: "sha256:salt:password",
      role: "admin",
      status: "active",
      name: "시스템 관리자",
      email: "",
      phone: "",
      linked_student_id: "",
      permissions_json: JSON.stringify(VERSION3_ROLE_PERMISSIONS.admin),
      must_change_password: "true",
      last_login_at: "",
      created_at: now,
      updated_at: now,
      deleted_at: ""
    });
    appendAudit({ id: "admin-1", name: "시스템 관리자", role: "admin" }, "setup_admin", "account", "admin-1", "시스템 관리자", {});
  }

  seedReferenceData();
  return health();
}

function login(request) {
  const loginId = String(request.loginId || "").trim();
  const password = String(request.password || "");
  if (!loginId || !password) throw new Error("ID and password are required.");

  const account = readRows("accounts").find((item) => equalsIgnoreCase(item.login_id, loginId) && !item.deleted_at);
  if (!account || account.status !== "active") throw new Error("Account is not available.");
  if (!verifyPassword(password, account.password_salt, account.password_hash)) throw new Error("Invalid ID or password.");

  const now = isoNow();
  const token = makeToken();
  const expiresAt = isoAfterHours(VERSION3_SESSION_TTL_HOURS);
  appendRecord("sessions", {
    id: makeId("session"),
    token_hash: hashToken(token),
    account_id: account.id,
    expires_at: expiresAt,
    created_at: now,
    last_seen_at: now,
    revoked_at: "",
    deleted_at: ""
  });
  updateRecord("accounts", account.id, { last_login_at: now, updated_at: now });
  appendAudit(account, "login", "account", account.id, account.name, {});
  return { token: token, expiresAt: expiresAt, user: publicUser(account, expiresAt) };
}

function logout(token) {
  if (!token) return true;
  const session = readRows("sessions").find((item) => item.token_hash === hashToken(token) && !item.revoked_at);
  if (session) updateRecord("sessions", session.id, { revoked_at: isoNow(), updated_at: isoNow() });
  return true;
}

function changePassword(user, currentPassword, newPassword) {
  const account = findById("accounts", user.id);
  if (!verifyPassword(String(currentPassword || ""), account.password_salt, account.password_hash)) throw new Error("Current password is invalid.");
  if (String(newPassword || "").length < 8) throw new Error("New password must be at least 8 characters.");
  const salt = makeSalt();
  updateRecord("accounts", user.id, {
    password_hash: hashPassword(String(newPassword), salt),
    password_salt: salt,
    must_change_password: "false",
    updated_at: isoNow()
  });
  appendAudit(user, "change_password", "account", user.id, user.name, {});
  return { user: publicUser(findById("accounts", user.id), user.sessionExpiresAt) };
}

function bootstrap(user) {
  const data = dataExport(user);
  data.dashboardWorkQueue = buildDashboardWorkQueue(data);
  return data;
}

function listAccounts(user) {
  requirePermission(user, "viewAccounts");
  return readRows("accounts").map(publicAccount);
}

function createAccount(user, input) {
  requirePermission(user, "manageAccounts");
  const loginId = String(input.login_id || input.loginId || "").trim();
  const password = String(input.password || input.initialPassword || "");
  if (!loginId || !password || !input.name) throw new Error("Account name, ID, and initial password are required.");
  if (password.length < 8) throw new Error("Initial password must be at least 8 characters.");
  if (readRows("accounts").some((item) => equalsIgnoreCase(item.login_id, loginId))) throw new Error("Duplicate login ID.");

  const role = normalizeRole(input.role, input.employee_position);
  const linkedStudentId = role === "artist" ? String(input.linked_student_id || input.linkedStudentId || "") : "";
  if (role === "artist" && !linkedStudentId) throw new Error("Artist accounts require a linked student.");
  if (linkedStudentId && activeStudentAccountExists(linkedStudentId)) throw new Error("That artist already has an active account.");
  if (linkedStudentId) findById("students", linkedStudentId);

  const now = isoNow();
  const salt = makeSalt();
  const record = appendRecord("accounts", {
    id: makeId("account"),
    login_id: loginId,
    password_hash: hashPassword(password, salt),
    password_salt: salt,
    password_algorithm: "sha256:salt:password",
    role: role,
    status: "active",
    name: String(input.name || "").trim(),
    email: String(input.email || ""),
    phone: String(input.phone || ""),
    linked_student_id: linkedStudentId,
    permissions_json: JSON.stringify(defaultPermissions(role, input.permissions)),
    must_change_password: "true",
    last_login_at: "",
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAccountHistory(user, record, "create_account", {}, publicAccount(record));
  appendAudit(user, "create_account", "account", record.id, record.name, { loginId: loginId, role: role });
  return publicAccount(record);
}

function updateAccountStatus(user, accountId, active) {
  requirePermission(user, "resetPasswords");
  if (user.id === accountId) throw new Error("Current account cannot be disabled.");
  const account = findById("accounts", accountId);
  const status = active === false || active === "false" ? "paused" : "active";
  updateRecord("accounts", account.id, { status: status, updated_at: isoNow() });
  const next = findById("accounts", account.id);
  appendAccountHistory(user, next, status === "active" ? "activate_account" : "deactivate_account", publicAccount(account), publicAccount(next));
  appendAudit(user, "update_account_status", "account", account.id, account.name, { status: status });
  return true;
}

function resetAccountPassword(user, accountId, password) {
  requirePermission(user, "manageAccounts");
  if (user.id === accountId) throw new Error("Current account password must be changed in profile settings.");
  if (String(password || "").length < 8) throw new Error("Password must be at least 8 characters.");
  const account = findById("accounts", accountId);
  const salt = makeSalt();
  updateRecord("accounts", account.id, {
    password_hash: hashPassword(String(password), salt),
    password_salt: salt,
    status: "active",
    must_change_password: "true",
    updated_at: isoNow()
  });
  appendAccountHistory(user, account, "reset_password", {}, {});
  appendAudit(user, "reset_account_password", "account", account.id, account.name, {});
  return true;
}

function updateAccountPermissions(user, accountId, permissions) {
  requirePermission(user, "managePermissions");
  const account = findById("accounts", accountId);
  const before = parseJson(account.permissions_json, {});
  const next = defaultPermissions(account.role, permissions);
  updateRecord("accounts", account.id, { permissions_json: JSON.stringify(next), updated_at: isoNow() });
  appendAccountHistory(user, account, "update_permissions", before, next);
  appendAudit(user, "update_account_permissions", "account", account.id, account.name, {});
  return true;
}

function createAccountRequest(user, input) {
  const loginId = String(input.login_id || input.loginId || "").trim();
  if (!loginId || !input.name || !input.password) throw new Error("Name, ID, and password are required.");
  if (readRows("accounts").some((item) => equalsIgnoreCase(item.login_id, loginId))) throw new Error("Duplicate login ID.");
  const salt = makeSalt();
  const now = isoNow();
  return appendRecord("account_requests", {
    id: makeId("account-request"),
    login_id: loginId,
    password_hash: hashPassword(String(input.password), salt),
    password_salt: salt,
    password_algorithm: "sha256:salt:password",
    name: String(input.name || ""),
    email: String(input.email || ""),
    phone: String(input.phone || ""),
    requested_role: normalizeRole(input.requested_role || input.requestedRole) || "artist",
    linked_student_id: String(input.linked_student_id || input.linkedStudentId || ""),
    message: String(input.message || ""),
    status: "pending",
    reviewed_by: "",
    reviewed_at: "",
    review_memo: "",
    created_account_id: "",
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
}

function reviewAccountRequest(user, requestId, decision, review) {
  requirePermission(user, "reviewAccountRequests");
  const item = findById("account_requests", requestId);
  if (item.status !== "pending") throw new Error("Request is already reviewed.");
  const approved = String(decision || "").toLowerCase() === "approve" || String(decision || "").toLowerCase() === "approved";
  let accountId = "";
  if (approved) {
    const account = createAccount(user, {
      login_id: item.login_id,
      password: String(review.password || makeToken()).slice(0, 16),
      role: item.requested_role,
      name: item.name,
      email: item.email,
      phone: item.phone,
      linked_student_id: item.linked_student_id
    });
    accountId = account.account_id;
  }
  updateRecord("account_requests", item.id, {
    status: approved ? "approved" : "rejected",
    reviewed_by: user.id,
    reviewed_at: isoNow(),
    review_memo: String(review.memo || ""),
    created_account_id: accountId,
    updated_at: isoNow()
  });
  appendAudit(user, "review_account_request", "account_request", item.id, item.name, { decision: decision });
  return true;
}

function listAccountHistory(user, accountId) {
  requirePermission(user, "viewAccounts");
  return readRows("account_history").filter((item) => !accountId || item.account_id === accountId).sort(descBy("occurred_at"));
}

function listAccountRequests(user) {
  requirePermission(user, "reviewAccountRequests");
  return readRows("account_requests").map((item) => withoutSecrets(item));
}

function getAuditLogs(user) {
  requireRole(user, ["admin", "manager"]);
  return readRows("audit_logs").sort(descBy("created_at")).map((item) => ({
    id: item.id,
    actorId: item.actor_id,
    actorName: item.actor_name,
    action: item.action,
    targetType: item.target_type,
    targetId: item.target_id,
    targetName: item.target_name,
    metadata: parseJson(item.metadata_json, {}),
    createdAt: item.created_at
  }));
}

function getDataQualityReport(user) {
  requireRole(user, ["admin", "manager"]);
  const accounts = readRows("accounts");
  const students = readRows("students");
  const lessons = readRows("lessons");
  const notes = readRows("lesson_notes");
  const reservations = readRows("reservations");
  const checks = [];
  checks.push(checkItem("duplicate-login-id", "Duplicate login IDs", duplicateValues(accounts, "login_id").length));
  checks.push(checkItem("student-account-links", "Students without linked accounts", students.filter((student) => !activeStudentAccountExists(student.id)).length));
  checks.push(checkItem("lesson-note-reference", "Lesson notes without lessons", notes.filter((note) => !existsById("lessons", note.lesson_id)).length));
  checks.push(checkItem("reservation-conflicts", "Room reservation conflicts", findReservationConflicts(reservations).length));
  checks.push(checkItem("audit-logs", "Audit logs", readRows("audit_logs").length ? 0 : 1));
  return {
    generatedAt: isoNow(),
    summary: checks.every((item) => item.count === 0) ? "ok" : "review",
    checks: checks
  };
}

function dataExport(user) {
  const role = user.role;
  const studentId = role === "artist" ? user.linked_student_id : "";
  const teacherId = role === "coach" ? user.id : "";
  const students = filterStudentsForUser(readRows("students"), user);
  const studentIds = students.map((item) => item.id);
  const lessons = filterLessonsForUser(readRows("lessons"), user, studentIds, studentId, teacherId);
  const lessonIds = lessons.map((item) => item.id);
  const consultations = filterConsultationsForUser(readRows("consultations"), user, studentIds, studentId, teacherId);
  const consultationIds = consultations.map((item) => item.id);

  return {
    teachers: can(user, "viewTeam") ? readRows("teachers") : [],
    students: can(user, "viewStudents") ? students : [],
    guardians: role === "coach" ? [] : readRows("guardians").filter((item) => studentIds.indexOf(item.student_id) !== -1),
    courses: readRows("courses"),
    enrollments: readRows("enrollments").filter((item) => role === "admin" || role === "manager" || item.teacher_id === teacherId || studentIds.indexOf(item.student_id) !== -1),
    lessons: lessons,
    attendance: can(user, "viewLessonLogs") ? readRows("attendance").filter((item) => lessonIds.indexOf(item.lesson_id) !== -1 || studentIds.indexOf(item.student_id) !== -1) : [],
    lessonNotes: can(user, "viewLessonLogs") ? readRows("lesson_notes").filter((item) => lessonIds.indexOf(item.lesson_id) !== -1 || studentIds.indexOf(item.student_id) !== -1) : [],
    rooms: can(user, "viewReservations") ? readRows("rooms") : [],
    reservations: can(user, "viewReservations") ? filterReservationsForUser(readRows("reservations"), user, studentIds, studentId) : [],
    registrations: can(user, "viewPayments") ? readRows("payments").filter((item) => role !== "artist" || item.student_id === studentId) : [],
    payments: can(user, "viewPayments") ? readRows("payments").filter((item) => role !== "artist" || item.student_id === studentId) : [],
    consultations: consultations,
    consultationHistory: readRows("consultation_history").filter((item) => consultationIds.indexOf(item.consultation_id) !== -1),
    tasks: can(user, "manageOperations") ? readRows("tasks") : [],
    workLogs: can(user, "viewTeam") ? readRows("work_logs").filter((item) => can(user, "manageOperations") || item.account_id === user.id) : [],
    meetings: can(user, "viewMeetings") ? readRows("meetings") : [],
    calendarEvents: can(user, "viewCalendar") ? readRows("calendar_events").filter((item) => visibleForRole(item.target_roles, role)) : [],
    notices: readRows("notices").filter((item) => String(item.active) !== "false" && visibleForRole(item.target_roles, role)),
    accountRequests: can(user, "reviewAccountRequests") ? listAccountRequests(user) : [],
    publicSettings: publicSettingsObject()
  };
}

function dataImport(user, data) {
  requireRole(user, ["admin"]);
  Object.keys(data).forEach((tableName) => {
    if (!VERSION3_TABLES[tableName]) return;
    replaceRows(tableName, data[tableName]);
  });
  appendAudit(user, "data_import", "system", "version3", "Version.3", { tables: Object.keys(data) });
  return health();
}

function createStudent(user, input) {
  requirePermission(user, "manageStudents");
  if (!input.name) throw new Error("Student name is required.");
  const now = isoNow();
  const record = appendRecord("students", {
    id: makeId("student"),
    name: String(input.name || ""),
    birth_date: String(input.birth_date || input.birthDate || ""),
    phone: String(input.phone || ""),
    major: String(input.major || ""),
    goal: String(input.goal || ""),
    status: String(input.status || "active"),
    teacher_id: String(input.teacher_id || input.teacherId || ""),
    teacher_name: teacherName(input.teacher_id || input.teacherId || ""),
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_student", "student", record.id, record.name, {});
  return withAliases(record, { student_id: record.id });
}

function createConsultation(user, input) {
  if (!can(user, "manageOperations") && user.role !== "artist") throw new Error("Not authorized.");
  const now = isoNow();
  const studentId = String(input.student_id || input.studentId || "");
  const record = appendRecord("consultations", {
    id: makeId("consultation"),
    student_id: studentId,
    student_name: String(input.student_name || input.studentName || studentName(studentId) || ""),
    guardian_name: String(input.guardian_name || input.guardianName || ""),
    phone: String(input.phone || ""),
    channel: String(input.channel || "phone"),
    major: String(input.major || ""),
    goal: String(input.goal || ""),
    message: String(input.message || input.memo || ""),
    status: String(input.status || "접수"),
    priority: String(input.priority || "normal"),
    assigned_to: String(input.assigned_to || input.assignedTo || ""),
    assigned_to_name: accountName(input.assigned_to || input.assignedTo || ""),
    follow_up_date: String(input.follow_up_date || input.followUpDate || ""),
    acknowledged_at: "",
    status_updated_at: now,
    unread_for_account_ids: user.role === "artist" ? "manager-1" : "",
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendConsultationHistory(user, record, "create_consultation");
  appendAudit(user, "create_consultation", "consultation", record.id, record.student_name, {});
  return withAliases(record, { consultation_id: record.id });
}

function updateConsultationStatus(user, consultationId, status, assignedTo) {
  requirePermission(user, "manageOperations");
  const item = findById("consultations", consultationId);
  const patch = {
    status: String(status || item.status),
    assigned_to: assignedTo == null ? item.assigned_to : String(assignedTo || ""),
    assigned_to_name: assignedTo == null ? item.assigned_to_name : accountName(assignedTo),
    status_updated_at: isoNow(),
    updated_at: isoNow()
  };
  updateRecord("consultations", item.id, patch);
  const next = findById("consultations", item.id);
  appendConsultationHistory(user, next, "update_consultation_status");
  appendAudit(user, "update_consultation_status", "consultation", item.id, item.student_name, patch);
  return true;
}

function acknowledgeConsultation(user, consultationId) {
  const item = findById("consultations", consultationId);
  updateRecord("consultations", item.id, { acknowledged_at: isoNow(), status: item.status === "접수" ? "확인 중" : item.status, updated_at: isoNow() });
  appendConsultationHistory(user, findById("consultations", item.id), "acknowledge_consultation");
  appendAudit(user, "acknowledge_consultation", "consultation", item.id, item.student_name, {});
  return true;
}

function createLesson(user, input) {
  requirePermission(user, "manageOperations");
  const studentId = String(input.student_id || input.studentId || "");
  const teacherId = String(input.teacher_id || input.teacherId || "");
  if (!studentId || !teacherId) throw new Error("Lesson requires student and teacher.");
  findById("students", studentId);
  if (!existsById("teachers", teacherId) && !existsById("accounts", teacherId)) throw new Error("Invalid teacher reference.");
  const now = isoNow();
  const record = appendRecord("lessons", {
    id: makeId("lesson"),
    student_id: studentId,
    teacher_id: teacherId,
    course_id: String(input.course_id || input.courseId || input.subject || ""),
    lesson_date: String(input.lesson_date || input.lessonDate || input.date || ""),
    start_time: String(input.start_time || input.startTime || ""),
    duration_minutes: String(input.duration_minutes || input.duration || "60"),
    room_id: String(input.room_id || input.roomId || ""),
    status: String(input.status || "scheduled"),
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_lesson", "lesson", record.id, studentName(studentId), {});
  return withAliases(record, { lesson_id: record.id });
}

function updateAttendance(user, input) {
  requirePermission(user, "writeLessonLogs");
  const lessonId = String(input.lesson_id || input.lessonId || "");
  const lesson = findById("lessons", lessonId);
  const existing = readRows("attendance").find((item) => item.lesson_id === lessonId && !item.deleted_at);
  const now = isoNow();
  const patch = {
    lesson_id: lessonId,
    student_id: String(input.student_id || lesson.student_id || ""),
    teacher_id: lesson.teacher_id,
    status: String(input.status || "checked"),
    makeup_needed: String(input.makeup_needed || input.makeupNeeded || "false"),
    checked_at: now,
    memo: String(input.memo || ""),
    updated_at: now
  };
  const record = existing ? updateRecord("attendance", existing.id, patch) : appendRecord("attendance", withAliases(patch, { id: makeId("attendance"), created_at: now, deleted_at: "" }));
  appendAudit(user, "update_attendance", "attendance", record.id, lessonId, {});
  return withAliases(record, { attendance_id: record.id });
}

function createLessonLog(user, input) {
  requirePermission(user, "writeLessonLogs");
  let lessonId = String(input.lesson_id || input.lessonId || "");
  if (!lessonId) {
    const studentId = String(input.student_id || input.studentId || "");
    const teacherId = String(input.teacher_id || input.teacherId || "");
    const lessonDate = String(input.lesson_date || input.date || "");
    const lesson = readRows("lessons").find((item) => item.student_id === studentId && item.teacher_id === teacherId && item.lesson_date === lessonDate);
    if (lesson) lessonId = lesson.id;
  }
  if (!lessonId) throw new Error("Lesson note requires an existing lesson.");
  const lessonRecord = findById("lessons", lessonId);
  const now = isoNow();
  const record = appendRecord("lesson_notes", {
    id: makeId("lesson-note"),
    lesson_id: lessonId,
    student_id: String(input.student_id || input.studentId || lessonRecord.student_id || ""),
    teacher_id: String(input.teacher_id || input.teacherId || lessonRecord.teacher_id || ""),
    lesson_date: String(input.lesson_date || input.date || lessonRecord.lesson_date || ""),
    content: String(input.lesson_content || input.content || ""),
    homework: String(input.homework || ""),
    next_goal: String(input.next_goal || input.nextGoal || ""),
    practice_request: String(input.practice_request || input.practiceRequest || ""),
    internal_memo: String(input.internal_memo || input.internalMemo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_lesson_log", "lesson_note", record.id, record.lesson_id, {});
  return withAliases(record, { log_id: record.id });
}

function createReservation(user, input) {
  if (!can(user, "manageReservations") && !can(user, "reserveLessonRoom") && !can(user, "reservePracticeRoom")) throw new Error("Not authorized.");
  const roomId = String(input.room_id || input.roomId || "");
  const room = findById("rooms", roomId);
  const date = String(input.reservation_date || input.date || "");
  const startTime = String(input.start_time || input.startTime || "");
  const endTime = String(input.end_time || input.endTime || "");
  if (!date || !startTime || !endTime) throw new Error("Reservation date and time are required.");
  const conflict = readRows("reservations").find((item) => item.room_id === roomId && item.reservation_date === date && item.status !== "cancelled" && overlaps(startTime, endTime, item.start_time, item.end_time));
  if (conflict) throw new Error("Duplicate room/time reservation.");
  const now = isoNow();
  const record = appendRecord("reservations", {
    id: makeId("reservation"),
    room_id: roomId,
    room_name: room.name,
    reserved_by: user.id,
    reserved_by_name: user.name,
    student_id: user.role === "artist" ? user.linked_student_id : String(input.student_id || input.studentId || ""),
    teacher_id: user.role === "coach" ? user.id : String(input.teacher_id || input.teacherId || ""),
    reservation_date: date,
    start_time: startTime,
    end_time: endTime,
    purpose: String(input.purpose || ""),
    status: String(input.status || "pending"),
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_reservation", "reservation", record.id, room.name, {});
  return withAliases(record, { reservation_id: record.id });
}

function createRegistration(user, input) {
  requirePermission(user, "viewPayments");
  const studentId = String(input.student_id || input.studentId || "");
  findById("students", studentId);
  const now = isoNow();
  const record = appendRecord("payments", {
    id: makeId("payment"),
    student_id: studentId,
    student_name: studentName(studentId),
    enrollment_id: String(input.enrollment_id || input.enrollmentId || ""),
    registration_type: String(input.registration_type || input.registrationType || "신규등록"),
    program_name: String(input.program_name || input.title || input.subject || "수강료"),
    amount: String(input.amount || "0"),
    period_start: String(input.period_start || input.periodStart || ""),
    next_due_date: String(input.next_due_date || input.nextDueDate || ""),
    paid_at: String(input.paid_at || input.paidAt || ""),
    payment_status: String(input.payment_status || input.status || "확인 필요"),
    method: String(input.method || ""),
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_registration", "payment", record.id, record.student_name, {});
  return withAliases(record, { registration_id: record.id });
}

function createTask(user, input) {
  requirePermission(user, "manageOperations");
  const now = isoNow();
  const record = appendRecord("tasks", {
    id: makeId("task"),
    title: String(input.title || ""),
    assignee_id: String(input.assignee_id || input.assigneeId || ""),
    assignee_name: accountName(input.assignee_id || input.assigneeId || ""),
    due_date: String(input.due_date || input.dueDate || ""),
    status: String(input.status || "todo"),
    priority: String(input.priority || "normal"),
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_task", "task", record.id, record.title, {});
  return withAliases(record, { task_id: record.id });
}

function clockWork(user, input) {
  requirePermission(user, "clockWork");
  const workDate = String(input.workDate || input.work_date || today());
  const existing = readRows("work_logs").find((item) => item.account_id === user.id && item.work_date === workDate);
  const now = isoNow();
  if (existing) {
    const patch = String(input.mode || "") === "out" ? { clock_out_at: now, memo: String(input.memo || existing.memo), updated_at: now } : { clock_in_at: existing.clock_in_at || now, memo: String(input.memo || existing.memo), updated_at: now };
    const record = updateRecord("work_logs", existing.id, patch);
    appendAudit(user, "clock_work", "work_log", record.id, user.name, {});
    return withAliases(record, { work_log_id: record.id });
  }
  const record = appendRecord("work_logs", {
    id: makeId("work-log"),
    account_id: user.id,
    account_name: user.name,
    work_date: workDate,
    clock_in_at: now,
    clock_out_at: "",
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "clock_work", "work_log", record.id, user.name, {});
  return withAliases(record, { work_log_id: record.id });
}

function createMeeting(user, input) {
  requirePermission(user, "manageMeetings");
  const now = isoNow();
  const participantIds = toCsv(input.participantIds || input.participant_ids);
  const record = appendRecord("meetings", {
    id: makeId("meeting"),
    title: String(input.title || ""),
    starts_at: String(input.startsAt || input.starts_at || ""),
    participant_ids: participantIds,
    participant_names: participantIds.split(",").map(accountName).filter(Boolean).join(","),
    status: String(input.status || "scheduled"),
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_meeting", "meeting", record.id, record.title, {});
  return withAliases(record, { meeting_id: record.id });
}

function createCalendarEvent(user, input) {
  requirePermission(user, "manageCalendar");
  const now = isoNow();
  const record = appendRecord("calendar_events", {
    id: makeId("calendar-event"),
    title: String(input.title || ""),
    date: String(input.date || ""),
    start_time: String(input.startTime || input.start_time || ""),
    target_roles: roleCsv(input.targetRoles || input.target_roles || ["admin", "manager", "coach", "artist"]),
    memo: String(input.memo || ""),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_calendar_event", "calendar_event", record.id, record.title, {});
  return withAliases(record, { calendar_event_id: record.id });
}

function createNotice(user, input) {
  requirePermission(user, "manageNotices");
  const now = isoNow();
  const record = appendRecord("notices", {
    id: makeId("notice"),
    title: String(input.title || ""),
    category: String(input.category || "공지"),
    author_id: user.id,
    author_name: user.name,
    body: String(input.body || ""),
    target_roles: roleCsv(input.targetRoles || input.target_roles || ["admin", "manager", "coach", "artist"]),
    pinned: asBoolean(input.pinned) ? "true" : "false",
    active: input.active === false ? "false" : "true",
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
  appendAudit(user, "create_notice", "notice", record.id, record.title, {});
  return withAliases(record, { notice_id: record.id });
}

function updatePublicSettings(user, input) {
  requirePermission(user, "managePublicSettings");
  const map = {
    loginNotice: "login_notice",
    academyPhone: "academy_phone",
    reservationGuide: "reservation_guide"
  };
  Object.keys(map).forEach((sourceKey) => {
    if (input[sourceKey] == null && input[map[sourceKey]] == null) return;
    upsertPublicSetting(map[sourceKey], String(input[sourceKey] == null ? input[map[sourceKey]] : input[sourceKey]), user.id);
  });
  appendAudit(user, "update_public_settings", "public_settings", "public_settings", "Public settings", {});
  return publicSettingsObject();
}

function ensureWorkbook() {
  Object.keys(VERSION3_TABLES).forEach((name) => ensureSheet(name));
}

function ensureSheet(name) {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  const expected = VERSION3_TABLES[name];
  const current = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), expected.length)).getValues()[0].map(String) : [];
  if (!current.filter(Boolean).length) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
    sheet.setFrozenRows(1);
    return expected;
  }
  const missing = expected.filter((header) => current.indexOf(header) === -1);
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  return current.concat(missing).filter(Boolean);
}

function getSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty("VERSION3_SPREADSHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("VERSION3_SPREADSHEET_ID script property is required for standalone deployment.");
  return active;
}

function readRows(name) {
  const sheet = getSpreadsheet().getSheetByName(name) || ensureSheet(name);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
    .map((row) => rowToRecord(headers, row))
    .filter((item) => Object.keys(item).some((key) => String(item[key] || "") !== ""))
    .filter((item) => !item.deleted_at);
}

function appendRecord(name, record) {
  const sheet = getSpreadsheet().getSheetByName(name) || ensureSheet(name);
  const headers = ensureSheet(name);
  const normalized = normalizeRecord(headers, record);
  sheet.appendRow(headers.map((header) => serializeCell(normalized[header])));
  return normalized;
}

function updateRecord(name, id, patch) {
  const sheet = getSpreadsheet().getSheetByName(name) || ensureSheet(name);
  const headers = ensureSheet(name);
  const idColumn = headers.indexOf("id") + 1;
  const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getValues().map((row) => String(row[0])) : [];
  const rowOffset = ids.indexOf(String(id));
  if (rowOffset === -1) throw new Error("Record not found: " + name + "/" + id);
  const rowNumber = rowOffset + 2;
  const current = rowToRecord(headers, sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0]);
  const next = normalizeRecord(headers, Object.assign({}, current, patch));
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map((header) => serializeCell(next[header]))]);
  return next;
}

function replaceRows(name, rows) {
  const sheet = getSpreadsheet().getSheetByName(name) || ensureSheet(name);
  const headers = ensureSheet(name);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  if (!Array.isArray(rows) || !rows.length) return;
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows.map((row) => headers.map((header) => serializeCell(row[header]))));
}

function rowToRecord(headers, row) {
  const record = {};
  headers.forEach((header, index) => {
    if (!header) return;
    record[header] = row[index] instanceof Date ? row[index].toISOString() : String(row[index] == null ? "" : row[index]);
  });
  return record;
}

function normalizeRecord(headers, record) {
  const normalized = {};
  headers.forEach((header) => {
    normalized[header] = record[header] == null ? "" : record[header];
  });
  return normalized;
}

function findById(name, id) {
  const record = readRows(name).find((item) => item.id === String(id));
  if (!record) throw new Error("Invalid reference: " + name + "/" + id);
  return record;
}

function existsById(name, id) {
  if (!id) return false;
  return readRows(name).some((item) => item.id === String(id));
}

function authorize(token) {
  if (!token) throw new Error("Login session is required.");
  const tokenHash = hashToken(token);
  const session = readRows("sessions").find((item) => item.token_hash === tokenHash && !item.revoked_at);
  if (!session) throw new Error("Invalid session.");
  if (new Date(session.expires_at).getTime() < Date.now()) throw new Error("Session expired.");
  updateRecord("sessions", session.id, { last_seen_at: isoNow() });
  const account = findById("accounts", session.account_id);
  if (account.status !== "active") throw new Error("Account is not active.");
  const user = publicUser(account, session.expires_at);
  user.permissions = defaultPermissions(user.role, user.permissions);
  return user;
}

function publicUser(account, expiresAt) {
  const role = normalizeRole(account.role) || "artist";
  return {
    id: account.id,
    account_id: account.id,
    name: account.name,
    email: account.email,
    role: role,
    linkedStudentId: account.linked_student_id,
    linked_student_id: account.linked_student_id,
    mustChangePassword: asBoolean(account.must_change_password),
    must_change_password: asBoolean(account.must_change_password),
    sessionExpiresAt: expiresAt || "",
    session_expires_at: expiresAt || "",
    permissions: defaultPermissions(role, parseJson(account.permissions_json, {}))
  };
}

function publicAccount(account) {
  const role = normalizeRole(account.role, account.employee_position) || "artist";
  return {
    id: account.id,
    account_id: account.id,
    login_id: account.login_id,
    name: account.name,
    role: role,
    employee_position: role === "admin" ? "admin" : role === "manager" ? "manager" : role === "coach" ? "coach" : "",
    email: account.email,
    phone: account.phone,
    linked_student_id: account.linked_student_id,
    active: account.status === "active",
    status: account.status,
    must_change_password: asBoolean(account.must_change_password),
    permissions: defaultPermissions(role, parseJson(account.permissions_json, {})),
    last_login_at: account.last_login_at,
    created_at: account.created_at
  };
}

function withoutSecrets(item) {
  const copy = Object.assign({}, item);
  delete copy.password_hash;
  delete copy.password_salt;
  return copy;
}

function normalizeRole(role, employeePosition) {
  const raw = String(role || "").trim().toLowerCase();
  const position = String(employeePosition || "").trim().toLowerCase();
  if (raw === "owner" || raw === "admin" || raw === "administrator" || raw === "system admin") return position === "manager" ? "manager" : "admin";
  if (raw === "staff" || raw === "manager") return position === "admin" || position === "owner" ? "admin" : "manager";
  if (raw === "teacher" || raw === "coach") return "coach";
  if (raw === "student" || raw === "artist") return "artist";
  if (position === "owner" || position === "admin") return "admin";
  if (position === "manager") return "manager";
  if (position === "teacher" || position === "coach") return "coach";
  return raw || "artist";
}

function defaultPermissions(role, overrides) {
  return Object.assign({}, VERSION3_ROLE_PERMISSIONS[normalizeRole(role) || "artist"], overrides || {});
}

function allPermissions(value) {
  return VERSION3_PERMISSION_KEYS.reduce((memo, key) => {
    memo[key] = value;
    return memo;
  }, {});
}

function mergePermissions(values) {
  return Object.assign(allPermissions(false), values);
}

function can(user, permission) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return Boolean(defaultPermissions(user.role, user.permissions)[permission]);
}

function requirePermission(user, permission) {
  if (!can(user, permission)) throw new Error("Not authorized: " + permission);
}

function requireRole(user, roles) {
  if (roles.indexOf(user.role) === -1) throw new Error("Not authorized.");
}

function runWithOptionalLock(action, callback) {
  if (!VERSION3_LOCKED_ACTIONS[action]) return callback();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function parseRequest(event) {
  if (event && event.postData && event.postData.contents) return JSON.parse(event.postData.contents || "{}");
  return (event && event.parameter) || {};
}

function jsonSuccess(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data })).setMimeType(ContentService.MimeType.JSON);
}

function jsonError(error) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error && error.message ? error.message : String(error) })).setMimeType(ContentService.MimeType.JSON);
}

function seedReferenceData() {
  const now = isoNow();
  if (!readRows("settings").some((item) => item.key === "schema_version")) appendRecord("settings", { id: "setting-schema-version", key: "schema_version", value: VERSION3_SCHEMA_VERSION, created_at: now, updated_at: now, deleted_at: "" });
  upsertPublicSetting("login_notice", "계정 요청 및 패스워드 초기화는 매니저에게 문의 바랍니다.", "admin-1");
  upsertPublicSetting("academy_phone", "", "admin-1");
  upsertPublicSetting("reservation_guide", "공간 예약은 정각부터 1시간 단위로 신청합니다.", "admin-1");
}

function appendAudit(user, action, targetType, targetId, targetName, metadata) {
  const now = isoNow();
  appendRecord("audit_logs", {
    id: makeId("audit"),
    actor_id: user.id || user.account_id || "",
    actor_name: user.name || "",
    actor_role: user.role || "",
    action: action,
    target_type: targetType,
    target_id: targetId,
    target_name: targetName || "",
    metadata_json: JSON.stringify(metadata || {}),
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
}

function appendAccountHistory(user, account, action, before, after) {
  const now = isoNow();
  appendRecord("account_history", {
    id: makeId("account-history"),
    account_id: account.id,
    account_name: account.name,
    actor_id: user.id,
    actor_name: user.name,
    action: action,
    role: account.role,
    permissions_before: JSON.stringify(before || {}),
    permissions_after: JSON.stringify(after || {}),
    memo: "",
    occurred_at: now,
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
}

function appendConsultationHistory(user, consultation, action) {
  const now = isoNow();
  appendRecord("consultation_history", {
    id: makeId("consultation-history"),
    consultation_id: consultation.id,
    actor_id: user.id,
    actor_name: user.name,
    action: action,
    status: consultation.status,
    assigned_to: consultation.assigned_to,
    assigned_to_name: consultation.assigned_to_name,
    memo: consultation.memo || "",
    occurred_at: now,
    created_at: now,
    updated_at: now,
    deleted_at: ""
  });
}

function publicSettingsObject() {
  return readRows("public_settings").reduce((memo, item) => {
    if (item.key === "login_notice") memo.login_notice = item.value;
    if (item.key === "academy_phone") memo.academy_phone = item.value;
    if (item.key === "reservation_guide") memo.reservation_guide = item.value;
    memo.updated_at = item.updated_at || memo.updated_at || "";
    memo.updated_by = item.updated_by || memo.updated_by || "";
    return memo;
  }, {});
}

function upsertPublicSetting(key, value, actorId) {
  const existing = readRows("public_settings").find((item) => item.key === key);
  const now = isoNow();
  if (existing) return updateRecord("public_settings", existing.id, { value: value, updated_by: actorId, updated_at: now });
  return appendRecord("public_settings", { id: "public-setting-" + key.replace(/_/g, "-"), key: key, value: value, updated_by: actorId, created_at: now, updated_at: now, deleted_at: "" });
}

function filterStudentsForUser(rows, user) {
  if (user.role === "artist") return rows.filter((item) => item.id === user.linked_student_id);
  if (user.role === "coach") return rows.filter((item) => item.teacher_id === user.id || item.teacher_id === teacherIdForAccount(user.id));
  return rows;
}

function filterLessonsForUser(rows, user, studentIds, studentId, teacherId) {
  if (user.role === "artist") return rows.filter((item) => item.student_id === studentId);
  if (user.role === "coach") return rows.filter((item) => item.teacher_id === teacherId || studentIds.indexOf(item.student_id) !== -1);
  return rows;
}

function filterReservationsForUser(rows, user, studentIds, studentId) {
  if (user.role === "artist") return rows.filter((item) => item.student_id === studentId || item.reserved_by === user.id);
  if (user.role === "coach") return rows.filter((item) => item.teacher_id === user.id || item.reserved_by === user.id || studentIds.indexOf(item.student_id) !== -1);
  return rows;
}

function filterConsultationsForUser(rows, user, studentIds, studentId, teacherId) {
  if (user.role === "artist") return rows.filter((item) => item.student_id === studentId);
  if (user.role === "coach") return rows.filter((item) => item.assigned_to === teacherId || studentIds.indexOf(item.student_id) !== -1);
  return rows;
}

function buildDashboardWorkQueue(data) {
  return (data.consultations || []).filter((item) => item.status !== "종결").slice(0, 5).map((item) => ({
    id: "work-" + item.id,
    kind: "상담요청",
    source_type: "consultationRequests",
    source_id: item.id,
    title: item.student_name || item.phone || "상담요청",
    owner_name: item.assigned_to_name || "미배정",
    href: "/consultations",
    priority: item.priority === "urgent" ? "urgent" : "normal",
    tone: item.priority === "urgent" ? "danger" : "default",
    status: item.status,
    due_at: item.follow_up_date || item.created_at
  }));
}

function activeStudentAccountExists(studentId) {
  return readRows("accounts").some((item) => normalizeRole(item.role) === "artist" && item.linked_student_id === studentId && item.status === "active");
}

function teacherIdForAccount(accountId) {
  const teacher = readRows("teachers").find((item) => item.account_id === accountId || item.id === accountId);
  return teacher ? teacher.id : accountId;
}

function studentName(studentId) {
  const item = readRows("students").find((student) => student.id === String(studentId));
  return item ? item.name : "";
}

function teacherName(teacherId) {
  const item = readRows("teachers").find((teacher) => teacher.id === String(teacherId) || teacher.account_id === String(teacherId));
  return item ? item.name : "";
}

function accountName(accountId) {
  const item = readRows("accounts").find((account) => account.id === String(accountId));
  return item ? item.name : "";
}

function visibleForRole(targetRoles, role) {
  const roles = String(targetRoles || "").split(",").map((item) => normalizeRole(item.trim(), "")).filter(Boolean);
  return !roles.length || roles.indexOf(normalizeRole(role, "")) !== -1;
}

function roleCsv(value) {
  const roles = toCsv(value).split(",").map((item) => normalizeRole(item.trim(), "")).filter(Boolean);
  const unique = [];
  roles.forEach((role) => {
    if (unique.indexOf(role) === -1) unique.push(role);
  });
  return (unique.length ? unique : ["admin", "manager", "coach", "artist"]).join(",");
}

function findReservationConflicts(reservations) {
  const conflicts = [];
  reservations.forEach((current, index) => {
    reservations.slice(index + 1).forEach((next) => {
      if (current.room_id === next.room_id && current.reservation_date === next.reservation_date && overlaps(current.start_time, current.end_time, next.start_time, next.end_time)) conflicts.push([current.id, next.id]);
    });
  });
  return conflicts;
}

function overlaps(startA, endA, startB, endB) {
  return minutes(startA) < minutes(endB) && minutes(startB) < minutes(endA);
}

function minutes(value) {
  const parts = String(value || "00:00").split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function duplicateValues(rows, key) {
  const seen = {};
  return rows.map((item) => String(item[key] || "").toLowerCase()).filter((value) => {
    if (!value) return false;
    seen[value] = (seen[value] || 0) + 1;
    return seen[value] === 2;
  });
}

function checkItem(id, title, count) {
  return { id: id, title: title, count: count, status: count ? "review" : "ok" };
}

function hashPassword(password, salt) {
  return hashText(String(salt || "") + ":" + String(password || ""));
}

function verifyPassword(password, salt, expectedHash) {
  return hashPassword(password, salt) === String(expectedHash || "");
}

function hashToken(token) {
  const secret = PropertiesService.getScriptProperties().getProperty("SESSION_HASH_SECRET") || getSpreadsheet().getId();
  return hashText(secret + ":" + String(token || ""));
}

function hashText(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map((byte) => {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ("0" + normalized.toString(16)).slice(-2);
  }).join("");
}

function makeSalt() {
  return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
}

function makeToken() {
  return Utilities.getUuid() + "." + Utilities.getUuid() + "." + Utilities.getUuid();
}

function makeId(prefix) {
  return prefix + "-" + Utilities.getUuid().slice(0, 8);
}

function isoNow() {
  return new Date().toISOString();
}

function isoAfterHours(hours) {
  return new Date(Date.now() + Number(hours || 12) * 60 * 60 * 1000).toISOString();
}

function today() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
}

function asBoolean(value) {
  return value === true || value === "true" || value === "TRUE" || value === "1" || value === 1;
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function serializeCell(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function equalsIgnoreCase(left, right) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

function descBy(key) {
  return (left, right) => String(right[key] || "").localeCompare(String(left[key] || ""));
}

function withAliases(record, aliases) {
  return Object.assign({}, record, aliases || {});
}

function toCsv(value) {
  if (Array.isArray(value)) return value.join(",");
  return String(value || "");
}
