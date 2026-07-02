"use client";

import { normalizeRole, type CurrentUser, type Role } from "@/lib/auth-shared";
import { PREVIEW_ROLE_KEY, SESSION_CHANGE_EVENT } from "@/lib/client-session";
import {
  accountRequests,
  attendance,
  calendarEvents,
  consultations,
  consultationHistory,
  courses,
  enrollments,
  guardians,
  lessonNotes,
  lessons,
  meetings,
  notices,
  payments,
  publicSettings,
  reservations,
  rooms,
  students,
  tasks,
  teachers,
  workLogs,
  type AccountRequest,
  type Consultation,
  type ConsultationHistory,
  type Enrollment,
  type Lesson,
  type LessonNote,
  type Notice,
  type Payment,
  type Reservation,
  type Student,
  type Task
} from "@/lib/demo-data";
import type { OperationsData } from "@/lib/operations-data";
import type {
  Version3Account,
  Version3AccountHistory,
  Version3AccountInput,
  Version3AuditLog,
  Version3Permissions
} from "@/lib/version3-server-contract";

export const VERSION3_TEST_SESSION_KEY = "bonsung_version3_test_session_v1";
export const VERSION3_TEST_DATA_KEY = "bonsung_version3_test_data_v1";
export const VERSION3_TEST_DATA_CHANGE_EVENT = "bonsung-version3-test-data-change";

type Version3TestAccount = Version3Account & { password: string };
type Version3TestSession = {
  accountId: string;
  loginId: string;
  role: Role;
  name: string;
  startedAt: string;
};

export type Version3TestData = OperationsData & {
  accounts: Version3TestAccount[];
  accountHistory: Version3AccountHistory[];
  auditLogs: Version3AuditLog[];
  backups: Array<{ id: string; createdAt: string; summary: string }>;
};

const rolePermissions: Record<Role, Version3Permissions> = {
  owner: {
    manageAccounts: true,
    viewAccounts: true,
    manageOperations: true,
    manageNotices: true,
    managePermissions: true,
    manageMeetings: true,
    manageCalendar: true,
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
    viewCalendar: true,
    reviewAccountRequests: true,
    managePublicSettings: true
  },
  manager: {
    manageAccounts: true,
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
  },
  teacher: {
    clockWork: true,
    viewStudents: true,
    viewLessonLogs: true,
    writeLessonLogs: true,
    viewReservations: true,
    reserveLessonRoom: true,
    reservePracticeRoom: true,
    viewTeam: true,
    viewMeetings: true,
    viewCalendar: true
  },
  student: {
    viewLessonLogs: true,
    viewReservations: true,
    reservePracticeRoom: true,
    viewCalendar: true
  }
};

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function initialAccounts(): Version3TestAccount[] {
  const firstStudent = students[0];
  return [
    account("owner-1", "owner", "대표 계정", "owner", "", "owner@bonsung.test"),
    account("manager-1", "manager", "매니저 계정", "manager", "", "manager@bonsung.test"),
    account("teacher-1-account", "teacher", "강사 계정", "teacher", "", "teacher@bonsung.test"),
    account("student-1-account", "student", "수강생 계정", "student", firstStudent?.id ?? "", "student@bonsung.test", firstStudent?.name)
  ];
}

function account(
  accountId: string,
  loginId: string,
  name: string,
  role: Role,
  linkedStudentId = "",
  email = "",
  linkedStudentName = ""
): Version3TestAccount {
  return {
    id: accountId,
    loginId,
    name,
    role,
    email,
    phone: "",
    linkedStudentId,
    linkedStudentName,
    status: "active",
    mustChangePassword: false,
    permissions: rolePermissions[role],
    lastLoginAt: "",
    createdAt: "2026-07-02",
    password: "bonsung1"
  };
}

