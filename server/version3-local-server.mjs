import { createServer } from "node:http";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import {
  bonsungInitialCalendarEvents,
  bonsungInitialConsultationHistory,
  bonsungInitialConsultations,
  bonsungInitialCourses,
  bonsungInitialDocumentTasks,
  bonsungInitialNotices,
  bonsungInitialPayments,
  bonsungInitialStudents,
  bonsungInitialTeachers
} from "./bonsung-initial-data.mjs";

const port = Number(process.env.VERSION3_LOCAL_SERVER_PORT || process.env.PORT || 4303);
const host = (process.env.VERSION3_SERVER_HOST || "127.0.0.1").trim() || "127.0.0.1";
const testPassword = process.env.VERSION3_LOCAL_SERVER_PASSWORD || "version3";
const dataFileSetting = (process.env.VERSION3_LOCAL_DATA_FILE || ".version3-local-data.json").trim();
const persistenceEnabled = dataFileSetting !== "" && dataFileSetting.toLowerCase() !== "memory";
const dataFilePath = persistenceEnabled ? resolve(process.cwd(), dataFileSetting) : "";
const backupEnabled = persistenceEnabled && process.env.VERSION3_DISABLE_LOCAL_BACKUPS !== "true";
const sessionTtlHours = Math.max(1, Number(process.env.VERSION3_SESSION_TTL_HOURS || 12));
const allowedOrigins = (process.env.VERSION3_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const passwordMinLength = 8;
const loginFailureWindowMs = 10 * 60 * 1000;
const loginFailureLockMs = 5 * 60 * 1000;
const maxLoginFailures = 5;

const permissionSets = {
  owner: {
    manageAccounts: true, viewAccounts: true, manageOperations: true, manageNotices: true, managePermissions: true,
    manageMeetings: true, manageCalendar: true, viewPayments: true, clockWork: true, viewStudents: true,
    manageStudents: true, viewLessonLogs: true, writeLessonLogs: true, viewReservations: true, manageReservations: true,
    reserveLessonRoom: true, reservePracticeRoom: true, viewTeam: true, viewMeetings: true, viewCalendar: true,
    reviewAccountRequests: true, managePublicSettings: true
  },
  manager: {
    manageAccounts: false, viewAccounts: true, manageOperations: true, manageNotices: true, managePermissions: false,
    manageMeetings: true, manageCalendar: true, viewPayments: true, clockWork: true, viewStudents: true,
    manageStudents: true, viewLessonLogs: true, writeLessonLogs: true, viewReservations: true, manageReservations: true,
    reserveLessonRoom: true, reservePracticeRoom: true, viewTeam: true, viewMeetings: true, viewCalendar: true,
    reviewAccountRequests: false, managePublicSettings: false
  },
  teacher: {
    manageAccounts: false, viewAccounts: false, manageOperations: false, manageNotices: false, managePermissions: false,
    manageMeetings: false, manageCalendar: false, viewPayments: false, clockWork: true, viewStudents: true,
    manageStudents: false, viewLessonLogs: true, writeLessonLogs: true, viewReservations: true, manageReservations: false,
    reserveLessonRoom: true, reservePracticeRoom: true, viewTeam: true, viewMeetings: true, viewCalendar: true,
    reviewAccountRequests: false, managePublicSettings: false
  },
  student: {
    manageAccounts: false, viewAccounts: false, manageOperations: false, manageNotices: false, managePermissions: false,
    manageMeetings: false, manageCalendar: false, viewPayments: false, clockWork: false, viewStudents: false,
    manageStudents: false, viewLessonLogs: true, writeLessonLogs: false, viewReservations: true, manageReservations: false,
    reserveLessonRoom: false, reservePracticeRoom: true, viewTeam: false, viewMeetings: false, viewCalendar: true,
    reviewAccountRequests: false, managePublicSettings: false
  }
};

assertServerRuntimeSafe();

const db = loadDatabase();
const sessions = new Map();
const loginAttempts = new Map();

const server = createServer(async (request, response) => {
  try {
    setCors(request, response);
    if (request.method === "OPTIONS") return send(response, 204, "");

    const url = new URL(request.url || "/", `http://${request.headers.host || `127.0.0.1:${port}`}`);
    const body = await readJson(request);

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { ok: true, data: healthReport() });
    }

    if (request.method === "POST" && url.pathname === "/account-requests") {
      return createAccountRequest(response, body);
    }

    if (request.method === "POST" && url.pathname === "/auth/login") {
      return login(response, body);
    }

    const account = authenticate(request);
    if (!account) return sendJson(response, 401, { ok: false, error: "Version.3 server session is required." });

    if (request.method === "POST" && url.pathname === "/auth/logout") return logout(response, request, account);
    if (request.method === "POST" && url.pathname === "/auth/change-password") return changePassword(response, request, account, body);
    if (request.method === "GET" && url.pathname === "/bootstrap") return sendJson(response, 200, { ok: true, data: bootstrapFor(account) });
    if (request.method === "GET" && url.pathname === "/accounts") return requirePermission(response, account, "viewAccounts", () => sendJson(response, 200, { ok: true, data: publicAccounts() }));
    if (request.method === "GET" && url.pathname === "/account-requests") return requirePermission(response, account, "reviewAccountRequests", () => sendJson(response, 200, { ok: true, data: publicAccountRequests() }));
    if (request.method === "GET" && url.pathname === "/account-history") return requirePermission(response, account, "viewAccounts", () => sendJson(response, 200, { ok: true, data: db.accountHistory }));
    if (request.method === "GET" && url.pathname === "/audit-logs") return requirePermission(response, account, "manageOperations", () => sendJson(response, 200, { ok: true, data: db.auditLogs || [] }));
    if (request.method === "GET" && url.pathname === "/data-quality") return requirePermission(response, account, "manageOperations", () => sendJson(response, 200, { ok: true, data: dataQualityReport() }));
    if (request.method === "GET" && url.pathname === "/data-export") return requirePermission(response, account, "manageOperations", () => exportData(response, account));
    if (request.method === "GET" && url.pathname === "/data-backups") return requireOwner(response, account, () => listDataBackups(response));
    if (request.method === "POST" && url.pathname === "/data-import") return requireOwner(response, account, () => importData(response, request, account, body));
    if (request.method === "POST" && url.pathname === "/accounts") return requirePermission(response, account, "manageAccounts", () => createAccount(response, account, body));
    if (request.method === "POST" && url.pathname.startsWith("/actions/")) return handleAction(response, account, url.pathname.slice("/actions/".length), body);
    if (request.method === "PATCH" && /^\/accounts\/[^/]+\/status$/.test(url.pathname)) return requirePermission(response, account, "manageAccounts", () => updateAccountStatus(response, account, url.pathname.split("/")[2], body));
    if (request.method === "PATCH" && /^\/accounts\/[^/]+\/password$/.test(url.pathname)) return requirePermission(response, account, "manageAccounts", () => resetAccountPassword(response, account, url.pathname.split("/")[2], body));
    if (request.method === "PATCH" && /^\/accounts\/[^/]+\/permissions$/.test(url.pathname)) return requirePermission(response, account, "managePermissions", () => updateAccountPermissions(response, account, url.pathname.split("/")[2], body));
    if (request.method === "PATCH" && /^\/account-requests\/[^/]+\/review$/.test(url.pathname)) return requirePermission(response, account, "reviewAccountRequests", () => reviewAccountRequest(response, account, url.pathname.split("/")[2], body));

    return sendJson(response, 404, { ok: false, error: `Unknown Version.3 endpoint: ${url.pathname}` });
  } catch (error) {
    return sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`Version.3 server listening on http://${host}:${port}`);
  if (persistenceEnabled) console.log(`Version.3 local data file: ${dataFilePath}`);
});

