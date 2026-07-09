import { createServer } from "node:http";
import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
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
import { appsScriptSyncStatus, markAppsScriptSyncPending, runAppsScriptOutboxSync } from "./stage-apps-script-sync.mjs";
import { createStageStorageAdapter, hashSessionToken } from "./stage-storage.mjs";

const port = Number(process.env.BONSUNG_LOCAL_SERVER_PORT || process.env.PORT || 4303);
const host = (process.env.BONSUNG_SERVER_HOST || "127.0.0.1").trim() || "127.0.0.1";
const testPassword = process.env.BONSUNG_LOCAL_SERVER_PASSWORD || "bonsung1";
const adminInitialPassword = process.env.BONSUNG_ADMIN_INITIAL_PASSWORD || "bonsung_2020_03";
const adminCredentialVersion = "2026-07-09-admin-canonical";
const dataFileSetting = (process.env.BONSUNG_LOCAL_DATA_FILE || ".stage-local-data.json").trim();
const storage = await createStageStorageAdapter({
  driver: process.env.BONSUNG_STORAGE_DRIVER,
  databaseUrl: process.env.BONSUNG_DATABASE_URL,
  dataFileSetting,
  backupEnabled: process.env.BONSUNG_DISABLE_LOCAL_BACKUPS !== "true"
});
const persistenceEnabled = storage.persistenceEnabled;
const dataFilePath = storage.dataFilePath;
const backupEnabled = storage.backupEnabled;
const storageSessionsEnabled = storage.mode === "postgres" || storage.mode === "google-sheets";
const sessionTtlHours = Math.max(1, Number(process.env.BONSUNG_SESSION_TTL_HOURS || 12));
const allowedOrigins = (process.env.BONSUNG_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const passwordMinLength = 8;
const loginFailureWindowMs = 10 * 60 * 1000;
const loginFailureLockMs = 5 * 60 * 1000;
const maxLoginFailures = 5;

const permissionSets = {
  admin: {
    manageAccounts: true, resetPasswords: true, viewAccounts: true, manageOperations: true, manageNotices: true, managePermissions: true,
    manageMeetings: true, manageCalendar: true, viewPayments: true, clockWork: true, viewStudents: true,
    manageStudents: true, viewLessonLogs: true, writeLessonLogs: true, viewReservations: true, manageReservations: true,
    reserveLessonRoom: true, reservePracticeRoom: true, viewTeam: true, viewMeetings: true, viewCalendar: true,
    reviewAccountRequests: true, managePublicSettings: true
  },
  manager: {
    manageAccounts: true, resetPasswords: true, viewAccounts: true, manageOperations: true, manageNotices: true, managePermissions: false,
    manageMeetings: true, manageCalendar: true, viewPayments: true, clockWork: true, viewStudents: true,
    manageStudents: true, viewLessonLogs: true, writeLessonLogs: true, viewReservations: true, manageReservations: true,
    reserveLessonRoom: true, reservePracticeRoom: true, viewTeam: true, viewMeetings: true, viewCalendar: true,
    reviewAccountRequests: true, managePublicSettings: false
  },
  coach: {
    manageAccounts: false, resetPasswords: false, viewAccounts: false, manageOperations: false, manageNotices: false, managePermissions: false,
    manageMeetings: false, manageCalendar: false, viewPayments: false, clockWork: true, viewStudents: true,
    manageStudents: false, viewLessonLogs: true, writeLessonLogs: true, viewReservations: true, manageReservations: false,
    reserveLessonRoom: true, reservePracticeRoom: true, viewTeam: true, viewMeetings: true, viewCalendar: true,
    reviewAccountRequests: false, managePublicSettings: false
  },
  artist: {
    manageAccounts: false, resetPasswords: false, viewAccounts: false, manageOperations: false, manageNotices: false, managePermissions: false,
    manageMeetings: false, manageCalendar: false, viewPayments: false, clockWork: false, viewStudents: true,
    manageStudents: false, viewLessonLogs: true, writeLessonLogs: false, viewReservations: true, manageReservations: false,
    reserveLessonRoom: false, reservePracticeRoom: true, viewTeam: false, viewMeetings: false, viewCalendar: true,
    reviewAccountRequests: false, managePublicSettings: false
  }
};

const accountRoles = ["admin", "manager", "coach", "artist"];
const requestableRoles = ["manager", "coach", "artist"];
const allRoleTargets = ["admin", "manager", "coach", "artist"];

assertServerRuntimeSafe();

const db = await loadDatabase();
const sessions = new Map();
const loginAttempts = new Map();
let pendingSave = Promise.resolve();

export async function handleStageNodeRequest(request, response, options = {}) {
  try {
    setCors(request, response);
    if (request.method === "OPTIONS") return send(response, 204, "");

    const url = normalizedRequestUrl(request, options);
    const body = await readJson(request);

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { ok: true, data: healthReport() });
    }

    if ((request.method === "GET" || request.method === "POST") && url.pathname === "/sync/apps-script") {
      return syncAppsScript(response, request, body, url);
    }

    if (request.method === "POST" && url.pathname === "/account-requests") {
      return createAccountRequest(response, body);
    }

    if (request.method === "POST" && url.pathname === "/auth/login") {
      return await login(response, body);
    }

    const account = await authenticate(request);
    if (!account) return sendJson(response, 401, { ok: false, error: "본성 스테이지 server session is required." });

    if (request.method === "POST" && url.pathname === "/auth/logout") return await logout(response, request, account);
    if (request.method === "POST" && url.pathname === "/auth/change-password") return await changePassword(response, request, account, body);
    if (request.method === "GET" && url.pathname === "/bootstrap") return sendJson(response, 200, { ok: true, data: bootstrapFor(account) });
    if (request.method === "GET" && url.pathname === "/accounts") return await requirePermission(response, account, "viewAccounts", () => sendJson(response, 200, { ok: true, data: publicAccounts() }));
    if (request.method === "GET" && url.pathname === "/account-requests") return await requirePermission(response, account, "reviewAccountRequests", () => sendJson(response, 200, { ok: true, data: publicAccountRequests() }));
    if (request.method === "GET" && url.pathname === "/account-history") return await requirePermission(response, account, "viewAccounts", () => sendJson(response, 200, { ok: true, data: db.accountHistory }));
    if (request.method === "GET" && url.pathname === "/audit-logs") return await requirePermission(response, account, "manageOperations", () => sendJson(response, 200, { ok: true, data: db.auditLogs || [] }));
    if (request.method === "GET" && url.pathname === "/data-quality") return await requirePermission(response, account, "manageOperations", () => sendJson(response, 200, { ok: true, data: dataQualityReport() }));
    if (request.method === "GET" && url.pathname === "/sync/status") return await requirePermission(response, account, "manageOperations", async () => sendJson(response, 200, { ok: true, data: await syncStatusReport() }));
    if (request.method === "GET" && url.pathname === "/data-export") return await requirePermission(response, account, "manageOperations", () => exportData(response, account));
    if (request.method === "GET" && url.pathname === "/data-backups") return await requireAdmin(response, account, () => listDataBackups(response));
    if (request.method === "POST" && url.pathname === "/data-import") return await requireAdmin(response, account, () => importData(response, request, account, body));
    if (request.method === "POST" && url.pathname === "/accounts") return await requirePermission(response, account, "manageAccounts", () => createAccount(response, account, body));
    if (request.method === "POST" && url.pathname.startsWith("/actions/")) return handleAction(response, account, url.pathname.slice("/actions/".length), body);
    if (request.method === "PATCH" && /^\/accounts\/[^/]+\/status$/.test(url.pathname)) return await requirePermission(response, account, "manageAccounts", () => updateAccountStatus(response, account, url.pathname.split("/")[2], body));
    if (request.method === "PATCH" && /^\/accounts\/[^/]+\/password$/.test(url.pathname)) return await requirePermission(response, account, "resetPasswords", () => resetAccountPassword(response, account, url.pathname.split("/")[2], body));
    if (request.method === "PATCH" && /^\/accounts\/[^/]+\/permissions$/.test(url.pathname)) return await requirePermission(response, account, "managePermissions", () => updateAccountPermissions(response, account, url.pathname.split("/")[2], body));
    if (request.method === "PATCH" && /^\/account-requests\/[^/]+\/review$/.test(url.pathname)) return await requirePermission(response, account, "reviewAccountRequests", () => reviewAccountRequest(response, account, url.pathname.split("/")[2], body));

    return sendJson(response, 404, { ok: false, error: `Unknown 본성 스테이지 endpoint: ${url.pathname}` });
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status || 500);
    return sendJson(response, statusCode >= 400 && statusCode < 600 ? statusCode : 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

export function createStageLocalHttpServer() {
  return createServer((request, response) => handleStageNodeRequest(request, response));
}

export function startStageLocalServer() {
  const server = createStageLocalHttpServer();
  server.listen(port, host, () => {
    console.log(`본성 스테이지 server listening on http://${host}:${port}`);
    console.log(`본성 스테이지 storage driver: ${storage.mode}`);
    if (persistenceEnabled && storage.mode === "file") console.log(`본성 스테이지 local data file: ${dataFilePath}`);
  });
  return server;
}

if (isDirectExecution()) startStageLocalServer();

function normalizedRequestUrl(request, options = {}) {
  const url = new URL(request.url || "/", `http://${request.headers.host || `127.0.0.1:${port}`}`);
  const basePath = stringValue(options.basePath).replace(/\/+$/, "");
  if (basePath && (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))) {
    url.pathname = url.pathname.slice(basePath.length) || "/";
  }
  return url;
}