function initialData(): Version3TestData {
  return {
    teachers: [...teachers],
    students: [...students],
    guardians: [...guardians],
    consultations: [...consultations],
    consultationHistory: [...consultationHistory],
    courses: [...courses],
    enrollments: [...enrollments],
    lessons: [...lessons],
    attendance: [...attendance],
    lessonNotes: [...lessonNotes],
    rooms: [...rooms],
    reservations: [...reservations],
    payments: [...payments],
    tasks: [...tasks],
    workLogs: [...workLogs],
    meetings: [...meetings],
    calendarEvents: [...calendarEvents],
    accountRequests: [...accountRequests],
    publicSettings: { ...publicSettings },
    notices: [...notices],
    dashboardWorkQueue: [],
    accounts: initialAccounts(),
    accountHistory: [
      {
        id: "test-history-1",
        accountId: "owner-1",
        accountName: "대표 계정",
        actorId: "system",
        actorName: "Version.3 테스트모드",
        action: "seed_test_accounts",
        role: "owner",
        occurredAt: now()
      }
    ],
    auditLogs: [],
    backups: []
  };
}

export function isVersion3TestModePath() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/+$/, "");
  return path.endsWith("/version3-test");
}

export function hasVersion3TestSession() {
  return Boolean(readVersion3TestSession());
}

export function readVersion3TestSession(): Version3TestSession | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const session = JSON.parse(storage.getItem(VERSION3_TEST_SESSION_KEY) || "null") as Version3TestSession | null;
    if (!session || !normalizeRole(session.role) || !session.accountId) return null;
    return session;
  } catch {
    return null;
  }
}

export function clearVersion3TestSession() {
  const storage = browserStorage();
  if (!storage) return;
  storage.removeItem(VERSION3_TEST_SESSION_KEY);
  storage.removeItem(PREVIEW_ROLE_KEY);
  notifyChange();
}

export function resetVersion3TestData() {
  const storage = browserStorage();
  if (!storage) return;
  storage.setItem(VERSION3_TEST_DATA_KEY, JSON.stringify(initialData()));
  notifyChange();
}