function login(response, body) {
  const loginId = stringValue(body.loginId).toLowerCase();
  const password = stringValue(body.password);
  const throttle = loginThrottle(loginId);
  if (throttle.blocked) {
    return sendJson(response, 429, { ok: false, error: "Too many login attempts. Please try again later.", retryAfterSeconds: throttle.retryAfterSeconds });
  }

  const account = db.accounts.find((item) => item.loginId.toLowerCase() === loginId && canLoginAccount(item));
  if (!account || !verifyPassword(password, account.password)) {
    recordLoginFailure(loginId);
    return sendJson(response, 401, { ok: false, error: "Invalid login ID or password." });
  }

  const token = `v3-local-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000).toISOString();
  sessions.set(token, { accountId: account.id, expiresAt });
  clearLoginFailures(loginId);
  if (account.status === "invited") {
    account.status = "active";
    addAccountHistory(account, account, "activate_account", null, null, { reason: "first_login" });
  }
  account.lastLoginAt = new Date().toISOString();
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: { token, expiresAt, user: serverUser(account, expiresAt) } });
}

function authenticate(request) {
  const session = sessions.get(readBearerToken(request));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    sessions.delete(readBearerToken(request));
    return null;
  }
  return db.accounts.find((account) => account.id === session.accountId && account.status === "active") || null;
}

function logout(response, request, account) {
  sessions.delete(readBearerToken(request));
  addAuditLog(account, "logout", "session", account.id, account.name);
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: true });
}

function changePassword(response, request, account, body) {
  const currentPassword = stringValue(body.currentPassword);
  const newPassword = stringValue(body.newPassword);
  if (!verifyPassword(currentPassword, account.password)) return sendJson(response, 403, { ok: false, error: "Current password does not match." });
  if (!isValidPassword(newPassword)) return sendJson(response, 400, { ok: false, error: `New password must be at least ${passwordMinLength} characters.` });
  if (newPassword === currentPassword) return sendJson(response, 400, { ok: false, error: "New password must be different from the current password." });

  account.password = hashPassword(newPassword);
  account.mustChangePassword = false;
  const invalidatedSessions = invalidateAccountSessions(account.id, readBearerToken(request));
  addAuditLog(account, "change_password", "account", account.id, account.name, { invalidatedSessions });
  saveDatabase();
  const session = sessions.get(readBearerToken(request));
  return sendJson(response, 200, { ok: true, data: { user: serverUser(account, session?.expiresAt || "") } });
}

function readBearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

function bootstrapFor(account) {
  const studentId = account.role === "student" ? account.linkedStudentId : "";
  const teacherId = account.role === "teacher" ? account.id : "";
  const students = account.role === "student"
    ? db.students.filter((student) => student.id === studentId)
    : account.role === "teacher"
      ? db.students.filter((student) => student.teacherId === teacherId)
      : db.students;
  const studentIds = new Set(students.map((student) => student.id));
  const lessons = db.lessons.filter((lesson) => {
    if (account.role === "student") return lesson.studentId === studentId;
    if (account.role === "teacher") return lesson.teacherId === teacherId;
    return true;
  });
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const consultations = db.consultations.filter((item) => {
    if (account.role === "student") return item.studentId === studentId;
    if (account.role === "teacher") return item.assignedTo === teacherId || studentIds.has(item.studentId);
    return true;
  });

  return {
    teachers: account.permissions.viewTeam ? db.teachers : [],
    students: account.permissions.viewStudents ? students : [],
    guardians: account.permissions.viewStudents ? db.guardians.filter((guardian) => studentIds.has(guardian.studentId)) : [],
    consultations,
    consultationHistory: db.consultationHistory.filter((item) => consultations.some((consultation) => consultation.id === item.consultationId)),
    courses: db.courses,
    enrollments: account.role === "student" ? [] : db.enrollments.filter((item) => studentIds.size === 0 || studentIds.has(item.studentId) || account.role === "owner" || account.role === "manager"),
    lessons,
    attendance: account.permissions.viewLessonLogs ? db.attendance.filter((item) => lessonIds.has(item.lessonId) || studentIds.has(item.studentId)) : [],
    lessonNotes: account.permissions.viewLessonLogs ? db.lessonNotes.filter((item) => lessonIds.has(item.lessonId) || studentIds.has(item.studentId)) : [],
    rooms: account.permissions.viewReservations ? db.rooms : [],
    reservations: account.permissions.viewReservations ? db.reservations.filter((item) => account.role !== "student" || item.studentId === studentId) : [],
    payments: account.permissions.viewPayments ? db.payments.filter((item) => account.role !== "student" || item.studentId === studentId) : [],
    tasks: account.permissions.manageOperations ? db.tasks : [],
    workLogs: account.permissions.viewTeam ? visibleWorkLogs(account) : [],
    meetings: account.permissions.viewMeetings ? visibleMeetings(account) : [],
    calendarEvents: account.permissions.viewCalendar ? visibleCalendarEvents(account) : [],
    accountRequests: account.permissions.reviewAccountRequests ? publicAccountRequests() : [],
    publicSettings: db.publicSettings || {},
    notices: db.notices.filter((notice) => notice.active && notice.targetRoles.includes(account.role)),
    dashboardWorkQueue: dashboardWorkQueueFor(account, consultations)
  };
}

function visibleWorkLogs(account) {
  return account.permissions.manageOperations ? db.workLogs : db.workLogs.filter((item) => item.accountId === account.id);
}

function visibleMeetings(account) {
  const meetings = account.permissions.manageOperations ? db.meetings : db.meetings.filter((item) => Array.isArray(item.participantIds) && item.participantIds.includes(account.id));
  return meetings.map((item) => ({
    ...item,
    participantNames: (item.participantIds || []).map((id) => db.accounts.find((accountItem) => accountItem.id === id)?.name || id),
    participant_names: (item.participantIds || []).map((id) => db.accounts.find((accountItem) => accountItem.id === id)?.name || id).join(",")
  }));
}

function visibleCalendarEvents(account) {
  if (account.permissions.manageOperations) return db.calendarEvents;
  return db.calendarEvents.filter((item) => !Array.isArray(item.targetRoles) || item.targetRoles.includes(account.role));
}

function dashboardWorkQueueFor(account, consultations) {
  const items = consultations
    .filter((item) => item.status !== "종결")
    .map((item) => {
      const unread = Array.isArray(item.unreadForAccountIds) && item.unreadForAccountIds.includes(account.id);
      return {
        id: `work-${item.id}`,
        kind: "상담요청",
        sourceType: "consultationRequests",
        sourceId: item.id,
        title: unread ? "미확인 상담요청" : item.status === "전달 필요" ? "상담요청 전달 필요" : "상담요청 확인",
        ownerName: item.studentName,
        href: `/consultations?request=${encodeURIComponent(item.id)}`,
        priority: unread ? "urgent" : item.status === "전달 필요" ? "high" : "normal",
        tone: unread ? "danger" : item.status === "전달 필요" ? "warn" : "default",
        status: item.status,
        dueAt: item.followUpDate
      };
    });

  if (account.permissions.viewAccounts) {
    const linkedStudentIds = new Set(db.accounts.filter((item) => item.role === "student").map((item) => item.linkedStudentId).filter(Boolean));
    for (const student of db.students.filter((item) => !linkedStudentIds.has(item.id))) {
      items.push({
        id: `work-account-${student.id}`,
        kind: "계정",
        sourceType: "accounts",
        sourceId: student.id,
        title: "수강생 계정 생성 필요",
        ownerName: student.name,
        href: `/accounts?student=${encodeURIComponent(student.id)}#create-account`,
        priority: "normal",
        tone: "warn",
        status: "미연결",
        dueAt: ""
      });
    }
  }

  return items;
}

function publicAccounts() {
  return db.accounts.map(({ password, ...account }) => account);
}

function publicAccountRequests() {
  return (db.accountRequests || []).map(({ requestedPassword, ...request }) => request);
}

function createAccountRequest(response, body) {
  const input = body.request || body.accountRequest || body;
  const loginId = stringValue(input.loginId).toLowerCase();
  const name = stringValue(input.name);
  const requestedRole = stringValue(input.requestedRole || input.role || "student");
  if (!["manager", "teacher", "student"].includes(requestedRole)) return sendJson(response, 400, { ok: false, error: "Unsupported requested role." });
  if (!loginId || !name) return sendJson(response, 400, { ok: false, error: "Account request requires name and loginId." });
  if (db.accounts.some((account) => account.loginId.toLowerCase() === loginId)) return sendJson(response, 409, { ok: false, error: "Account loginId already exists." });
  if ((db.accountRequests || []).some((request) => request.loginId.toLowerCase() === loginId && request.status === "대기")) return sendJson(response, 409, { ok: false, error: "Account request already exists." });
  const now = new Date().toISOString();
  const request = {
    id: `account-request-${randomUUID()}`,
    loginId,
    name,
    requestedRole,
    email: stringValue(input.email),
    phone: stringValue(input.phone),
    linkedStudentId: stringValue(input.linkedStudentId || input.linked_student_id),
    message: stringValue(input.message),
    status: "대기",
    reviewedBy: "",
    reviewedByName: "",
    reviewedAt: "",
    reviewMemo: "",
    createdAccountId: "",
    createdAt: now,
    updatedAt: now
  };
  db.accountRequests = Array.isArray(db.accountRequests) ? db.accountRequests : [];
  db.accountRequests.unshift(request);
  addAuditLog(systemActor(), "request_account", "accountRequest", request.id, request.name, {
    requestedRole: request.requestedRole,
    loginId: request.loginId
  });
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: request });
}

function reviewAccountRequest(response, actor, requestId, body) {
  const request = (db.accountRequests || []).find((item) => item.id === decodeURIComponent(requestId));
  if (!request) return sendJson(response, 404, { ok: false, error: "Account request not found." });
  if (request.status !== "대기") return sendJson(response, 400, { ok: false, error: "Account request was already reviewed." });
  const review = body.review || body;
  const decision = stringValue(review.decision || review.status || "approve");
  const now = new Date().toISOString();
  if (decision === "reject" || decision === "반려") {
    request.status = "반려";
    request.reviewMemo = stringValue(review.memo);
    request.reviewedBy = actor.id;
    request.reviewedByName = actor.name;
    request.reviewedAt = now;
    request.updatedAt = now;
    addAccountHistory(actor, { id: request.id, name: request.name, role: request.requestedRole }, "reject_account_request", null, null, { loginId: request.loginId, memo: request.reviewMemo });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: request });
  }

  const role = stringValue(review.role || request.requestedRole);
  const linkedStudentId = stringValue(review.linkedStudentId || request.linkedStudentId);
  const initialPassword = stringValue(review.initialPassword || body.initialPassword);
  if (!isValidPassword(initialPassword)) return sendJson(response, 400, { ok: false, error: `Initial password must be at least ${passwordMinLength} characters.` });
  if (role === "student" && !linkedStudentId) return sendJson(response, 400, { ok: false, error: "Student account request requires linkedStudentId before approval." });
  if (role === "student" && !db.students.some((student) => student.id === linkedStudentId)) return sendJson(response, 400, { ok: false, error: "Linked student was not found." });
  if (db.accounts.some((account) => account.loginId.toLowerCase() === request.loginId.toLowerCase())) return sendJson(response, 409, { ok: false, error: "Account loginId already exists." });
  if (role === "student" && db.accounts.some((account) => account.role === "student" && account.linkedStudentId === linkedStudentId && account.status !== "paused")) {
    return sendJson(response, 409, { ok: false, error: "Student already has an active account." });
  }
  const student = db.students.find((item) => item.id === linkedStudentId);
  const account = {
    id: `account-${randomUUID()}`,
    loginId: request.loginId,
    name: request.name,
    role,
    email: request.email,
    phone: request.phone,
    linkedStudentId: role === "student" ? linkedStudentId : "",
    linkedStudentName: role === "student" ? student?.name || "" : "",
    status: "invited",
    mustChangePassword: true,
    permissions: permissionsFor(role),
    lastLoginAt: "",
    createdAt: now,
    password: hashPassword(initialPassword)
  };
  db.accounts.unshift(account);
  request.status = "승인";
  request.reviewedBy = actor.id;
  request.reviewedByName = actor.name;
  request.reviewedAt = now;
  request.reviewMemo = stringValue(review.memo);
  request.createdAccountId = account.id;
  request.updatedAt = now;
  addAccountHistory(actor, account, "approve_account_request", null, null, { requestId: request.id, loginId: request.loginId });
  saveDatabase();
  const { password, ...publicAccount } = account;
  return sendJson(response, 200, { ok: true, data: { request, account: publicAccount } });
}