function isDirectExecution() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);
}

async function login(response, body) {
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

  const token = `stage-local-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000).toISOString();
  await createSession(token, { accountId: account.id, expiresAt });
  clearLoginFailures(loginId);
  if (account.status === "invited") {
    account.status = "active";
    addAccountHistory(account, account, "activate_account", null, null, { reason: "first_login" });
  }
  account.lastLoginAt = new Date().toISOString();
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: { token, expiresAt, user: serverUser(account, expiresAt) } });
}

async function authenticate(request) {
  const token = readBearerToken(request);
  const session = await readSession(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await deleteSession(token);
    return null;
  }
  return db.accounts.find((account) => account.id === session.accountId && account.status === "active") || null;
}

async function logout(response, request, account) {
  await deleteSession(readBearerToken(request));
  addAuditLog(account, "logout", "session", account.id, account.name);
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: true });
}

async function changePassword(response, request, account, body) {
  const currentPassword = stringValue(body.currentPassword);
  const newPassword = stringValue(body.newPassword);
  if (!verifyPassword(currentPassword, account.password)) return sendJson(response, 403, { ok: false, error: "Current password does not match." });
  if (!isValidPassword(newPassword)) return sendJson(response, 400, { ok: false, error: `New password must be at least ${passwordMinLength} characters.` });
  if (newPassword === currentPassword) return sendJson(response, 400, { ok: false, error: "New password must be different from the current password." });

  account.password = hashPassword(newPassword);
  account.mustChangePassword = false;
  const invalidatedSessions = await invalidateAccountSessions(account.id, readBearerToken(request));
  addAuditLog(account, "change_password", "account", account.id, account.name, { invalidatedSessions });
  saveDatabase();
  const session = await readSession(readBearerToken(request));
  return sendJson(response, 200, { ok: true, data: { user: serverUser(account, session?.expiresAt || "") } });
}

function readBearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

async function createSession(token, session) {
  sessions.set(token, session);
  if (storageSessionsEnabled) await storage.createSession(hashSessionToken(token), session);
}

async function readSession(token) {
  if (!token) return null;
  if (storageSessionsEnabled) return storage.readSession(hashSessionToken(token));
  return sessions.get(token) || null;
}

async function deleteSession(token) {
  if (!token) return 0;
  sessions.delete(token);
  return storageSessionsEnabled ? storage.deleteSession(hashSessionToken(token)) : 1;
}

function bootstrapFor(account) {
  const studentId = account.role === "artist" ? account.linkedStudentId : "";
  const teacherId = account.role === "coach" ? account.id : "";
  const students = account.role === "artist"
    ? db.students.filter((student) => student.id === studentId)
    : account.role === "coach"
      ? db.students.filter((student) => student.teacherId === teacherId)
      : db.students;
  const studentIds = new Set(students.map((student) => student.id));
  const lessons = db.lessons.filter((lesson) => {
    if (account.role === "artist") return lesson.studentId === studentId;
    if (account.role === "coach") return lesson.teacherId === teacherId;
    return true;
  });
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const consultations = db.consultations.filter((item) => {
    if (account.role === "artist") return item.studentId === studentId;
    if (account.role === "coach") return item.assignedTo === teacherId || studentIds.has(item.studentId);
    return true;
  });

  return {
    teachers: account.permissions.viewTeam ? db.teachers : [],
    students: account.permissions.viewStudents ? visibleStudents(account, students) : [],
    guardians: account.permissions.viewStudents ? visibleGuardians(account, db.guardians.filter((guardian) => studentIds.has(guardian.studentId))) : [],
    consultations,
    consultationHistory: db.consultationHistory.filter((item) => consultations.some((consultation) => consultation.id === item.consultationId)),
    courses: db.courses,
    enrollments: account.role === "artist" ? [] : db.enrollments.filter((item) => studentIds.size === 0 || studentIds.has(item.studentId) || account.role === "admin" || account.role === "manager"),
    lessons,
    attendance: account.permissions.viewLessonLogs ? db.attendance.filter((item) => lessonIds.has(item.lessonId) || studentIds.has(item.studentId)) : [],
    lessonNotes: visibleLessonNotes(account, lessonIds, studentIds),
    rooms: account.permissions.viewReservations ? db.rooms : [],
    reservations: account.permissions.viewReservations ? db.reservations.filter((item) => account.role !== "artist" || item.studentId === studentId) : [],
    payments: account.permissions.viewPayments ? db.payments.filter((item) => account.role !== "artist" || item.studentId === studentId) : [],
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
    const linkedStudentIds = new Set(db.accounts.filter((item) => item.role === "artist").map((item) => item.linkedStudentId).filter(Boolean));
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
  const requestedRole = normalizeServerRole(input.requestedRole || input.role || "artist");
  if (!requestableRoles.includes(requestedRole)) return sendJson(response, 400, { ok: false, error: "Unsupported requested role." });
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

  const role = normalizeServerRole(review.role || request.requestedRole);
  const linkedStudentId = stringValue(review.linkedStudentId || request.linkedStudentId);
  const initialPassword = stringValue(review.initialPassword || body.initialPassword);
  if (!isValidPassword(initialPassword)) return sendJson(response, 400, { ok: false, error: `Initial password must be at least ${passwordMinLength} characters.` });
  if (role === "artist" && !linkedStudentId) return sendJson(response, 400, { ok: false, error: "Artist account request requires linkedStudentId before approval." });
  if (role === "artist" && !db.students.some((student) => student.id === linkedStudentId)) return sendJson(response, 400, { ok: false, error: "Linked student was not found." });
  if (db.accounts.some((account) => account.loginId.toLowerCase() === request.loginId.toLowerCase())) return sendJson(response, 409, { ok: false, error: "Account loginId already exists." });
  if (role === "artist" && db.accounts.some((account) => account.role === "artist" && account.linkedStudentId === linkedStudentId && account.status !== "paused")) {
    return sendJson(response, 409, { ok: false, error: "Artist already has an active account." });
  }
  const student = db.students.find((item) => item.id === linkedStudentId);
  const account = {
    id: `account-${randomUUID()}`,
    loginId: request.loginId,
    name: request.name,
    role,
    email: request.email,
    phone: request.phone,
    linkedStudentId: role === "artist" ? linkedStudentId : "",
    linkedStudentName: role === "artist" ? student?.name || "" : "",
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
  const role = normalizeServerRole(input.role);
  const loginId = stringValue(input.loginId).toLowerCase();
  const name = stringValue(input.name);
  const initialPassword = stringValue(input.initialPassword);
  const linkedStudentId = stringValue(input.linkedStudentId || input.linked_student_id);
  if (!accountRoles.includes(role)) return sendJson(response, 400, { ok: false, error: "Unsupported role." });
  if (!loginId) return sendJson(response, 400, { ok: false, error: "Account loginId is required." });
  if (!name) return sendJson(response, 400, { ok: false, error: "Account name is required." });
  if (db.accounts.some((account) => account.loginId.toLowerCase() === loginId)) return sendJson(response, 409, { ok: false, error: "Account loginId already exists." });
  if (!isValidPassword(initialPassword)) return sendJson(response, 400, { ok: false, error: `Initial password must be at least ${passwordMinLength} characters.` });
  if (role === "artist" && !linkedStudentId) return sendJson(response, 400, { ok: false, error: "Artist account requires linkedStudentId." });
  if (role === "artist" && !db.students.some((student) => student.id === linkedStudentId || student.student_id === linkedStudentId)) {
    return sendJson(response, 400, { ok: false, error: "Artist account requires an existing linked student." });
  }
  if (role === "artist" && db.accounts.some((account) => account.role === "artist" && account.linkedStudentId === linkedStudentId && account.status !== "paused")) {
    return sendJson(response, 409, { ok: false, error: "Artist already has an active account." });
  }

  const account = {
    id: `account-${randomUUID()}`,
    loginId,
    name,
    role,
    email: stringValue(input.email),
    phone: stringValue(input.phone),
    linkedStudentId: role === "artist" ? linkedStudentId : "",
    linkedStudentName: role === "artist" ? db.students.find((student) => student.id === linkedStudentId)?.name || "" : "",
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

async function updateAccountStatus(response, actor, accountId, body) {
  const account = findAccount(response, accountId);
  if (!account) return;
  if (isSelfAccountMutation(response, actor, account)) return;
  account.status = body.active === false ? "paused" : "active";
  const invalidatedSessions = await invalidateAccountSessions(account.id);
  addAccountHistory(actor, account, account.status === "paused" ? "pause_account" : "activate_account", null, null, { invalidatedSessions });
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: true });
}

async function resetAccountPassword(response, actor, accountId, body) {
  const account = findAccount(response, accountId);
  if (!account) return;
  if (isSelfAccountMutation(response, actor, account)) return;
  const password = stringValue(body.password);
  if (!isValidPassword(password)) return sendJson(response, 400, { ok: false, error: `Temporary password must be at least ${passwordMinLength} characters.` });
  account.password = hashPassword(password);
  account.mustChangePassword = true;
  const invalidatedSessions = await invalidateAccountSessions(account.id);
  addAccountHistory(actor, account, "reset_password", null, null, { invalidatedSessions });
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: true });
}

async function updateAccountPermissions(response, actor, accountId, body) {
  const account = findAccount(response, accountId);
  if (!account) return;
  if (isSelfAccountMutation(response, actor, account)) return;
  const beforePermissions = { ...account.permissions };
  account.permissions = { ...permissionsFor(account.role), ...(body.permissions || {}) };
  const invalidatedSessions = await invalidateAccountSessions(account.id);
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
    const teacher = account.role === "coach" ? findTeacherByValue(account.id) : requestedTeacher;
    if (!teacher) return sendJson(response, 400, { ok: false, error: "Lesson note requires a valid teacher." });
    if (account.role === "coach" && teacher.id !== account.id) return sendJson(response, 403, { ok: false, error: "Coach accounts can only write their own lesson notes." });
    if (account.role === "coach" && student.teacherId && student.teacherId !== account.id) return sendJson(response, 403, { ok: false, error: "Coach accounts can only write notes for assigned students." });
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
    if (account.role === "coach") {
      const lessonTeacherId = lesson?.teacherId || student.teacherId;
      if (lessonTeacherId && lessonTeacherId !== account.id) return sendJson(response, 403, { ok: false, error: "Coach accounts can only update attendance for assigned lessons." });
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
    const student = account.role === "artist" ? findStudentByValue(account.linkedStudentId) : findStudentByValue(input.student_id || input.studentId || input.student);
    if (account.role === "artist" && !student) return sendJson(response, 400, { ok: false, error: "Artist reservation requires a linked student record." });
    if (account.role !== "artist" && (input.student_id || input.studentId || input.student) && !student) return sendJson(response, 400, { ok: false, error: "Reservation student reference is invalid." });
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
    const participantIds = stringList(input.participantIds || input.participant_ids).filter((id) => db.accounts.some((item) => item.id === id && item.role !== "artist"));
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
    const targetRoles = normalizeRoleList(input.targetRoles || input.target_roles);
    const event = {
      id: `calendar-${randomUUID()}`,
      calendar_event_id: "",
      title,
      date: stringValue(input.date || new Date().toISOString().slice(0, 10)),
      startTime: stringValue(input.startTime || input.start_time),
      start_time: stringValue(input.startTime || input.start_time),
      targetRoles: targetRoles.length ? targetRoles : allRoleTargets,
      target_roles: (targetRoles.length ? targetRoles : allRoleTargets).join(","),
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
      studentId: account.role === "artist" ? account.linkedStudentId : stringValue(input.studentId),
      studentName: stringValue(input.studentName || account.name),
      guardianName: stringValue(input.guardianName),
      phone: stringValue(input.phone),
      channel: stringValue(input.channel || "본성 스테이지"),
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
      unreadForAccountIds: notificationAccountIds(["manager"], account.id)
    };
    if (!consultation.goal && !consultation.memo) return sendJson(response, 400, { ok: false, error: "Consultation request requires a message." });
    if (account.role === "artist" && !findStudentByValue(account.linkedStudentId)) return sendJson(response, 400, { ok: false, error: "Artist consultation requires a linked student record." });
    if (account.role !== "artist" && consultation.studentId && !findStudentByValue(consultation.studentId)) return sendJson(response, 400, { ok: false, error: "Consultation student reference is invalid." });
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
    if (nextAssignee && !assignee) return sendJson(response, 400, { ok: false, error: "Consultation assignee must be a manager or coach account." });
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
      targetRoles: normalizeRoleList(input.targetRoles || input.target_roles),
      pinned: Boolean(input.pinned),
      active: true,
      updatedAt: new Date().toISOString()
    };
    if (!notice.title || !notice.body) return sendJson(response, 400, { ok: false, error: "Notice title and body are required." });
    notice.targetRoles = normalizeRoleList(notice.targetRoles);
    if (!notice.targetRoles.length) return sendJson(response, 400, { ok: false, error: "Notice requires at least one valid target role." });
    db.notices.unshift(notice);
    addAuditLog(account, "create_notice", "notice", notice.id, notice.title, {
      targetRoles: notice.targetRoles,
      pinned: notice.pinned
    });
    saveDatabase();
    return sendJson(response, 200, { ok: true, data: notice });
  }

  return sendJson(response, 404, { ok: false, error: `Unsupported 본성 스테이지 action: ${action}` });
}

function dataQualityReport() {
  const linkedStudentIds = new Set(db.accounts.filter((account) => account.role === "artist").map((account) => account.linkedStudentId).filter(Boolean));
  const studentIds = new Set(db.students.map((student) => student.id));
  const teacherIds = new Set([
    ...db.teachers.map((teacher) => teacher.id),
    ...db.accounts.filter((account) => account.role === "coach").map((account) => account.id)
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
    service: "bonsung-stage-server",
    status: "ok",
    checkedAt: new Date().toISOString(),
    persistence: {
      enabled: persistenceEnabled,
      backupEnabled,
      driver: storage.mode
    },
    sync: {
      appsScriptBuffered: Boolean(process.env.NEXT_PUBLIC_ENABLE_BUFFERED_APPS_SCRIPT_SYNC === "true"),
      appsScriptSyncEnabled: Boolean(process.env.BONSUNG_APPS_SCRIPT_SYNC_ENABLED === "true"),
      outboxSupported: Boolean(storage.supportsSyncOutbox)
    },
    cors: {
      restricted: !allowedOrigins.includes("*")
    }
  };
}

async function syncStatusReport() {
  return appsScriptSyncStatus(storage);
}

async function syncAppsScript(response, request, body, url) {
  const secret = stringValue(process.env.CRON_SECRET || process.env.BONSUNG_CRON_SECRET);
  const syncEnabled = ["1", "true", "yes", "on"].includes(stringValue(process.env.BONSUNG_APPS_SCRIPT_SYNC_ENABLED).toLowerCase());
  if (syncEnabled && !secret && process.env.NODE_ENV === "production") {
    return sendJson(response, 503, { ok: false, error: "CRON_SECRET is required for Apps Script sync in production." });
  }
  if (syncEnabled && secret && readBearerToken(request) !== secret) {
    return sendJson(response, 401, { ok: false, error: "Unauthorized Apps Script sync request." });
  }

  const result = await runAppsScriptOutboxSync(storage, { force: Boolean(body.force || url.searchParams.get("force") === "true") });
  return sendJson(response, 200, { ok: true, data: result });
}

function dataExport(account) {
  return {
    exportedAt: new Date().toISOString(),
    exportedBy: {
      accountId: account.id,
      name: account.name,
      role: account.role
    },
    schema: "bonsung-stage-local-v1",
    persistence: {
      enabled: persistenceEnabled,
      backupEnabled,
      storageDriver: storage.mode,
      dataFile: storage.mode === "file" ? dataFilePath : storage.mode
    },
    data: sanitizeDatabaseExport(db)
  };
}

function exportData(response, account) {
  addAuditLog(account, "export_data", "system", "data-export", "본성 스테이지 data export", {
    schema: "bonsung-stage-local-v1",
    backupEnabled,
    dataFile: persistenceEnabled ? dataFilePath : "memory"
  });
  saveDatabase();
  return sendJson(response, 200, { ok: true, data: dataExport(account) });
}

async function listDataBackups(response) {
  return sendJson(response, 200, {
    ok: true,
    data: {
      backupEnabled,
      persistenceEnabled,
      storageDriver: storage.mode,
      dataFile: storage.mode === "file" ? dataFilePath : storage.mode,
      backups: await backupEntries()
    }
  });
}

function visibleStudents(account, students) {
  if (account.role !== "coach") return students;
  return students.map(({ phone, birthDate, birth_date, memo, ...student }) => student);
}

function visibleGuardians(account, guardians) {
  if (account.role !== "coach") return guardians;
  return guardians.map(({ phone, memo, ...guardian }) => guardian);
}

function visibleLessonNotes(account, lessonIds, studentIds) {
  if (!account.permissions.viewLessonLogs) return [];
  const notes = db.lessonNotes.filter((item) => lessonIds.has(item.lessonId) || studentIds.has(item.studentId));
  if (account.role !== "artist") return notes;
  return notes.map(({ internalMemo, internal_memo, ...note }) => note);
}

async function importData(response, request, account, body) {
  const payload = body.export || body;
  if (payload.schema !== "bonsung-stage-local-v1") return sendJson(response, 400, { ok: false, error: "Unsupported 본성 스테이지 import schema." });
  if (!payload.data || typeof payload.data !== "object") return sendJson(response, 400, { ok: false, error: "본성 스테이지 import data is required." });

  const imported = migrateDatabase(createSeedData(), payload.data);
  const passwordResult = hydrateImportedAccountPasswords(imported.accounts || [], stringValue(body.temporaryPassword));
  if (!passwordResult.ok) return sendJson(response, 400, { ok: false, error: passwordResult.error });

  replaceDatabase(imported);
  addAuditLog(account, "import_data", "system", "data-import", "본성 스테이지 data import", {
    schema: payload.schema,
    importedAccounts: imported.accounts.length,
    importedStudents: imported.students.length,
    temporaryPasswordApplied: passwordResult.temporaryPasswordApplied
  });
  saveDatabase();
  await keepOnlySession(readBearerToken(request), account.id);
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

async function backupEntries() {
  return storage.listBackups();
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
  if (account.role !== "admin" && !account.permissions[key]) return sendJson(response, 403, { ok: false, error: `${key} permission is required.` });
  return callback();
}

function requireAdmin(response, account, callback) {
  if (account.role !== "admin") return sendJson(response, 403, { ok: false, error: "Admin permission is required." });
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

async function invalidateAccountSessions(accountId, exceptToken = "") {
  let count = 0;
  for (const [token, session] of sessions.entries()) {
    if (session.accountId === accountId && token !== exceptToken) {
      sessions.delete(token);
      count += 1;
    }
  }
  if (storageSessionsEnabled) {
    count += await storage.deleteAccountSessions(accountId, exceptToken ? hashSessionToken(exceptToken) : "");
  }
  return count;
}

async function keepOnlySession(activeToken, accountId) {
  for (const [token, session] of sessions.entries()) {
    if (token !== activeToken || session.accountId !== accountId) sessions.delete(token);
  }
  if (storageSessionsEnabled) await storage.keepOnlySession(hashSessionToken(activeToken), accountId);
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
  const account = db.accounts.find((item) => item.id === accountId && item.status === "active" && ["manager", "coach"].includes(item.role));
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
  const teacherAccount = db.accounts.find((item) => item.id === text && item.role === "coach");
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
  const targetAccount = db.accounts.find((item) => item.id === assignedTo && item.status === "active" && ["manager", "coach"].includes(item.role));
  if (targetAccount && targetAccount.id !== actorId) unreadIds.add(targetAccount.id);
  return Array.from(unreadIds);
}

function canReadConsultation(account, consultation) {
  if (account.permissions.manageOperations) return true;
  if (account.role === "artist") return consultation.studentId === account.linkedStudentId;
  if (account.role === "coach") return consultation.assignedTo === account.id;
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
  return { id: "system", name: "본성 스테이지 Server" };
}

function assertServerRuntimeSafe() {
  const publicHost = !["127.0.0.1", "localhost", "::1"].includes(host);
  const productionMode = process.env.NODE_ENV === "production" || publicHost;
  const runningOnVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
  if (!productionMode) return;
  if (testPassword === "bonsung1") {
    throw new Error("Set BONSUNG_LOCAL_SERVER_PASSWORD to a non-default value before running a public 본성 스테이지 server.");
  }
  if (!process.env.BONSUNG_ADMIN_INITIAL_PASSWORD) {
    throw new Error("Set BONSUNG_ADMIN_INITIAL_PASSWORD before running a public 본성 스테이지 server.");
  }
  if (allowedOrigins.includes("*")) {
    throw new Error("Set BONSUNG_ALLOWED_ORIGINS to the official 본성 스테이지 UI origin before running a public 본성 스테이지 server.");
  }
  if (runningOnVercel && !["postgres", "google-sheets"].includes(storage.mode)) {
    throw new Error("Set BONSUNG_STORAGE_DRIVER=google-sheets or postgres before running 본성 스테이지 on Vercel.");
  }
  if (!persistenceEnabled) {
    throw new Error("Set BONSUNG_LOCAL_DATA_FILE to a persistent file before running a public 본성 스테이지 server.");
  }
  if (storage.mode === "file" && !backupEnabled) {
    throw new Error("Keep 본성 스테이지 data backups enabled before running a public 본성 스테이지 server.");
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
  const normalizedRole = normalizeServerRole(role);
  return { ...(permissionSets[normalizedRole] || permissionSets.manager) };
}

function normalizeServerRole(value, fallback = "manager") {
  const role = stringValue(value).toLowerCase();
  if (role === "owner" || role === "admin" || role === "system") return "admin";
  if (role === "manager" || role === "staff") return "manager";
  if (role === "teacher" || role === "coach") return "coach";
  if (role === "student" || role === "artist") return "artist";
  return fallback;
}

function normalizeRoleList(value) {
  const roles = stringList(value).map((role) => normalizeServerRole(role, "")).filter((role) => allRoleTargets.includes(role));
  return roles.length ? Array.from(new Set(roles)) : [...allRoleTargets];
}

async function loadDatabase() {
  const seed = createSeedData();
  if (!persistenceEnabled) {
    migrateAdminInitialPassword(seed);
    return seed;
  }
  const stored = await storage.loadState();
  if (!stored) {
    migrateAdminInitialPassword(seed);
    await storage.saveState(seed);
    return seed;
  }

  const migrated = migrateDatabase(seed, stored);
  const needsMigrationSave = Boolean(migrated.__needsMigrationSave);
  delete migrated.__needsMigrationSave;
  const passwordMigrationChanged = migrateAccountPasswords(migrated);
  const adminPasswordMigrationChanged = migrateAdminInitialPassword(migrated);
  const notionSeedMigrationChanged = migrateNotionHqSeedData(migrated);
  const obsoleteSeedDataChanged = pruneObsoleteSeedData(migrated);
  if (passwordMigrationChanged || adminPasswordMigrationChanged || notionSeedMigrationChanged || obsoleteSeedDataChanged || needsMigrationSave) await storage.saveState(migrated);
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
  if (migrateRoleValues(migrated)) migrated.__needsMigrationSave = true;
  return migrated;
}


function migrateRoleValues(snapshot) {
  let changed = false;
  for (const account of snapshot.accounts || []) {
    const previousRole = account.role;
    account.role = normalizeServerRole(account.role);
    if (account.role !== previousRole) changed = true;
    const nextPermissions = { ...permissionsFor(account.role), ...(account.permissions && typeof account.permissions === "object" ? account.permissions : {}) };
    if (account.role === "manager") {
      nextPermissions.manageAccounts = true;
      nextPermissions.managePermissions = false;
      nextPermissions.managePublicSettings = false;
      nextPermissions.reviewAccountRequests = true;
      nextPermissions.resetPasswords = true;
    }
    if (account.role === "admin") Object.assign(nextPermissions, permissionsFor("admin"));
    if (account.role === "coach") Object.assign(nextPermissions, permissionsFor("coach"));
    if (account.role === "artist") Object.assign(nextPermissions, permissionsFor("artist"));
    if (JSON.stringify(account.permissions || {}) !== JSON.stringify(nextPermissions)) changed = true;
    account.permissions = nextPermissions;
  }
  for (const request of snapshot.accountRequests || []) {
    const previousRole = request.requestedRole;
    request.requestedRole = normalizeServerRole(request.requestedRole, "artist");
    if (request.requestedRole !== previousRole) changed = true;
  }
  for (const notice of snapshot.notices || []) {
    const previous = JSON.stringify(notice.targetRoles || notice.target_roles || []);
    notice.targetRoles = normalizeRoleList(notice.targetRoles || notice.target_roles);
    notice.target_roles = notice.targetRoles.join(",");
    if (JSON.stringify(notice.targetRoles) !== previous) changed = true;
  }
  for (const event of snapshot.calendarEvents || []) {
    const previous = JSON.stringify(event.targetRoles || event.target_roles || []);
    event.targetRoles = normalizeRoleList(event.targetRoles || event.target_roles);
    event.target_roles = event.targetRoles.join(",");
    if (JSON.stringify(event.targetRoles) !== previous) changed = true;
  }
  return changed;
}

function migrateNotionHqSeedData(snapshot) {
  let changed = false;
  const currentCourses = Array.isArray(snapshot.courses) ? snapshot.courses : [];
  const previousCourses = JSON.stringify(currentCourses);
  const seedCourseIds = new Set(bonsungInitialCourses.map((course) => course.id));
  snapshot.courses = [
    ...bonsungInitialCourses.map((course) => ({ ...course })),
    ...currentCourses.filter((course) => !seedCourseIds.has(course.id))
  ];
  if (JSON.stringify(snapshot.courses) !== previousCourses) changed = true;

  const currentCalendarEvents = Array.isArray(snapshot.calendarEvents) ? snapshot.calendarEvents : [];
  const previousCalendarEvents = JSON.stringify(currentCalendarEvents);
  const customCalendarEvents = currentCalendarEvents.filter((event) => {
    const id = stringValue(event.id || event.calendar_event_id);
    return !id.startsWith("calendar-opening-");
  });
  snapshot.calendarEvents = [
    ...bonsungInitialCalendarEvents.map((event) => ({ ...event })),
    ...customCalendarEvents
  ];
  if (JSON.stringify(snapshot.calendarEvents) !== previousCalendarEvents) changed = true;
  return changed;
}

function pruneObsoleteSeedData(snapshot) {
  let changed = false;
  const removeById = (key, ids) => {
    if (!Array.isArray(snapshot[key])) return;
    const removeIds = new Set(ids);
    const before = snapshot[key].length;
    snapshot[key] = snapshot[key].filter((item) => !removeIds.has(item.id));
    if (snapshot[key].length !== before) changed = true;
  };

  removeById("enrollments", ["enroll-1", "enrollment-sample-1"]);
  removeById("lessons", ["lesson-1", "lesson-sample-1"]);
  removeById("attendance", ["att-1", "attendance-sample-1"]);
  removeById("lessonNotes", ["note-1", "lesson-note-sample-1"]);
  removeById("reservations", ["reserve-1", "reservation-sample-1"]);
  removeById("rooms", ["room-1", "room-vocal-a", "room-practice-1"]);
  removeById("meetings", ["meeting-sample-1"]);
  removeById("tasks", ["task-sample-1"]);
  return changed;
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

function migrateAdminInitialPassword(snapshot) {
  if (snapshot.adminCredentialVersion === adminCredentialVersion) return false;
  const adminAccount = (snapshot.accounts || []).find((account) => account.loginId === "owner" || account.loginId === "admin" || account.id === "admin-1");
  if (!adminAccount) {
    snapshot.adminCredentialVersion = adminCredentialVersion;
    return true;
  }
  adminAccount.password = hashPassword(adminInitialPassword);
  if (!snapshot.accounts.some((account) => account !== adminAccount && account.loginId === "admin")) {
    adminAccount.loginId = "admin";
  }
  adminAccount.role = "admin";
  adminAccount.permissions = permissionsFor("admin");
  adminAccount.mustChangePassword = false;
  snapshot.adminCredentialVersion = adminCredentialVersion;
  return true;
}

function saveDatabase() {
  if (!persistenceEnabled) return Promise.resolve();
  pendingSave = pendingSave.catch(() => undefined).then(async () => {
    await storage.saveState(db);
    await markAppsScriptSyncPending(storage).catch((error) => {
      console.warn(`본성 스테이지 Apps Script sync marker failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  });
  return pendingSave;
}