export function readVersion3TestData(): Version3TestData {
  const storage = browserStorage();
  if (!storage) return initialData();
  const fallback = initialData();
  try {
    const parsed = JSON.parse(storage.getItem(VERSION3_TEST_DATA_KEY) || "null") as Partial<Version3TestData> | null;
    const data = parsed ? mergeData(fallback, parsed) : fallback;
    storage.setItem(VERSION3_TEST_DATA_KEY, JSON.stringify(data));
    return data;
  } catch {
    storage.setItem(VERSION3_TEST_DATA_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

export function writeVersion3TestData(data: Version3TestData) {
  const storage = browserStorage();
  if (!storage) return;
  storage.setItem(VERSION3_TEST_DATA_KEY, JSON.stringify(data));
  notifyChange();
}

export function version3TestAccounts() {
  return readVersion3TestData().accounts.map(stripPassword);
}

export function version3TestAccountHistory() {
  return readVersion3TestData().accountHistory;
}

export function version3TestCurrentAccountId() {
  return readVersion3TestSession()?.accountId ?? "";
}

export function version3TestCurrentUser(): CurrentUser | null {
  const session = readVersion3TestSession();
  if (!session) return null;
  const data = readVersion3TestData();
  const account = data.accounts.find((item) => item.id === session.accountId);
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    linkedStudentId: account.linkedStudentId,
    mustChangePassword: account.mustChangePassword,
    permissions: account.permissions,
    sessionExpiresAt: ""
  };
}

export function version3TestLogin(loginId: string, password: string) {
  const data = readVersion3TestData();
  const account = data.accounts.find((item) => item.loginId === loginId);
  if (!account || account.password !== password) {
    throw new Error("ID 또는 PW가 맞지 않습니다.");
  }
  if (account.status === "paused") {
    throw new Error("중지된 계정입니다. 매니저에게 문의해 주세요.");
  }
  account.status = "active";
  account.lastLoginAt = now();
  const session: Version3TestSession = {
    accountId: account.id,
    loginId: account.loginId,
    role: account.role,
    name: account.name,
    startedAt: now()
  };
  const storage = browserStorage();
  if (!storage) throw new Error("브라우저 저장소를 사용할 수 없습니다.");
  storage.setItem(VERSION3_TEST_SESSION_KEY, JSON.stringify(session));
  storage.setItem(PREVIEW_ROLE_KEY, account.role);
  writeVersion3TestData(data);
  return stripPassword(account);
}

export function createVersion3TestAccount(input: Version3AccountInput) {
  const data = readVersion3TestData();
  if (data.accounts.some((item) => item.loginId === input.loginId)) {
    throw new Error("이미 사용하는 ID입니다.");
  }
  const linkedStudent = data.students.find((student) => student.id === input.linkedStudentId);
  const created: Version3TestAccount = {
    id: id("account"),
    loginId: input.loginId,
    name: input.name,
    role: input.role,
    email: input.email,
    phone: input.phone,
    linkedStudentId: input.role === "student" ? input.linkedStudentId : "",
    linkedStudentName: linkedStudent?.name ?? "",
    status: "active",
    mustChangePassword: true,
    permissions: rolePermissions[input.role],
    lastLoginAt: "",
    createdAt: now(),
    password: input.initialPassword
  };
  data.accounts.unshift(created);
  addAccountHistory(data, created, "create_account");
  addAudit(data, "create_account", "account", created.id, created.name);
  writeVersion3TestData(data);
  return stripPassword(created);
}

export function updateVersion3TestAccountStatus(accountId: string, active: boolean) {
  const data = readVersion3TestData();
  const account = mustFind(data.accounts, accountId, "계정");
  account.status = active ? "active" : "paused";
  addAccountHistory(data, account, active ? "activate_account" : "deactivate_account");
  addAudit(data, active ? "activate_account" : "deactivate_account", "account", account.id, account.name);
  writeVersion3TestData(data);
}

export function resetVersion3TestAccountPassword(accountId: string, password: string) {
  const data = readVersion3TestData();
  const account = mustFind(data.accounts, accountId, "계정");
  account.password = password;
  account.mustChangePassword = true;
  addAccountHistory(data, account, "reset_password");
  addAudit(data, "reset_password", "account", account.id, account.name);
  writeVersion3TestData(data);
}

export function changeVersion3TestPassword(currentPassword: string, newPassword: string) {
  const session = readVersion3TestSession();
  if (!session) throw new Error("테스트모드 로그인 세션이 필요합니다.");
  const data = readVersion3TestData();
  const account = mustFind(data.accounts, session.accountId, "계정");
  if (account.password !== currentPassword) throw new Error("현재 PW가 맞지 않습니다.");
  account.password = newPassword;
  account.mustChangePassword = false;
  addAccountHistory(data, account, "change_password");
  addAudit(data, "change_password", "account", account.id, account.name);
  writeVersion3TestData(data);
  return stripPassword(account);
}

export function updateVersion3TestPermissions(accountId: string, permissions: Version3Permissions) {
  const data = readVersion3TestData();
  const account = mustFind(data.accounts, accountId, "계정");
  const beforePermissions = { ...account.permissions };
  account.permissions = { ...permissions };
  data.accountHistory.unshift({
    id: id("account-history"),
    accountId: account.id,
    accountName: account.name,
    actorId: actor().id,
    actorName: actor().name,
    action: "update_permissions",
    role: account.role,
    beforePermissions,
    afterPermissions: account.permissions,
    occurredAt: now()
  });
  addAudit(data, "update_permissions", "account", account.id, account.name);
  writeVersion3TestData(data);
}

export function reviewVersion3TestAccountRequest(requestId: string, review: { decision: string; initialPassword: string; linkedStudentId: string; memo: string }) {
  const data = readVersion3TestData();
  const request = mustFind(data.accountRequests, requestId, "계정 요청");
  const approved = review.decision === "approve";
  request.status = approved ? "승인" : "반려";
  request.reviewedByName = actor().name;
  request.reviewedAt = now();
  request.reviewMemo = review.memo;
  request.linkedStudentId = review.linkedStudentId || request.linkedStudentId;
  if (approved) {
    const created = createAccountFromRequest(data, request, review.initialPassword);
    request.createdAccountId = created.id;
    addAccountHistory(data, created, "approve_account_request");
    addAudit(data, "approve_account_request", "accountRequest", request.id, request.name);
  } else {
    addAudit(data, "reject_account_request", "accountRequest", request.id, request.name);
  }
  writeVersion3TestData(data);
}

export function createVersion3TestAccountRequest(input: {
  loginId: string;
  name: string;
  requestedRole: Role;
  email: string;
  phone: string;
  linkedStudentId: string;
  message: string;
}) {
  const data = readVersion3TestData();
  const request: AccountRequest = {
    id: id("account-request"),
    loginId: input.loginId,
    name: input.name,
    requestedRole: input.requestedRole,
    email: input.email,
    phone: input.phone,
    linkedStudentId: input.linkedStudentId,
    message: input.message,
    status: "대기",
    reviewedByName: "",
    reviewedAt: "",
    reviewMemo: "",
    createdAccountId: "",
    createdAt: now()
  };
  data.accountRequests.unshift(request);
  addAudit(data, "create_account_request", "accountRequest", request.id, request.name);
  writeVersion3TestData(data);
  return request;
}

export async function runVersion3TestAction<T>(action: string, payload: Record<string, unknown> = {}) {
  const data = readVersion3TestData();
  let result: unknown = true;

  if (action === "createStudent") result = createStudent(data, payload.student as Record<string, unknown>);
  else if (action === "createTeacher") result = createTeacher(data, payload.teacher as Record<string, unknown>);
  else if (action === "createEnrollment") result = createEnrollment(data, payload.enrollment as Record<string, unknown>);
  else if (action === "createLesson") result = createLesson(data, payload.lesson as Record<string, unknown>);
  else if (action === "updateAttendance") result = updateAttendance(data, payload.attendance as Record<string, unknown>);
  else if (action === "createLessonLog") result = createLessonLog(data, payload.log as Record<string, unknown>);
  else if (action === "createReservation") result = createReservation(data, payload.reservation as Record<string, unknown>);
  else if (action === "createRegistration") result = createRegistration(data, payload.registration as Record<string, unknown>);
  else if (action === "createTask") result = createTask(data, payload.task as Record<string, unknown>);
  else if (action === "clockWork") result = clockWork(data, payload.workLog as Record<string, unknown>);
  else if (action === "createMeeting") result = createMeeting(data, payload.meeting as Record<string, unknown>);
  else if (action === "createCalendarEvent") result = createCalendarEvent(data, payload.event as Record<string, unknown>);
  else if (action === "updatePublicSettings") result = updatePublicSettings(data, payload.publicSettings as Record<string, unknown>);
  else if (action === "createConsultation") result = createConsultation(data, payload);
  else if (action === "acknowledgeConsultation") result = updateConsultation(data, String(payload.consultationId || ""), { status: "확인 중" });
  else if (action === "updateConsultationStatus") result = updateConsultation(data, String(payload.consultationId || ""), payload);
  else if (action === "createNotice") result = createNotice(data, payload.notice as Record<string, unknown>);
  else throw new Error(`테스트모드에서 아직 처리하지 않는 작업입니다: ${action}`);

  addAudit(data, action, "operation", String((result as Record<string, unknown>)?.id || action), action);
  writeVersion3TestData(data);
  return result as T;
}

function mergeData(fallback: Version3TestData, parsed: Partial<Version3TestData>): Version3TestData {
  return {
    ...fallback,
    ...parsed,
    publicSettings: { ...fallback.publicSettings, ...(parsed.publicSettings ?? {}) },
    accounts: parsed.accounts?.length ? parsed.accounts : fallback.accounts,
    accountHistory: parsed.accountHistory ?? fallback.accountHistory,
    auditLogs: parsed.auditLogs ?? fallback.auditLogs,
    backups: parsed.backups ?? fallback.backups
  };
}

function notifyChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(VERSION3_TEST_DATA_CHANGE_EVENT));
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

function stripPassword(account: Version3TestAccount): Version3Account {
  const { password: _password, ...publicAccount } = account;
  return publicAccount;
}

function actor() {
  const session = readVersion3TestSession();
  return { id: session?.accountId ?? "test-system", name: session?.name ?? "Version.3 테스트모드" };
}

function addAccountHistory(data: Version3TestData, account: Version3TestAccount, action: string) {
  data.accountHistory.unshift({
    id: id("account-history"),
    accountId: account.id,
    accountName: account.name,
    actorId: actor().id,
    actorName: actor().name,
    action,
    role: account.role,
    occurredAt: now()
  });
}

function addAudit(data: Version3TestData, action: string, targetType: string, targetId: string, targetName: string) {
  data.auditLogs.unshift({
    id: id("audit"),
    actorId: actor().id,
    actorName: actor().name,
    action,
    targetType,
    targetId,
    targetName,
    metadata: {},
    createdAt: now()
  });
}

function mustFind<T extends { id: string }>(items: T[], itemId: string, label: string): T {
  const found = items.find((item) => item.id === itemId);
  if (!found) throw new Error(`${label}을 찾을 수 없습니다.`);
  return found;
}

function createAccountFromRequest(data: Version3TestData, request: AccountRequest, password: string) {
  const student = data.students.find((item) => item.id === request.linkedStudentId);
  const created: Version3TestAccount = {
    id: id("account"),
    loginId: request.loginId,
    name: request.name,
    role: request.requestedRole,
    email: request.email,
    phone: request.phone,
    linkedStudentId: request.requestedRole === "student" ? request.linkedStudentId : "",
    linkedStudentName: student?.name ?? "",
    status: "active",
    mustChangePassword: true,
    permissions: rolePermissions[request.requestedRole],
    lastLoginAt: "",
    createdAt: now(),
    password
  };
  data.accounts.unshift(created);
  return created;
}

function createStudent(data: Version3TestData, input: Record<string, unknown>) {
  const teacherId = text(input.teacher_id || input.teacherId || data.teachers[0]?.id);
  const teacher = data.teachers.find((item) => item.id === teacherId || item.name === teacherId);
  const student: Student = {
    id: id("student"),
    name: text(input.name),
    birthDate: text(input.birth_date || input.birthDate),
    phone: text(input.phone),
    major: text(input.major),
    goal: text(input.goal),
    status: text(input.status || "등록대기") as Student["status"],
    enrolledAt: text(input.enrolled_at || input.enrolledAt),
    memo: text(input.memo),
    teacherId: teacher?.id ?? teacherId,
    teacherName: teacher?.name ?? ""
  };
  data.students.unshift(student);
  return { ...student, student_id: student.id };
}

function createTeacher(data: Version3TestData, input: Record<string, unknown>) {
  const teacher = { id: id("teacher"), name: text(input.name), major: text(input.major) };
  data.teachers.unshift(teacher);
  return teacher;
}

function createEnrollment(data: Version3TestData, input: Record<string, unknown>) {
  const studentId = text(input.student_id || input.studentId);
  const teacherId = text(input.teacher_id || input.teacherId);
  const courseId = text(input.course_id || input.courseId);
  const enrollment: Enrollment = {
    id: id("enrollment"),
    studentId,
    teacherId,
    courseId,
    startDate: text(input.start_date || input.startDate),
    status: text(input.status || "등록"),
    memo: text(input.memo),
    studentName: data.students.find((item) => item.id === studentId)?.name,
    teacherName: data.teachers.find((item) => item.id === teacherId)?.name
  };
  data.enrollments.unshift(enrollment);
  return enrollment;
}

function createLesson(data: Version3TestData, input: Record<string, unknown>) {
  const studentId = text(input.student_id || input.studentId);
  const teacherId = text(input.teacher_id || input.teacherId);
  const lessonDate = text(input.lesson_date || input.date);
  const startTime = text(input.start_time || input.startTime);
  const lesson: Lesson = {
    id: id("lesson"),
    studentId,
    teacherId,
    courseId: text(input.course_id || input.courseId || ""),
    startsAt: toDateTime(lessonDate, startTime),
    duration: Number(input.duration_minutes || input.duration || 60),
    status: text(input.status || "예정"),
    memo: text(input.memo),
    studentName: data.students.find((item) => item.id === studentId)?.name,
    teacherName: data.teachers.find((item) => item.id === teacherId)?.name,
    subject: text(input.subject)
  };
  data.lessons.unshift(lesson);
  data.attendance.unshift({ id: id("attendance"), lessonId: lesson.id, studentId, status: "미처리", makeupNeeded: false, memo: "" });
  return lesson;
}

function updateAttendance(data: Version3TestData, input: Record<string, unknown>) {
  const attendanceId = text(input.attendance_id || input.id);
  const lessonId = text(input.lesson_id || input.lessonId);
  let record = data.attendance.find((item) => item.id === attendanceId || item.lessonId === lessonId);
  if (!record) {
    record = { id: id("attendance"), lessonId, studentId: text(input.student_id || input.studentId), status: "", makeupNeeded: false, memo: "" };
    data.attendance.unshift(record);
  }
  record.status = text(input.status || record.status);
  record.makeupNeeded = Boolean(input.makeup_needed || input.makeupNeeded || input.makeup === "on");
  record.memo = text(input.memo);
  return record;
}

function createLessonLog(data: Version3TestData, input: Record<string, unknown>) {
  const lessonId = text(input.lesson_id || input.lessonId);
  const lesson = data.lessons.find((item) => item.id === lessonId);
  const note: LessonNote = {
    id: id("lesson-note"),
    lessonId,
    studentId: text(input.student_id || input.studentId || lesson?.studentId),
    teacherId: text(input.teacher_id || input.teacherId || lesson?.teacherId),
    date: text(input.date) || now().slice(0, 10),
    content: text(input.content),
    homework: text(input.homework),
    nextGoal: text(input.next_goal || input.nextGoal),
    practiceRequest: text(input.practice_request || input.practiceRequest),
    internalMemo: text(input.internal_memo || input.internalMemo),
    studentName: lesson?.studentName,
    teacherName: lesson?.teacherName
  };
  data.lessonNotes.unshift(note);
  return note;
}

function createReservation(data: Version3TestData, input: Record<string, unknown>) {
  const roomId = text(input.room_id || input.roomId);
  const date = text(input.reservation_date || input.date);
  const startsAt = toDateTime(date, text(input.start_time || input.startTime));
  const endsAt = toDateTime(date, text(input.end_time || input.endTime));
  if (data.reservations.some((item) => item.roomId === roomId && overlaps(startsAt, endsAt, item.startsAt, item.endsAt))) {
    throw new Error("이미 예약된 시간입니다. 다른 시간대를 선택해 주세요.");
  }
  const room = data.rooms.find((item) => item.id === roomId);
  const reservation: Reservation = {
    id: id("reservation"),
    roomId,
    studentId: "",
    requester: actor().name,
    startsAt,
    endsAt,
    status: "예약",
    memo: text(input.memo || input.purpose),
    roomName: room?.name ?? ""
  };
  data.reservations.unshift(reservation);
  return reservation;
}

function createRegistration(data: Version3TestData, input: Record<string, unknown>) {
  const studentId = text(input.student_id || input.studentId);
  const payment: Payment = {
    id: id("payment"),
    studentId,
    title: text(input.registration_type || input.title || "등록"),
    amount: Number(input.amount || 0),
    status: text(input.payment_status || input.status || "확인 필요"),
    dueDate: text(input.next_due_date || input.dueDate),
    paidAt: text(input.paid_at || input.paidAt),
    memo: text(input.memo),
    studentName: data.students.find((item) => item.id === studentId)?.name
  };
  data.payments.unshift(payment);
  return payment;
}

function createTask(data: Version3TestData, input: Record<string, unknown>) {
  const task: Task = {
    id: id("task"),
    title: text(input.title),
    assignee: text(input.assignee || actor().name),
    dueDate: text(input.dueDate || input.due_date),
    status: text(input.status || "진행"),
    priority: text(input.priority || "보통"),
    memo: text(input.memo)
  };
  data.tasks.unshift(task);
  return task;
}

function clockWork(data: Version3TestData, input: Record<string, unknown>) {
  const session = readVersion3TestSession();
  const today = text(input.workDate) || now().slice(0, 10);
  let log = data.workLogs.find((item) => item.accountId === session?.accountId && item.workDate === today);
  if (!log) {
    log = { id: id("work-log"), accountId: session?.accountId ?? "test", accountName: actor().name, workDate: today, clockInAt: "", clockOutAt: "", memo: "" };
    data.workLogs.unshift(log);
  }
  if (input.mode === "out") log.clockOutAt = now();
  else log.clockInAt = now();
  log.memo = text(input.memo || log.memo);
  return log;
}

function createMeeting(data: Version3TestData, input: Record<string, unknown>) {
  const meeting = {
    id: id("meeting"),
    title: text(input.title),
    startsAt: toDateTime(text(input.date || input.startsAt), text(input.startTime)),
    participantNames: text(input.participantNames || input.participants).split(",").map((item) => item.trim()).filter(Boolean),
    status: text(input.status || "예정"),
    memo: text(input.memo)
  };
  data.meetings.unshift(meeting);
  return meeting;
}

function createCalendarEvent(data: Version3TestData, input: Record<string, unknown>) {
  const event = {
    id: id("calendar-event"),
    title: text(input.title),
    date: text(input.date),
    startTime: text(input.startTime || input.start_time),
    targetRoles: parseRoles(input.targetRoles || input.target_roles),
    memo: text(input.memo)
  };
  data.calendarEvents.unshift(event);
  return event;
}

function updatePublicSettings(data: Version3TestData, input: Record<string, unknown>) {
  data.publicSettings = {
    ...data.publicSettings,
    loginNotice: text(input.loginNotice),
    academyPhone: text(input.academyPhone),
    reservationGuide: text(input.reservationGuide),
    updatedAt: now(),
    updatedBy: actor().name
  };
  return data.publicSettings;
}

function createConsultation(data: Version3TestData, payload: Record<string, unknown>) {
  const source = ((payload.consultation as Record<string, unknown>) || payload) as Record<string, unknown>;
  const consultation: Consultation = {
    id: id("consultation"),
    studentId: text(source.studentId || source.student_id),
    studentName: text(source.studentName || source.student_name || source.name),
    guardianName: text(source.guardianName || source.guardian_name),
    phone: text(source.phone),
    channel: text(source.channel || "web"),
    major: text(source.major),
    goal: text(source.goal),
    date: text(source.date || now().slice(0, 10)),
    followUpDate: text(source.followUpDate || source.follow_up_date),
    status: text(source.status || "접수"),
    priority: text(source.priority || "보통"),
    memo: text(source.memo || source.message),
    assignedTo: text(source.assignedTo || source.assigned_to),
    assignedToName: "",
    statusUpdatedAt: now(),
    unreadForAccountIds: []
  };
  data.consultations.unshift(consultation);
  return consultation;
}

function updateConsultation(data: Version3TestData, consultationId: string, input: Record<string, unknown>) {
  const consultation = mustFind(data.consultations, consultationId, "상담요청");
  consultation.status = text(input.status || consultation.status);
  consultation.assignedTo = text(input.assignedTo || input.assigned_to || consultation.assignedTo);
  consultation.priority = text(input.priority || consultation.priority);
  consultation.followUpDate = text(input.followUpDate || input.follow_up_date || consultation.followUpDate);
  consultation.statusUpdatedAt = now();
  const history: ConsultationHistory = {
    id: id("consultation-history"),
    consultationId,
    actorId: actor().id,
    actorName: actor().name,
    action: "update_status",
    status: consultation.status,
    assignedTo: consultation.assignedTo || "",
    assignedToName: consultation.assignedToName || "",
    occurredAt: now()
  };
  data.consultationHistory.unshift(history);
  return consultation;
}

function createNotice(data: Version3TestData, input: Record<string, unknown>) {
  const notice: Notice = {
    id: id("notice"),
    title: text(input.title),
    category: text(input.category || "공지"),
    author: actor().name,
    updatedAt: now(),
    body: text(input.body || input.content),
    targetRoles: parseRoles(input.targetRoles || input.target_roles),
    pinned: Boolean(input.pinned)
  };
  data.notices.unshift(notice);
  return notice;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value);
}

function toDateTime(date: string, time: string) {
  if (!date) return now();
  if (!time) return `${date}T00:00:00+09:00`;
  return `${date}T${time.length === 5 ? time : `${time}:00`}:00+09:00`.replace(":00:00+09:00", ":00+09:00");
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  const a1 = new Date(startA).getTime();
  const a2 = new Date(endA).getTime();
  const b1 = new Date(startB).getTime();
  const b2 = new Date(endB).getTime();
  if ([a1, a2, b1, b2].some(Number.isNaN)) return false;
  return a1 < b2 && b1 < a2;
}

function parseRoles(value: unknown): Role[] {
  if (Array.isArray(value)) return value.map((item) => normalizeRole(String(item))).filter(Boolean) as Role[];
  const textValue = text(value);
  if (!textValue) return ["owner", "manager", "teacher", "student"];
  return textValue.split(",").map((item) => normalizeRole(item.trim())).filter(Boolean) as Role[];
}