function createAccount(response, actor, body) {
  const input = body.account || body;
  const role = stringValue(input.role);
  const loginId = stringValue(input.loginId).toLowerCase();
  const name = stringValue(input.name);
  const initialPassword = stringValue(input.initialPassword);
  const linkedStudentId = stringValue(input.linkedStudentId || input.linked_student_id);
  if (!["owner", "manager", "teacher", "student"].includes(role)) return sendJson(response, 400, { ok: false, error: "Unsupported role." });
  if (!loginId) return sendJson(response, 400, { ok: false, error: "Account loginId is required." });
  if (!name) return sendJson(response, 400, { ok: false, error: "Account name is required." });
  if (db.accounts.some((account) => account.loginId.toLowerCase() === loginId)) return sendJson(response, 409, { ok: false, error: "Account loginId already exists." });
  if (!isValidPassword(initialPassword)) return sendJson(response, 400, { ok: false, error: `Initial password must be at least ${passwordMinLength} characters.` });
  if (role === "student" && !linkedStudentId) return sendJson(response, 400, { ok: false, error: "Student account requires linkedStudentId." });
  if (role === "student" && !db.students.some((student) => student.id === linkedStudentId || student.student_id === linkedStudentId)) {
    return sendJson(response, 400, { ok: false, error: "Student account requires an existing linked student." });
  }
  if (role === "student" && db.accounts.some((account) => account.role === "student" && account.linkedStudentId === linkedStudentId && account.status !== "paused")) {
    return sendJson(response, 409, { ok: false, error: "Student already has an active account." });
  }

  const account = {
    id: `account-${randomUUID()}`,
    loginId,
    name,
    role,
    email: stringValue(input.email),
    phone: stringValue(input.phone),
    linkedStudentId,
    linkedStudentName: db.students.find((student) => student.id === linkedStudentId)?.name || "",
    status: "invited",
    mustChangePassword: true,
    permissions: permissionsFor(role),
    lastLoginAt: "",
    createdAt: new Date().toISOString(),
    password: hashPassword(initialPassword)
  };
  db.accounts.unshift(account);
  addAccountHistory(actor, account, "create_account");
  saveDatabase();
  const { password, ...publicAccount } = account;
  return sendJson(response, 200, { ok: true, data: publicAccount });
}

function updateAccountStatus(response, actor, accountId, body) {
  const account = findAccount(response, accountId);
  if (!account) return;
  if (isSelfAccountMutation(response, actor, account)) return;
  account.status = body.active === false ? "paused" : "active";
  const invalidatedSessions = invalidateAccountSessions(account.id);
  addAccountHistory(actor, account, account.status === "paused" ? "pause_account" : "activate_account", null, null, { invalidatedSessions });
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: true });
}

function resetAccountPassword(response, actor, accountId, body) {
  const account = findAccount(response, accountId);
  if (!account) return;
  if (isSelfAccountMutation(response, actor, account)) return;
  const password = stringValue(body.password);
  if (!isValidPassword(password)) return sendJson(response, 400, { ok: false, error: `Temporary password must be at least ${passwordMinLength} characters.` });
  account.password = hashPassword(password);
  account.mustChangePassword = true;
  const invalidatedSessions = invalidateAccountSessions(account.id);
  addAccountHistory(actor, account, "reset_password", null, null, { invalidatedSessions });
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: true });
}

function updateAccountPermissions(response, actor, accountId, body) {
  const account = findAccount(response, accountId);
  if (!account) return;
  if (isSelfAccountMutation(response, actor, account)) return;
  const beforePermissions = { ...account.permissions };
  account.permissions = { ...permissionsFor(account.role), ...(body.permissions || {}) };
  const invalidatedSessions = invalidateAccountSessions(account.id);
  addAccountHistory(actor, account, "update_permissions", beforePermissions, account.permissions, { invalidatedSessions });
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: true });
}