function createSeedData() {
  const accounts = [
    createSeedAccount("admin-1", "admin", "시스템 관리자", "admin", "", "", adminInitialPassword),
    createSeedAccount("manager-1", "manager", "강은미", "manager", ""),
    createSeedAccount("teacher-1", "coach", "황휘현", "coach", ""),
    createSeedAccount("student-1-account", "artist", "장윤호", "artist", "student-jang-yunho", "장윤호")
  ];

  return {
    accounts,
    accountHistory: [
      { id: "account-history-1", accountId: "manager-1", accountName: "강은미", actorId: "admin-1", actorName: "시스템 관리자", action: "create_account", role: "manager", occurredAt: "2026-07-01T09:10:00+09:00" }
    ],
    accountRequests: [
      { id: "account-request-1", loginId: "kimtaeji", name: "(신) 김태지", requestedRole: "artist", email: "", phone: "", linkedStudentId: "student-kim-taeji-new", message: "Notion 수강생 DB에서 등록 상태가 확인 필요인 신규 수강생입니다. 계정 생성 전 상담/등록 확정 여부 확인이 필요합니다.", status: "대기", reviewedBy: "", reviewedByName: "", reviewedAt: "", reviewMemo: "", createdAccountId: "", createdAt: "2026-07-02T10:10:00+09:00", updatedAt: "2026-07-02T10:10:00+09:00" }
    ],
    auditLogs: [
      { id: "audit-1", actorId: "admin-1", actorName: "시스템 관리자", action: "create_account", targetType: "account", targetId: "manager-1", targetName: "강은미", metadata: { role: "manager" }, createdAt: "2026-07-01T09:10:00+09:00" }
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
    enrollments: [],
    lessons: [],
    attendance: [],
    lessonNotes: [],
    rooms: [],
    reservations: [],
    payments: [
      ...bonsungInitialPayments
    ],
    tasks: [
      ...bonsungInitialDocumentTasks
    ],
    workLogs: [
      { id: "work-log-1", work_log_id: "work-log-1", accountId: "manager-1", account_id: "manager-1", accountName: "강은미", account_name: "강은미", workDate: "2026-07-01", work_date: "2026-07-01", clockInAt: "2026-07-01T09:05:00+09:00", clock_in_at: "2026-07-01T09:05:00+09:00", clockOutAt: "", clock_out_at: "", memo: "초기 운영 준비" }
    ],
    meetings: [
      { id: "meeting-1", meeting_id: "meeting-1", title: "초기 운영 데이터 점검 회의", startsAt: "2026-08-01T10:00:00+09:00", starts_at: "2026-08-01T10:00:00+09:00", participantIds: ["manager-1", "teacher-1"], participant_ids: "manager-1,teacher-1", createdBy: "manager-1", created_by: "manager-1", status: "예정", memo: "수강생 배정, 상담 흐름, 결제 확인 항목 점검" }
    ],
    calendarEvents: [
      ...bonsungInitialCalendarEvents
    ],
    publicSettings: {
      loginNotice: "계정 요청 및 패스워드 초기화는 매니저에게 문의 바랍니다.",
      academyPhone: "",
      reservationGuide: "공간 예약은 정각부터 1시간 단위로 신청합니다.",
      updatedAt: "2026-07-01T00:00:00+09:00",
      updatedBy: "admin-1"
    },
    notices: [
      ...bonsungInitialNotices
    ]
  };
}

function createSeedAccount(id, loginId, name, role, linkedStudentId, linkedStudentName = "", password = testPassword) {
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
    password: hashPassword(password)
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

async function sendJson(response, status, payload) {
  try {
    await pendingSave;
    if (response.writableEnded) return;
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(payload));
  } catch (error) {
    if (response.writableEnded) return;
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  }
}

function send(response, status, body) {
  response.writeHead(status);
  response.end(body);
}