function handleAction(response, account, action, body) {
  if (action === "createStudent") {
    if (!account.permissions.manageStudents) return sendJson(response, 403, { ok: false, error: "Student management permission is required." });
    const input = body.student || body;
    const name = stringValue(input.name);
    if (!name) return sendJson(response, 400, { ok: false, error: "Student name is required." });
    const student = {
      id: `student-${randomUUID()}`,
      student_id: "",
      name,
      birthDate: stringValue(input.birthDate || input.birth_date),
      birth_date: stringValue(input.birthDate || input.birth_date),
      phone: stringValue(input.phone),
      major: stringValue(input.major),
      goal: stringValue(input.goal),
      status: normalizeServerStudentStatus(input.status),
      enrolledAt: new Date().toISOString().slice(0, 10),
      enrolled_at: new Date().toISOString().slice(0, 10),
      memo: stringValue(input.memo),
      teacherId: stringValue(input.teacherId || input.teacher_id),
      teacher_id: stringValue(input.teacherId || input.teacher_id),
      teacherName: stringValue(input.teacherName || input.teacher_name),
      teacher_name: stringValue(input.teacherName || input.teacher_name)
    };
    student.student_id = student.id;
    db.students.unshift(student);
    addAuditLog(account, "create_student", "student", student.id, student.name, {
      status: student.status,
      teacherId: student.teacherId
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: student });
  }

  if (action === "createTeacher") {
    if (!account.permissions.manageOperations) return sendJson(response, 403, { ok: false, error: "Operations management permission is required." });
    const input = body.teacher || body;
    const name = stringValue(input.name);
    if (!name) return sendJson(response, 400, { ok: false, error: "Teacher name is required." });
    const teacher = {
      id: `teacher-${randomUUID()}`,
      teacher_id: "",
      name,
      major: stringValue(input.major),
      memo: stringValue(input.memo)
    };
    teacher.teacher_id = teacher.id;
    db.teachers.unshift(teacher);
    addAuditLog(account, "create_teacher", "teacher", teacher.id, teacher.name, {
      major: teacher.major
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: teacher });
  }

  if (action === "createEnrollment") {
    if (!account.permissions.manageOperations) return sendJson(response, 403, { ok: false, error: "Operations management permission is required." });
    const input = body.enrollment || body;
    const student = findStudentByValue(input.student_id || input.studentId || input.student);
    if (!student) return sendJson(response, 400, { ok: false, error: "Enrollment requires a valid student." });
    const teacher = findTeacherByValue(input.teacher_id || input.teacherId || input.teacher);
    if (!teacher) return sendJson(response, 400, { ok: false, error: "Enrollment requires a valid teacher." });
    const course = findOrCreateCourse(input.subject || input.course_id || input.courseId || input.course, teacher?.id || "");
    const startDate = stringValue(input.startDate || input.start_date || new Date().toISOString().slice(0, 10));
    const enrollment = {
      id: `enroll-${randomUUID()}`,
      enrollment_id: "",
      studentId: student.id,
      student_id: student.id,
      studentName: student.name,
      student_name: student.name,
      courseId: course.id,
      class_type_id: course.id,
      subject: course.name,
      teacherId: teacher?.id || "",
      teacher_id: teacher?.id || "",
      teacherName: teacher?.name || "",
      teacher_name: teacher?.name || "",
      startDate,
      start_date: startDate,
      status: normalizeServerEnrollmentStatus(input.status),
      memo: stringValue(input.memo)
    };
    enrollment.enrollment_id = enrollment.id;
    db.enrollments.unshift(enrollment);
    addAuditLog(account, "create_enrollment", "enrollment", enrollment.id, student.name, {
      courseId: enrollment.courseId,
      teacherId: enrollment.teacherId,
      status: enrollment.status
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: enrollment });
  }

  if (action === "createLesson") {
    if (!account.permissions.manageOperations) return sendJson(response, 403, { ok: false, error: "Operations management permission is required." });
    const input = body.lesson || body;
    const student = findStudentByValue(input.student_id || input.studentId || input.student);
    if (!student) return sendJson(response, 400, { ok: false, error: "Lesson requires a valid student." });
    const teacher = findTeacherByValue(input.teacher_id || input.teacherId || input.teacher);
    if (!teacher) return sendJson(response, 400, { ok: false, error: "Lesson requires a valid teacher." });
    const course = findOrCreateCourse(input.subject || input.course_id || input.courseId || input.course, teacher.id);
    const lessonDate = stringValue(input.lesson_date || input.date || new Date().toISOString().slice(0, 10));
    const startTime = stringValue(input.start_time || input.startTime || "00:00");
    const duration = numberValue(input.duration || input.duration_minutes, 60);
    const lesson = {
      id: `lesson-${randomUUID()}`,
      lesson_id: "",
      studentId: student.id,
      student_id: student.id,
      studentName: student.name,
      student_name: student.name,
      teacherId: teacher.id,
      teacher_id: teacher.id,
      teacherName: teacher.name,
      teacher_name: teacher.name,
      courseId: course.id,
      course_id: course.id,
      subject: course.name,
      lessonDate,
      lesson_date: lessonDate,
      startTime,
      start_time: startTime,
      startsAt: toKoreaDateTime(lessonDate, startTime),
      duration,
      duration_minutes: duration,
      status: stringValue(input.status, "예정"),
      memo: stringValue(input.memo || input.room)
    };
    lesson.lesson_id = lesson.id;
    db.lessons.unshift(lesson);
    db.attendance.unshift({
      id: `att-${randomUUID()}`,
      lessonId: lesson.id,
      lesson_id: lesson.id,
      studentId: student.id,
      student_id: student.id,
      status: "미처리",
      makeupNeeded: false,
      makeup_needed: false,
      memo: lesson.memo
    });
    addAuditLog(account, "create_lesson", "lesson", lesson.id, `${student.name} ${lessonDate}`, {
      teacherId: teacher.id,
      courseId: course.id
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: lesson });
  }

  if (action === "createLessonLog") {
    if (!account.permissions.writeLessonLogs) return sendJson(response, 403, { ok: false, error: "Lesson log write permission is required." });
    const input = body.log || body;
    const student = findStudentByValue(input.student_id || input.studentId || input.student);
    if (!student) return sendJson(response, 400, { ok: false, error: "Lesson note requires a valid student." });
    const requestedTeacher = findTeacherByValue(input.teacher_id || input.teacherId || input.teacher || account.id);
    const teacher = account.role === "teacher" ? findTeacherByValue(account.id) : requestedTeacher;
    if (!teacher) return sendJson(response, 400, { ok: false, error: "Lesson note requires a valid teacher." });
    if (account.role === "teacher" && teacher.id !== account.id) return sendJson(response, 403, { ok: false, error: "Teacher accounts can only write their own lesson notes." });
    if (account.role === "teacher" && student.teacherId && student.teacherId !== account.id) return sendJson(response, 403, { ok: false, error: "Teacher accounts can only write notes for assigned students." });
    const lessonDate = stringValue(input.lesson_date || input.date || new Date().toISOString().slice(0, 10));
    const lesson = db.lessons.find((item) => item.studentId === student.id && item.teacherId === teacher.id && stringValue(item.lessonDate || item.lesson_date || item.startsAt).startsWith(lessonDate));
    if (!lesson) return sendJson(response, 400, { ok: false, error: "Lesson note requires an existing lesson for the student, teacher, and date." });
    const content = stringValue(input.content || input.lesson_content);
    if (!content) return sendJson(response, 400, { ok: false, error: "Lesson note content is required." });
    const nextGoal = stringValue(input.nextGoal || input.next_goal);
    const practiceRequest = stringValue(input.practiceRequest || input.practice_request);
    const internalMemo = stringValue(input.internalMemo || input.internal_memo);
    const note = {
      id: `note-${randomUUID()}`,
      log_id: "",
      lessonId: lesson.id,
      lesson_id: lesson.id,
      studentId: student.id,
      student_id: student.id,
      studentName: student.name,
      student_name: student.name,
      teacherId: teacher.id,
      teacher_id: teacher.id,
      teacherName: teacher.name,
      teacher_name: teacher.name,
      date: lessonDate,
      lesson_date: lessonDate,
      content,
      lesson_content: content,
      homework: stringValue(input.homework),
      nextGoal,
      next_goal: nextGoal,
      practiceRequest,
      practice_request: practiceRequest,
      internalMemo,
      internal_memo: internalMemo
    };
    note.log_id = note.id;
    db.lessonNotes.unshift(note);
    lesson.status = "완료";
    addAuditLog(account, "create_lesson_log", "lessonNote", note.id, student.name, {
      lessonId: note.lessonId,
      teacherId: teacher.id
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: note });
  }

  if (action === "updateAttendance") {
    if (!account.permissions.writeLessonLogs && !account.permissions.manageOperations) return sendJson(response, 403, { ok: false, error: "Attendance write permission is required." });
    const input = body.attendance || body;
    const lesson = findLessonByValue(input.lesson_id || input.lessonId || input.lesson);
    if (!lesson) return sendJson(response, 400, { ok: false, error: "Attendance requires a valid lesson." });
    const student = findStudentByValue(input.student_id || input.studentId || input.student || lesson?.studentId);
    if (!student) return sendJson(response, 400, { ok: false, error: "Attendance requires a valid student." });
    if (lesson.studentId !== student.id) return sendJson(response, 400, { ok: false, error: "Attendance student must match the lesson student." });
    if (account.role === "teacher") {
      const lessonTeacherId = lesson?.teacherId || student.teacherId;
      if (lessonTeacherId && lessonTeacherId !== account.id) return sendJson(response, 403, { ok: false, error: "Teacher accounts can only update attendance for assigned lessons." });
    }
    const status = stringValue(input.status, "출석");
    const existing = db.attendance.find((item) => (lesson && item.lessonId === lesson.id) || (!lesson && item.studentId === student.id && item.status === "미처리"));
    const attendance = existing || {
      id: `att-${randomUUID()}`,
      attendance_id: "",
      lessonId: lesson?.id || "",
      lesson_id: lesson?.id || "",
      studentId: student.id,
      student_id: student.id,
      status: "",
      makeupNeeded: false,
      makeup_needed: false,
      memo: ""
    };
    attendance.attendance_id = attendance.attendance_id || attendance.id;
    attendance.lessonId = lesson?.id || attendance.lessonId;
    attendance.lesson_id = attendance.lessonId;
    attendance.studentId = student.id;
    attendance.student_id = student.id;
    attendance.status = status;
    attendance.makeupNeeded = booleanValue(input.makeupNeeded || input.makeup_needed) || ["결석", "취소", "보강예정"].includes(status);
    attendance.makeup_needed = attendance.makeupNeeded;
    attendance.memo = stringValue(input.memo);
    if (!existing) db.attendance.unshift(attendance);
    if (lesson) lesson.status = status === "출석" || status === "지각" ? "완료" : status;
    addAuditLog(account, "update_attendance", "attendance", attendance.id, student.name, {
      lessonId: attendance.lessonId,
      status: attendance.status,
      makeupNeeded: attendance.makeupNeeded
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: attendance });
  }

  if (action === "createReservation") {
    const input = body.reservation || body;
    const purpose = stringValue(input.purpose || "연습");
    const requiresLessonPermission = purpose !== "연습";
    if (requiresLessonPermission && !account.permissions.reserveLessonRoom) return sendJson(response, 403, { ok: false, error: "Lesson room reservation permission is required." });
    if (!requiresLessonPermission && !account.permissions.reservePracticeRoom) return sendJson(response, 403, { ok: false, error: "Practice room reservation permission is required." });
    const room = findRoomByValue(input.room_id || input.roomId || input.room);
    if (!room) return sendJson(response, 400, { ok: false, error: "Reservation requires a valid room." });
    const reservationDate = stringValue(input.reservation_date || input.date);
    const startTime = stringValue(input.start_time || input.startTime);
    const endTime = stringValue(input.end_time || input.endTime);
    if (!reservationDate || !startTime || !endTime) return sendJson(response, 400, { ok: false, error: "Reservation date and time are required." });
    const startsAt = toKoreaDateTime(reservationDate, startTime);
    const endsAt = toKoreaDateTime(reservationDate, endTime);
    if (startsAt >= endsAt) return sendJson(response, 400, { ok: false, error: "Reservation end time must be after start time." });
    const overlaps = db.reservations.some((item) => item.roomId === room.id && item.startsAt < endsAt && item.endsAt > startsAt && item.status !== "취소");
    if (overlaps) return sendJson(response, 409, { ok: false, error: "Selected room slot is already reserved." });
    const student = account.role === "student" ? findStudentByValue(account.linkedStudentId) : findStudentByValue(input.student_id || input.studentId || input.student);
    if (account.role === "student" && !student) return sendJson(response, 400, { ok: false, error: "Student reservation requires a linked student record." });
    if (account.role !== "student" && (input.student_id || input.studentId || input.student) && !student) return sendJson(response, 400, { ok: false, error: "Reservation student reference is invalid." });
    const reservation = {
      id: `reserve-${randomUUID()}`,
      reservation_id: "",
      roomId: room.id,
      room_id: room.id,
      roomName: room.name,
      room_name: room.name,
      studentId: student?.id || account.id,
      reserved_by: student?.id || account.id,
      studentName: student?.name || account.name,
      reserved_by_name: student?.name || account.name,
      requester: account.name,
      reservationDate,
      reservation_date: reservationDate,
      startTime,
      start_time: startTime,
      endTime,
      end_time: endTime,
      startsAt,
      endsAt,
      status: "예약",
      purpose,
      memo: stringValue(input.memo)
    };
    reservation.reservation_id = reservation.id;
    db.reservations.unshift(reservation);
    addAuditLog(account, "create_reservation", "reservation", reservation.id, room.name, {
      startsAt,
      endsAt,
      purpose
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: reservation });
  }

  if (action === "createRegistration") {
    if (!account.permissions.manageOperations || !account.permissions.viewPayments) return sendJson(response, 403, { ok: false, error: "Payment management permission is required." });
    const input = body.registration || body;
    const student = findStudentByValue(input.student_id || input.studentId || input.student);
    if (!student) return sendJson(response, 400, { ok: false, error: "Registration requires a valid student." });
    const title = stringValue(input.registration_type || input.registrationType || input.title || "등록·결제");
    const status = stringValue(input.payment_status || input.status, "청구예정");
    const dueDate = stringValue(input.next_due_date || input.nextDueDate || input.period_start || input.periodStart);
    const paidAt = stringValue(input.paid_at || input.paidAt);
    const payment = {
      id: `payment-${randomUUID()}`,
      registration_id: "",
      studentId: student.id,
      student_id: student.id,
      studentName: student.name,
      student_name: student.name,
      title,
      program_name: title,
      amount: numberValue(input.amount, 0),
      status,
      payment_status: status,
      dueDate,
      next_due_date: dueDate,
      paidAt,
      paid_at: paidAt,
      memo: stringValue(input.memo)
    };
    payment.registration_id = payment.id;
    db.payments.unshift(payment);
    addAuditLog(account, "create_registration", "payment", payment.id, student.name, {
      amount: payment.amount,
      status: payment.status
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: payment });
  }

  if (action === "createTask") {
    if (!account.permissions.manageOperations) return sendJson(response, 403, { ok: false, error: "Operations management permission is required." });
    const input = body.task || body;
    const assignee = findAccountByValue(input.assignee_id || input.assigneeId || input.assignee) || account;
    const task = {
      id: `task-${randomUUID()}`,
      task_id: "",
      title: stringValue(input.title),
      assignee: assignee.name,
      assigneeId: assignee.id,
      assignee_id: assignee.id,
      assigneeName: assignee.name,
      assignee_name: assignee.name,
      dueDate: stringValue(input.dueDate || input.due_date),
      due_date: stringValue(input.dueDate || input.due_date),
      status: stringValue(input.status, "할일"),
      priority: stringValue(input.priority, "보통"),
      memo: stringValue(input.memo)
    };
    if (!task.title) return sendJson(response, 400, { ok: false, error: "Task title is required." });
    task.task_id = task.id;
    db.tasks.unshift(task);
    addAuditLog(account, "create_task", "task", task.id, task.title, {
      assigneeId: assignee.id,
      status: task.status
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: task });
  }

  if (action === "clockWork") {
    if (!account.permissions.clockWork) return sendJson(response, 403, { ok: false, error: "Work clock permission is required." });
    const input = body.workLog || body;
    const workDate = stringValue(input.workDate || input.work_date || new Date().toISOString().slice(0, 10));
    const openLog = db.workLogs.find((item) => item.accountId === account.id && item.workDate === workDate && !item.clockOutAt);
    if (openLog) {
      openLog.clockOutAt = new Date().toISOString();
      openLog.clock_out_at = openLog.clockOutAt;
      openLog.memo = stringValue(input.memo || openLog.memo);
      addAuditLog(account, "clock_out", "workLog", openLog.id, account.name, { workDate });
      saveDatabase();
      return sendJson(response, 200, { ok: true, data: openLog });
    }
    const workLog = {
      id: `work-log-${randomUUID()}`,
      work_log_id: "",
      accountId: account.id,
      account_id: account.id,
      accountName: account.name,
      account_name: account.name,
      workDate,
      work_date: workDate,
      clockInAt: new Date().toISOString(),
      clock_in_at: "",
      clockOutAt: "",
      clock_out_at: "",
      memo: stringValue(input.memo)
    };
    workLog.work_log_id = workLog.id;
    workLog.clock_in_at = workLog.clockInAt;
    db.workLogs.unshift(workLog);
    addAuditLog(account, "clock_in", "workLog", workLog.id, account.name, { workDate });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: workLog });
  }

  if (action === "createMeeting") {
    if (!account.permissions.manageMeetings) return sendJson(response, 403, { ok: false, error: "Meeting management permission is required." });
    const input = body.meeting || body;
    const title = stringValue(input.title);
    if (!title) return sendJson(response, 400, { ok: false, error: "Meeting title is required." });
    const participantIds = stringList(input.participantIds || input.participant_ids).filter((id) => db.accounts.some((item) => item.id === id && item.role !== "student"));
    if (!participantIds.includes(account.id)) participantIds.push(account.id);
    const meeting = {
      id: `meeting-${randomUUID()}`,
      meeting_id: "",
      title,
      startsAt: stringValue(input.startsAt || input.starts_at || toKoreaDateTime(stringValue(input.date || new Date().toISOString().slice(0, 10)), stringValue(input.startTime || input.start_time || "10:00"))),
      starts_at: "",
      participantIds,
      participant_ids: participantIds.join(","),
      createdBy: account.id,
      created_by: account.id,
      status: stringValue(input.status || "예정"),
      memo: stringValue(input.memo)
    };
    meeting.meeting_id = meeting.id;
    meeting.starts_at = meeting.startsAt;
    db.meetings.unshift(meeting);
    addAuditLog(account, "create_meeting", "meeting", meeting.id, meeting.title, { participantIds });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: meeting });
  }

  if (action === "createCalendarEvent") {
    if (!account.permissions.manageCalendar) return sendJson(response, 403, { ok: false, error: "Calendar management permission is required." });
    const input = body.calendarEvent || body.event || body;
    const title = stringValue(input.title);
    if (!title) return sendJson(response, 400, { ok: false, error: "Calendar event title is required." });
    const targetRoles = stringList(input.targetRoles || input.target_roles || "owner,manager,teacher,student").filter((role) => ["owner", "manager", "teacher", "student"].includes(role));
    const event = {
      id: `calendar-${randomUUID()}`,
      calendar_event_id: "",
      title,
      date: stringValue(input.date || new Date().toISOString().slice(0, 10)),
      startTime: stringValue(input.startTime || input.start_time),
      start_time: stringValue(input.startTime || input.start_time),
      targetRoles: targetRoles.length ? targetRoles : ["owner", "manager", "teacher", "student"],
      target_roles: (targetRoles.length ? targetRoles : ["owner", "manager", "teacher", "student"]).join(","),
      createdBy: account.id,
      created_by: account.id,
      memo: stringValue(input.memo)
    };
    event.calendar_event_id = event.id;
    db.calendarEvents.unshift(event);
    addAuditLog(account, "create_calendar_event", "calendarEvent", event.id, event.title, { targetRoles: event.targetRoles });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: event });
  }

  if (action === "updatePublicSettings") {
    if (!account.permissions.managePublicSettings) return sendJson(response, 403, { ok: false, error: "Public settings permission is required." });
    const input = body.publicSettings || body.settings || body;
    db.publicSettings = {
      ...(db.publicSettings || {}),
      loginNotice: stringValue(input.loginNotice ?? db.publicSettings?.loginNotice),
      academyPhone: stringValue(input.academyPhone ?? db.publicSettings?.academyPhone),
      reservationGuide: stringValue(input.reservationGuide ?? db.publicSettings?.reservationGuide),
      updatedAt: new Date().toISOString(),
      updatedBy: account.id
    };
    addAuditLog(account, "update_public_settings", "publicSettings", "public-settings", "운영 환경 설정", db.publicSettings);
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: db.publicSettings });
  }

  if (action === "createConsultation") {
    const input = body.consultation || body;
    const consultation = {
      id: `consult-${randomUUID()}`,
      studentId: account.role === "student" ? account.linkedStudentId : stringValue(input.studentId),
      studentName: stringValue(input.studentName || account.name),
      guardianName: stringValue(input.guardianName),
      phone: stringValue(input.phone),
      channel: stringValue(input.channel || "Version.3"),
      major: stringValue(input.major),
      goal: stringValue(input.goal || "상담요청"),
      date: new Date().toISOString().slice(0, 10),
      followUpDate: stringValue(input.followUpDate),
      status: "접수됨",
      priority: stringValue(input.priority || "보통"),
      memo: stringValue(input.memo),
      assignedTo: "manager-1",
      assignedToName: "조영진",
      statusUpdatedAt: new Date().toISOString(),
      unreadForAccountIds: notificationAccountIds(["owner", "manager"], account.id)
    };
    if (!consultation.goal && !consultation.memo) return sendJson(response, 400, { ok: false, error: "Consultation request requires a message." });
    if (account.role === "student" && !findStudentByValue(account.linkedStudentId)) return sendJson(response, 400, { ok: false, error: "Student consultation requires a linked student record." });
    if (account.role !== "student" && consultation.studentId && !findStudentByValue(consultation.studentId)) return sendJson(response, 400, { ok: false, error: "Consultation student reference is invalid." });
    db.consultations.unshift(consultation);
    db.consultationHistory.unshift({
      id: `consult-history-${randomUUID()}`,
      consultationId: consultation.id,
      actorId: account.id,
      actorName: account.name,
      action: "create_consultation",
      status: consultation.status,
      assignedTo: consultation.assignedTo,
      assignedToName: consultation.assignedToName,
      occurredAt: new Date().toISOString()
    });
    addAuditLog(account, "create_consultation", "consultationRequest", consultation.id, consultation.studentName, {
      status: consultation.status,
      assignedTo: consultation.assignedTo
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: consultation });
  }

  if (action === "acknowledgeConsultation") {
    const consultation = db.consultations.find((item) => item.id === body.consultationId);
    if (!consultation) return sendJson(response, 404, { ok: false, error: "Consultation not found." });
    if (!canReadConsultation(account, consultation)) return sendJson(response, 403, { ok: false, error: "Consultation access is required." });
    consultation.unreadForAccountIds = (consultation.unreadForAccountIds || []).filter((accountId) => accountId !== account.id);
    db.consultationHistory.unshift({
      id: `consult-history-${randomUUID()}`,
      consultationId: consultation.id,
      actorId: account.id,
      actorName: account.name,
      action: "acknowledge_consultation",
      status: consultation.status,
      assignedTo: consultation.assignedTo,
      assignedToName: consultation.assignedToName,
      occurredAt: new Date().toISOString()
    });
    addAuditLog(account, "acknowledge_consultation", "consultationRequest", consultation.id, consultation.studentName, {
      status: consultation.status
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: consultation });
  }

  if (action === "updateConsultationStatus") {
    if (!account.permissions.manageOperations) return sendJson(response, 403, { ok: false, error: "Consultation triage permission is required." });
    const consultation = db.consultations.find((item) => item.id === body.consultationId);
    if (!consultation) return sendJson(response, 404, { ok: false, error: "Consultation not found." });
    const nextStatus = normalizeServerConsultationStatus(body.status || consultation.status);
    if (!nextStatus) return sendJson(response, 400, { ok: false, error: "Unsupported consultation status." });
    const nextAssignee = Object.prototype.hasOwnProperty.call(body, "assignedTo") ? stringValue(body.assignedTo) : consultation.assignedTo;
    const assignee = nextAssignee ? findConsultationAssignee(nextAssignee) : null;
    if (nextAssignee && !assignee) return sendJson(response, 400, { ok: false, error: "Consultation assignee must be an owner, manager, or teacher account." });
    consultation.status = nextStatus;
    consultation.assignedTo = nextAssignee;
    consultation.assignedToName = assignee?.name || "";
    consultation.statusUpdatedAt = new Date().toISOString();
    consultation.unreadForAccountIds = unreadAfterConsultationUpdate(consultation, account.id, nextAssignee);
    db.consultationHistory.unshift({
      id: `consult-history-${randomUUID()}`,
      consultationId: consultation.id,
      actorId: account.id,
      actorName: account.name,
      action: "update_consultation_status",
      status: consultation.status,
      assignedTo: consultation.assignedTo,
      assignedToName: consultation.assignedToName,
      occurredAt: consultation.statusUpdatedAt
    });
    addAuditLog(account, "update_consultation_status", "consultationRequest", consultation.id, consultation.studentName, {
      status: consultation.status,
      assignedTo: consultation.assignedTo
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: consultation });
  }

  if (action === "createNotice") {
    if (!account.permissions.manageNotices) return sendJson(response, 403, { ok: false, error: "Notice permission is required." });
    const input = body.notice || body;
    const notice = {
      id: `notice-${randomUUID()}`,
      title: stringValue(input.title),
      category: stringValue(input.category || "공지"),
      author: account.name,
      body: stringValue(input.body),
      targetRoles: Array.isArray(input.targetRoles) ? input.targetRoles : ["owner", "manager", "teacher", "student"],
      pinned: Boolean(input.pinned),
      active: true,
      updatedAt: new Date().toISOString()
    };
    if (!notice.title || !notice.body) return sendJson(response, 400, { ok: false, error: "Notice title and body are required." });
    notice.targetRoles = notice.targetRoles.filter((role) => ["owner", "manager", "teacher", "student"].includes(role));
    if (!notice.targetRoles.length) return sendJson(response, 400, { ok: false, error: "Notice requires at least one valid target role." });
    db.notices.unshift(notice);
    addAuditLog(account, "create_notice", "notice", notice.id, notice.title, {
      targetRoles: notice.targetRoles,
      pinned: notice.pinned
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: notice });
  }

  return sendJson(response, 404, { ok: false, error: `Unsupported Version.3 action: ${action}` });
}

function dataQualityReport() {
  const linkedStudentIds = new Set(db.accounts.filter((account) => account.role === "student").map((account) => account.linkedStudentId).filter(Boolean));
  const studentIds = new Set(db.students.map((student) => student.id));
  const teacherIds = new Set([
    ...db.teachers.map((teacher) => teacher.id),
    ...db.accounts.filter((account) => account.role === "teacher").map((account) => account.id)
  ]);
  const lessonIds = new Set(db.lessons.map((lesson) => lesson.id));
  const roomIds = new Set(db.rooms.map((room) => room.id));
  const brokenReferenceCount =
    db.enrollments.filter((item) => !studentIds.has(item.studentId) || !teacherIds.has(item.teacherId)).length +
    db.lessons.filter((item) => !studentIds.has(item.studentId) || !teacherIds.has(item.teacherId)).length +
    db.attendance.filter((item) => !lessonIds.has(item.lessonId) || !studentIds.has(item.studentId)).length +
    db.lessonNotes.filter((item) => !lessonIds.has(item.lessonId) || !studentIds.has(item.studentId) || !teacherIds.has(item.teacherId)).length +
    db.reservations.filter((item) => !roomIds.has(item.roomId) || (item.studentId && item.studentId.startsWith("student-") && !studentIds.has(item.studentId))).length +
    db.payments.filter((item) => !studentIds.has(item.studentId)).length;
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      accounts: db.accounts.length,
      students: db.students.length,
      accountRequests: (db.accountRequests || []).filter((item) => item.status === "대기").length,
      workLogs: (db.workLogs || []).length,
      meetings: (db.meetings || []).length,
      calendarEvents: (db.calendarEvents || []).length,
      studentsWithoutAccounts: db.students.filter((student) => !linkedStudentIds.has(student.id)).length,
      auditLogs: (db.auditLogs || []).length,
      openConsultations: db.consultations.filter((item) => item.status !== "종결").length,
      brokenReferences: brokenReferenceCount,
      backupEnabled
    },
    checks: [
      { id: "student-account-links", label: "Student account links", status: "warn", count: db.students.filter((student) => !linkedStudentIds.has(student.id)).length },
      { id: "reference-integrity", label: "Reference integrity", status: brokenReferenceCount ? "warn" : "good", count: brokenReferenceCount },
      { id: "notice-targets", label: "Notice targets", status: "good", count: db.notices.filter((notice) => notice.active && notice.targetRoles.length).length },
      { id: "audit-logs", label: "Audit logs", status: (db.auditLogs || []).length ? "good" : "warn", count: (db.auditLogs || []).length },
      { id: "open-consultations", label: "Open consultations", status: "good", count: db.consultations.filter((item) => item.status !== "종결").length },
      { id: "account-requests", label: "Account requests", status: (db.accountRequests || []).some((item) => item.status === "대기") ? "warn" : "good", count: (db.accountRequests || []).filter((item) => item.status === "대기").length }
    ]
  };
}

function healthReport() {
  return {
    service: "bonsung-version3-server",
    status: "ok",
    checkedAt: new Date().toISOString(),
    persistence: {
      enabled: persistenceEnabled,
      backupEnabled
    },
    cors: {
      restricted: !allowedOrigins.includes("*")
    }
  };
}

function dataExport(account) {
  return {
    exportedAt: new Date().toISOString(),
    exportedBy: {
      accountId: account.id,
      name: account.name,
      role: account.role
    },
    schema: "bonsung-version3-local-v1",
    persistence: {
      enabled: persistenceEnabled,
      backupEnabled,
      dataFile: persistenceEnabled ? dataFilePath : "memory"
    },
    data: sanitizeDatabaseExport(db)
  };
}

function exportData(response, account) {
  addAuditLog(account, "export_data", "system", "data-export", "Version.3 data export", {
    schema: "bonsung-version3-local-v1",
    backupEnabled,
    dataFile: persistenceEnabled ? dataFilePath : "memory"
  });
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: dataExport(account) });
}

function listDataBackups(response) {
  return sendJson(response, 200, {
    ok: true,
    data: {
      backupEnabled,
      persistenceEnabled,
      dataFile: persistenceEnabled ? basename(dataFilePath) : "memory",
      backups: backupEntries()
    }
  });
}

function importData(response, request, account, body) {
  const payload = body.export || body;
  if (payload.schema !== "bonsung-version3-local-v1") return sendJson(response, 400, { ok: false, error: "Unsupported Version.3 import schema." });
  if (!payload.data || typeof payload.data !== "object") return sendJson(response, 400, { ok: false, error: "Version.3 import data is required." });

  const imported = migrateDatabase(createSeedData(), payload.data);
  const passwordResult = hydrateImportedAccountPasswords(imported.accounts || [], stringValue(body.temporaryPassword));
  if (!passwordResult.ok) return sendJson(response, 400, { ok: false, error: passwordResult.error });

  replaceDatabase(imported);
  addAuditLog(account, "import_data", "system", "data-import", "Version.3 data import", {
    schema: payload.schema,
    importedAccounts: imported.accounts.length,
    importedStudents: imported.students.length,
    temporaryPasswordApplied: passwordResult.temporaryPasswordApplied
  });
  saveDatabase();
  keepOnlySession(readBearerToken(request), account.id);
  return sendJson(response, 200, {
    ok: true,
    data: {
      importedAt: new Date().toISOString(),
      importedBy: { accountId: account.id, name: account.name, role: account.role },
      summary: {
        accounts: imported.accounts.length,
        students: imported.students.length,
        auditLogs: imported.auditLogs.length
      },
      temporaryPasswordApplied: passwordResult.temporaryPasswordApplied
    }
  });
}

function sanitizeDatabaseExport(snapshot) {
  return {
    ...snapshot,
    accounts: snapshot.accounts.map(({ password, ...account }) => account),
    sessions: []
  };
}

function backupEntries() {
  if (!persistenceEnabled || !backupEnabled || !existsSync(dirname(dataFilePath))) return [];
  const directory = dirname(dataFilePath);
  const prefix = `${basename(dataFilePath)}.`;
  return readdirSync(directory)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".bak"))
    .map((name) => {
      const stats = statSync(resolve(directory, name));
      return {
        name,
        sizeBytes: stats.size,
        createdAt: stats.mtime.toISOString()
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function hydrateImportedAccountPasswords(accounts, temporaryPassword) {
  const currentAccounts = new Map();
  for (const account of db.accounts || []) {
    currentAccounts.set(account.id, account);
    currentAccounts.set(account.loginId, account);
  }
  let temporaryPasswordApplied = 0;
  for (const account of accounts) {
    const currentAccount = currentAccounts.get(account.id) || currentAccounts.get(account.loginId);
    if (currentAccount?.password) {
      account.password = currentAccount.password;
      account.mustChangePassword = Boolean(account.mustChangePassword);
      continue;
    }
    if (!isValidPassword(temporaryPassword)) {
      return { ok: false, error: `Temporary password must be at least ${passwordMinLength} characters for imported accounts without preserved passwords.` };
    }
    account.password = hashPassword(temporaryPassword);
    account.mustChangePassword = true;
    account.status = account.status === "paused" ? "paused" : "invited";
    temporaryPasswordApplied += 1;
  }
  return { ok: true, temporaryPasswordApplied };
}

function replaceDatabase(snapshot) {
  for (const key of Object.keys(db)) delete db[key];
  Object.assign(db, snapshot);
}

function requirePermission(response, account, key, callback) {
  if (account.role !== "owner" && !account.permissions[key]) return sendJson(response, 403, { ok: false, error: `${key} permission is required.` });
  return callback();
}

function requireOwner(response, account, callback) {
  if (account.role !== "owner") return sendJson(response, 403, { ok: false, error: "Owner permission is required." });
  return callback();
}

function isSelfAccountMutation(response, actor, targetAccount) {
  if (actor.id !== targetAccount.id) return false;
  sendJson(response, 400, { ok: false, error: "Use profile settings for your own account. Self status, password reset, and permission edits are not allowed." });
  return true;
}

function canLoginAccount(account) {
  return account.status === "active" || account.status === "invited";
}

function loginThrottle(loginId) {
  const attempt = loginAttempts.get(loginId);
  if (!attempt) return { blocked: false, retryAfterSeconds: 0 };
  if (attempt.lockedUntil > Date.now()) {
    return { blocked: true, retryAfterSeconds: Math.ceil((attempt.lockedUntil - Date.now()) / 1000) };
  }
  if (attempt.firstFailedAt + loginFailureWindowMs <= Date.now()) {
    loginAttempts.delete(loginId);
  }
  return { blocked: false, retryAfterSeconds: 0 };
}

function recordLoginFailure(loginId) {
  const now = Date.now();
  const previous = loginAttempts.get(loginId);
  const attempt = previous && previous.firstFailedAt + loginFailureWindowMs > now
    ? previous
    : { count: 0, firstFailedAt: now, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= maxLoginFailures) {
    attempt.lockedUntil = now + loginFailureLockMs;
    addAuditLog(systemActor(), "login_throttled", "security", loginId || "unknown-login", loginId || "unknown-login", {
      failureCount: attempt.count,
      windowSeconds: Math.ceil(loginFailureWindowMs / 1000),
      lockSeconds: Math.ceil(loginFailureLockMs / 1000)
    });
    saveDatabase();
  }
  loginAttempts.set(loginId, attempt);
}

function clearLoginFailures(loginId) {
  loginAttempts.delete(loginId);
}

function invalidateAccountSessions(accountId, exceptToken = "") {
  let count = 0;
  for (const [token, session] of sessions.entries()) {
    if (session.accountId === accountId && token !== exceptToken) {
      sessions.delete(token);
      count += 1;
    }
  }
  return count;
}

function keepOnlySession(activeToken, accountId) {
  for (const [token, session] of sessions.entries()) {
    if (token !== activeToken || session.accountId !== accountId) sessions.delete(token);
  }
}

function hashPassword(password) {
  const salt = randomUUID().replace(/-/g, "");
  const hash = scryptSync(String(password), salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!isPasswordHash(stored)) return password === stored;
  const [, salt, expected] = stored.split("$");
  const expectedBuffer = Buffer.from(expected, "base64url");
  const actualBuffer = scryptSync(String(password), salt, expectedBuffer.length);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function isPasswordHash(value) {
  return typeof value === "string" && value.startsWith("scrypt$");
}

function isValidPassword(value) {
  return typeof value === "string" && value.length >= passwordMinLength;
}

function findAccount(response, accountId) {
  const account = db.accounts.find((item) => item.id === decodeURIComponent(accountId));
  if (!account) sendJson(response, 404, { ok: false, error: "Account not found." });
  return account;
}

function normalizeServerConsultationStatus(value) {
  const status = stringValue(value);
  if (["접수됨", "확인 중", "전달 필요", "종결"].includes(status)) return status;
  return "";
}

function normalizeServerStudentStatus(value) {
  const status = stringValue(value);
  if (["상담중", "등록대기", "재원", "휴원", "퇴원"].includes(status)) return status;
  if (status === "active") return "재원";
  if (status === "pending") return "등록대기";
  return status || "상담중";
}

function normalizeServerEnrollmentStatus(value) {
  const status = stringValue(value);
  if (["수강중", "휴원", "종료", "취소", "등록대기"].includes(status)) return status;
  if (status === "active") return "수강중";
  if (status === "paused") return "휴원";
  if (status === "completed") return "종료";
  if (status === "canceled") return "취소";
  return status || "수강중";
}

function findConsultationAssignee(accountId) {
  const account = db.accounts.find((item) => item.id === accountId && item.status === "active" && ["owner", "manager", "teacher"].includes(item.role));
  if (account) return account;
  const teacher = db.teachers.find((item) => item.id === accountId);
  return teacher ? { id: teacher.id, name: teacher.name } : null;
}

function findAccountByValue(value) {
  const text = stringValue(value);
  if (!text) return null;
  return db.accounts.find((item) => item.id === text || item.loginId === text || item.name === text) || null;
}

function findStudentByValue(value) {
  const text = stringValue(value);
  if (!text) return null;
  return db.students.find((item) => item.id === text || item.student_id === text || item.name === text) || null;
}

function findTeacherByValue(value) {
  const text = stringValue(value);
  if (!text) return null;
  const teacher = db.teachers.find((item) => item.id === text || item.name === text);
  if (teacher) return teacher;
  const teacherAccount = db.accounts.find((item) => item.id === text && item.role === "teacher");
  return teacherAccount ? { id: teacherAccount.id, name: teacherAccount.name, major: "" } : null;
}

function findLessonByValue(value) {
  const text = stringValue(value);
  if (!text) return null;
  return db.lessons.find((item) => item.id === text || item.lesson_id === text || item.startsAt === text) || null;
}

function findRoomByValue(value) {
  const text = stringValue(value);
  if (!text) return null;
  return db.rooms.find((item) => item.id === text || item.room_id === text || item.name === text) || null;
}

function findOrCreateCourse(value, teacherId) {
  const text = stringValue(value, "일반 수업");
  const existing = db.courses.find((item) => item.id === text || item.name === text || item.major === text);
  if (existing) return existing;
  const course = {
    id: `course-${randomUUID()}`,
    name: text,
    major: text,
    teacherId,
    status: "운영중"
  };
  db.courses.unshift(course);
  return course;
}

function notificationAccountIds(roles, excludeAccountId = "") {
  return db.accounts
    .filter((item) => item.status === "active" && roles.includes(item.role) && item.id !== excludeAccountId)
    .map((item) => item.id);
}

function unreadAfterConsultationUpdate(consultation, actorId, assignedTo) {
  const unreadIds = new Set(Array.isArray(consultation.unreadForAccountIds) ? consultation.unreadForAccountIds : []);
  unreadIds.delete(actorId);
  const targetAccount = db.accounts.find((item) => item.id === assignedTo && item.status === "active" && ["owner", "manager", "teacher"].includes(item.role));
  if (targetAccount && targetAccount.id !== actorId) unreadIds.add(targetAccount.id);
  return Array.from(unreadIds);
}

function canReadConsultation(account, consultation) {
  if (account.permissions.manageOperations) return true;
  if (account.role === "student") return consultation.studentId === account.linkedStudentId;
  if (account.role === "teacher") return consultation.assignedTo === account.id;
  return false;
}

function addAccountHistory(actor, account, action, beforePermissions, afterPermissions, metadata = {}) {
  db.accountHistory.unshift({
    id: `account-history-${randomUUID()}`,
    accountId: account.id,
    accountName: account.name,
    actorId: actor.id,
    actorName: actor.name,
    action,
    role: account.role,
    beforePermissions,
    afterPermissions,
    metadata,
    occurredAt: new Date().toISOString()
  });
  addAuditLog(actor, action, "account", account.id, account.name, {
    role: account.role,
    beforePermissions,
    afterPermissions,
    ...metadata
  });
}

function addAuditLog(actor, action, targetType, targetId, targetName, metadata = {}) {
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  db.auditLogs.unshift({
    id: `audit-${randomUUID()}`,
    actorId: actor.id,
    actorName: actor.name,
    action,
    targetType,
    targetId,
    targetName,
    metadata,
    createdAt: new Date().toISOString()
  });
}

function systemActor() {
  return { id: "system", name: "Version.3 Server" };
}

function assertServerRuntimeSafe() {
  const publicHost = !["127.0.0.1", "localhost", "::1"].includes(host);
  const productionMode = process.env.NODE_ENV === "production" || publicHost;
  if (!productionMode) return;
  if (testPassword === "version3") {
    throw new Error("Set VERSION3_LOCAL_SERVER_PASSWORD to a non-default value before running a public Version.3 server.");
  }
  if (allowedOrigins.includes("*")) {
    throw new Error("Set VERSION3_ALLOWED_ORIGINS to the official Version.3 UI origin before running a public Version.3 server.");
  }
  if (!persistenceEnabled) {
    throw new Error("Set VERSION3_LOCAL_DATA_FILE to a persistent file before running a public Version.3 server.");
  }
  if (!backupEnabled) {
    throw new Error("Keep Version.3 data backups enabled before running a public Version.3 server.");
  }
}

function serverUser(account, sessionExpiresAt = "") {
  return {
    accountId: account.id,
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    linkedStudentId: account.linkedStudentId,
    mustChangePassword: account.mustChangePassword,
    sessionExpiresAt,
    permissions: account.permissions
  };
}

function permissionsFor(role) {
  return { ...(permissionSets[role] || permissionSets.manager) };
}

function loadDatabase() {
  const seed = createSeedData();
  if (!persistenceEnabled) return seed;
  if (!existsSync(dataFilePath)) {
    saveDatabaseSnapshot(seed);
    return seed;
  }

  const parsed = JSON.parse(readFileSync(dataFilePath, "utf8"));
  const migrated = migrateDatabase(seed, parsed);
  if (migrateAccountPasswords(migrated)) saveDatabaseSnapshot(migrated);
  return migrated;
}

function migrateDatabase(seed, stored) {
  const migrated = { ...seed, ...(stored && typeof stored === "object" ? stored : {}) };
  for (const [key, value] of Object.entries(seed)) {
    if (!Array.isArray(migrated[key])) migrated[key] = Array.isArray(value) ? [...value] : value;
  }
  migrated.auditLogs = Array.isArray(migrated.auditLogs) ? migrated.auditLogs : [];
  migrated.accountHistory = Array.isArray(migrated.accountHistory) ? migrated.accountHistory : [];
  migrated.consultationHistory = Array.isArray(migrated.consultationHistory) ? migrated.consultationHistory : [];
  return migrated;
}

function migrateAccountPasswords(snapshot) {
  let changed = false;
  for (const account of snapshot.accounts || []) {
    if (typeof account.password !== "string" || account.password === "") {
      account.password = hashPassword(testPassword);
      changed = true;
    } else if (!isPasswordHash(account.password)) {
      account.password = hashPassword(account.password);
      changed = true;
    }
  }
  return changed;
}

function saveDatabase() {
  if (!persistenceEnabled) return;
  saveDatabaseSnapshot(db);
}

function saveDatabaseSnapshot(snapshot) {
  mkdirSync(dirname(dataFilePath), { recursive: true });
  if (backupEnabled && existsSync(dataFilePath)) {
    copyFileSync(dataFilePath, backupPathFor(dataFilePath));
  }
  const tempPath = `${dataFilePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
  renameSync(tempPath, dataFilePath);
}

function backupPathFor(path) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${path}.${stamp}.bak`;
}

function createSeedData() {
  const accounts = [
    createSeedAccount("owner-1", "owner", "강은미", "owner", ""),
    createSeedAccount("manager-1", "manager", "조영진", "manager", ""),
    createSeedAccount("teacher-1", "teacher", "황휘현", "teacher", ""),
    createSeedAccount("student-1-account", "student", "장윤호", "student", "student-jang-yunho", "장윤호")
  ];

  return {
    accounts,
    accountHistory: [
      { id: "account-history-1", accountId: "manager-1", accountName: "조영진", actorId: "owner-1", actorName: "강은미", action: "create_account", role: "manager", occurredAt: "2026-07-01T09:10:00+09:00" }
    ],
    accountRequests: [
      { id: "account-request-1", loginId: "kimtaeji", name: "(신) 김태지", requestedRole: "student", email: "", phone: "", linkedStudentId: "student-kim-taeji-new", message: "Notion 수강생 DB에서 등록 상태가 확인 필요인 신규 수강생입니다. 계정 생성 전 상담/등록 확정 여부 확인이 필요합니다.", status: "대기", reviewedBy: "", reviewedByName: "", reviewedAt: "", reviewMemo: "", createdAccountId: "", createdAt: "2026-07-02T10:10:00+09:00", updatedAt: "2026-07-02T10:10:00+09:00" }
    ],
    auditLogs: [
      { id: "audit-1", actorId: "owner-1", actorName: "강은미", action: "create_account", targetType: "account", targetId: "manager-1", targetName: "조영진", metadata: { role: "manager" }, createdAt: "2026-07-01T09:10:00+09:00" }
    ],
    teachers: [
      ...bonsungInitialTeachers
    ],
    students: [
      ...bonsungInitialStudents
    ],
    guardians: [],
    consultations: [
      ...bonsungInitialConsultations
    ],
    consultationHistory: [
      ...bonsungInitialConsultationHistory
    ],
    courses: [
      ...bonsungInitialCourses
    ],
    enrollments: [
      { id: "enroll-1", studentId: "student-jang-yunho", courseId: "course-precollege", teacherId: "teacher-unassigned", startDate: "", status: "등록 확정", memo: "Notion 수강생 DB 기준 등록 확정. 실제 프로그램/담당 강사 배정 필요. 화면 기능 확인용 임시 연결값입니다." }
    ],
    lessons: [
      { id: "lesson-1", studentId: "student-jang-yunho", teacherId: "teacher-unassigned", courseId: "course-precollege", startsAt: "2026-08-18T14:00:00+09:00", duration: 60, status: "배정필요", memo: "초기 이관 데이터 점검용 수업. 실제 시간표 확정 전까지 임시값입니다." }
    ],
    attendance: [
      { id: "att-1", lessonId: "lesson-1", studentId: "student-jang-yunho", status: "미처리", makeupNeeded: false, memo: "초기 이관 데이터 점검" }
    ],
    lessonNotes: [
      { id: "note-1", lessonId: "lesson-1", studentId: "student-jang-yunho", teacherId: "teacher-unassigned", date: "2026-08-18", content: "초기 이관 데이터 확인", homework: "프로그램과 담당 강사 배정 확인", nextGoal: "실제 수업 시작일 입력", practiceRequest: "", internalMemo: "Notion 수강생 DB 기반" }
    ],
    rooms: [
      { id: "room-1", name: "A Vocal Room", location: "2F", capacity: 2, status: "사용가능" }
    ],
    reservations: [
      { id: "reserve-1", roomId: "room-1", studentId: "student-jang-yunho", requester: "조영진", startsAt: "2026-08-18T18:00:00+09:00", endsAt: "2026-08-18T19:00:00+09:00", status: "예약", memo: "초기 점검용 예약" }
    ],
    payments: [
      ...bonsungInitialPayments
    ],
    tasks: [
      ...bonsungInitialDocumentTasks
    ],
    workLogs: [
      { id: "work-log-1", work_log_id: "work-log-1", accountId: "manager-1", account_id: "manager-1", accountName: "조영진", account_name: "조영진", workDate: "2026-07-01", work_date: "2026-07-01", clockInAt: "2026-07-01T09:05:00+09:00", clock_in_at: "2026-07-01T09:05:00+09:00", clockOutAt: "", clock_out_at: "", memo: "초기 운영 준비" }
    ],
    meetings: [
      { id: "meeting-1", meeting_id: "meeting-1", title: "초기 운영 데이터 점검 회의", startsAt: "2026-08-01T10:00:00+09:00", starts_at: "2026-08-01T10:00:00+09:00", participantIds: ["owner-1", "manager-1", "teacher-1"], participant_ids: "owner-1,manager-1,teacher-1", createdBy: "manager-1", created_by: "manager-1", status: "예정", memo: "수강생 배정, 상담 흐름, 결제 확인 항목 점검" }
    ],
    calendarEvents: [
      ...bonsungInitialCalendarEvents
    ],
    publicSettings: {
      loginNotice: "계정 요청 및 패스워드 초기화는 매니저에게 문의 바랍니다.",
      academyPhone: "",
      reservationGuide: "공간 예약은 정각부터 1시간 단위로 신청합니다.",
      updatedAt: "2026-07-01T00:00:00+09:00",
      updatedBy: "owner-1"
    },
    notices: [
      ...bonsungInitialNotices
    ]
  };
}

function createSeedAccount(id, loginId, name, role, linkedStudentId, linkedStudentName = "") {
  return {
    id,
    loginId,
    name,
    role,
    email: `${loginId}@bonsung.local`,
    phone: "",
    linkedStudentId,
    linkedStudentName,
    status: "active",
    mustChangePassword: false,
    permissions: permissionsFor(role),
    lastLoginAt: "",
    createdAt: "2026-07-01T00:00:00+09:00",
    password: hashPassword(testPassword)
  };
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Request body must be JSON."));
      }
    });
    request.on("error", reject);
  });
}

function stringValue(value) {
  return value == null ? "" : String(value).trim();
}

function stringList(value) {
  if (Array.isArray(value)) return value.map((item) => stringValue(item)).filter(Boolean);
  return stringValue(value).split(/[,|]/).map((item) => item.trim()).filter(Boolean);
}

function numberValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value) {
  return value === true || value === "true" || value === "TRUE" || value === "1" || value === 1 || value === "예";
}

function toKoreaDateTime(date, time) {
  const normalizedTime = stringValue(time).length === 5 ? `${stringValue(time)}:00` : stringValue(time);
  return `${date}T${normalizedTime || "00:00:00"}+09:00`;
}

function setCors(request, response) {
  const origin = request.headers.origin || "";
  const allowedOrigin = allowedOrigins.includes("*")
    ? "*"
    : allowedOrigins.includes(origin)
      ? origin
      : "";
  if (allowedOrigin) response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function send(response, status, body) {
  response.writeHead(status);
  response.end(body);
}
