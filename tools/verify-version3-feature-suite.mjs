import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ownerPassword = process.env.VERSION3_FEATURE_SUITE_OWNER_PASSWORD || process.env.VERSION3_OWNER_INITIAL_PASSWORD || "owner-test-123";
const seedPassword = process.env.VERSION3_FEATURE_SUITE_PASSWORD || process.env.VERSION3_LOCAL_SERVER_PASSWORD || "version3";
const basePort = Number(process.env.VERSION3_FEATURE_SUITE_PORT || 4323);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const results = [];
const context = {
  storage: {
    memory: "not-run",
    file: "not-run",
    postgres: process.env.VERSION3_DATABASE_URL ? "not-run" : "skipped: VERSION3_DATABASE_URL not provided"
  },
  base44: existsSync("base44/config.jsonc") ? "configured" : "skipped: base44/config.jsonc not found"
};

let mainDataFile = "";
let persistentStudentName = "";

try {
  await runMemoryMode();
  await runFileMode();
  if (process.env.VERSION3_DATABASE_URL) await runPostgresMode();
  printSummary();
} catch (error) {
  printSummary();
  throw error;
}

async function runMemoryMode() {
  const runtime = await startServer({
    port: basePort,
    dataFile: "memory",
    tempPrefix: "bonsung-feature-memory-"
  });
  try {
    const baseUrl = runtime.url;
    const health = await request(baseUrl, "/health");
    assert(health.persistence.driver === "memory", "Memory mode health must report memory storage.");
    assert(health.persistence.enabled === false, "Memory mode must not report persistence.");
    const owner = await login(baseUrl, "owner", ownerPassword);
    const transientStudentName = `qa-transient-memory-${suffix}`;
    await authorizedRequest(baseUrl, "/actions/createStudent", owner.token, {
      method: "POST",
      body: { student: { name: transientStudentName, status: "상담중" } }
    });
    await runtime.stop();

    const restarted = await startServer({
      port: basePort,
      dataFile: "memory",
      tempPrefix: "bonsung-feature-memory-"
    });
    try {
      const restartedOwner = await login(restarted.url, "owner", ownerPassword);
      const bootstrap = await authorizedRequest(restarted.url, "/bootstrap", restartedOwner.token);
      assert(!bootstrap.students.some((student) => student.name === transientStudentName), "Memory mode must reset data after restart.");
      context.storage.memory = "passed";
      pass("storage", "memory mode resets data after restart");
    } finally {
      await restarted.stop();
    }
  } finally {
    await runtime.stop();
  }
}

async function runFileMode() {
  const runtime = await startServer({
    port: basePort + 1,
    dataFile: null,
    tempPrefix: "bonsung-feature-file-",
    keepTemp: true
  });
  mainDataFile = runtime.dataFile;
  try {
    const baseUrl = runtime.url;
    await exerciseFeatureSuite(baseUrl);
    await runtime.stop();

    const restarted = await startServer({
      port: basePort + 1,
      dataFile: mainDataFile,
      tempPrefix: "bonsung-feature-file-restart-",
      keepTemp: true
    });
    try {
      const owner = await login(restarted.url, "owner", ownerPassword);
      const bootstrap = await authorizedRequest(restarted.url, "/bootstrap", owner.token);
      assert(bootstrap.students.some((student) => student.name === persistentStudentName), "File mode must persist QA-created student after restart.");
      const backups = await authorizedRequest(restarted.url, "/data-backups", owner.token);
      assert(backups.persistenceEnabled === true && backups.storageDriver === "file", "File mode backups endpoint must report persistent file storage.");
      context.storage.file = "passed";
      pass("storage", "file mode persists data after restart");
    } finally {
      await restarted.stop();
    }
  } finally {
    await runtime.stop();
    if (runtime.tempDir) rmSync(runtime.tempDir, { recursive: true, force: true });
  }
}

async function runPostgresMode() {
  const runtime = await startServer({
    port: basePort + 2,
    dataFile: "memory",
    tempPrefix: "bonsung-feature-postgres-",
    env: {
      VERSION3_STORAGE_DRIVER: "postgres",
      VERSION3_DATABASE_URL: process.env.VERSION3_DATABASE_URL
    }
  });
  try {
    const health = await request(runtime.url, "/health");
    assert(health.persistence.driver === "postgres", "PostgreSQL mode health must report postgres storage.");
    const owner = await login(runtime.url, "owner", ownerPassword);
    await authorizedRequest(runtime.url, "/data-quality", owner.token);
    await authorizedRequest(runtime.url, "/data-export", owner.token);
    context.storage.postgres = "passed";
    pass("storage", "postgres mode smoke test");
  } finally {
    await runtime.stop();
  }
}

async function exerciseFeatureSuite(baseUrl) {
  await record("health", "server health and file persistence", async () => {
    const health = await request(baseUrl, "/health");
    assert(health.service === "bonsung-version3-server", "Unexpected health service.");
    assert(health.persistence.driver === "file", "Main feature suite must run in file mode.");
    assert(health.persistence.enabled === true, "File mode must be persistent.");
  });

  const wrongLogin = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId: "owner", password: "wrong-password" },
    allowFailure: true
  });
  await record("auth", "wrong password is rejected without sensitive detail", async () => {
    assert(wrongLogin.status === 401, "Wrong password must return 401.");
    assert(!/scrypt|hash|token/i.test(wrongLogin.error || ""), "Wrong password error must not expose hash or token detail.");
  });

  await record("auth", "unauthenticated and invalid-token requests are rejected", async () => {
    assert((await request(baseUrl, "/bootstrap", { allowFailure: true })).status === 401, "Missing token must return 401.");
    const invalid = await request(baseUrl, "/bootstrap", { headers: { Authorization: "Bearer invalid-token" }, allowFailure: true });
    assert(invalid.status === 401, "Invalid token must return 401.");
  });

  const owner = await login(baseUrl, "owner", ownerPassword);
  const manager = await login(baseUrl, "manager", seedPassword);
  const teacher = await login(baseUrl, "teacher", seedPassword);
  const seedStudent = await login(baseUrl, "student", seedPassword);

  await record("auth", "seed roles login with canonical roles", async () => {
    assert(owner.user.role === "owner", "Owner role must be canonical.");
    assert(manager.user.role === "manager", "Manager role must be canonical.");
    assert(teacher.user.role === "teacher", "Teacher role must be canonical.");
    assert(seedStudent.user.role === "student", "Student role must be canonical.");
  });

  const logoutProbe = await login(baseUrl, "manager", seedPassword);
  await authorizedRequest(baseUrl, "/auth/logout", logoutProbe.token, { method: "POST" });
  await record("auth", "logout invalidates session token", async () => {
    const afterLogout = await authorizedRequest(baseUrl, "/bootstrap", logoutProbe.token, { allowFailure: true });
    assert(afterLogout.status === 401, "Logged-out token must not access protected APIs.");
  });

  await record("auth", "mustChangePassword flow changes password and preserves active session", async () => {
    const tempStudent = await createStudent(baseUrl, owner.token, `qa-must-change-student-${suffix}`, "teacher-1");
    const account = await createAccount(baseUrl, owner.token, {
      loginId: `qa-must-change-${suffix}`,
      name: "QA Must Change",
      role: "student",
      initialPassword: "qa-change-123",
      linkedStudentId: tempStudent.id
    });
    const loginResult = await login(baseUrl, account.loginId, "qa-change-123");
    assert(loginResult.user.mustChangePassword === true, "Invited account must require password change.");
    const changed = await authorizedRequest(baseUrl, "/auth/change-password", loginResult.token, {
      method: "POST",
      body: { currentPassword: "qa-change-123", newPassword: "qa-change-456" }
    });
    assert(changed.user.mustChangePassword === false, "Password change must clear mustChangePassword.");
    await authorizedRequest(baseUrl, "/bootstrap", loginResult.token);
  });

  persistentStudentName = `qa-feature-student-${suffix}`;
  const qaStudent = await createStudent(baseUrl, manager.token, persistentStudentName, "teacher-1", {
    phone: "010-0000-0000",
    memo: "qa-sensitive-student-memo"
  });
  const otherTeacherStudent = await createStudent(baseUrl, owner.token, `qa-other-teacher-student-${suffix}`, "teacher-unassigned");
  const studentForAlias = await createStudent(baseUrl, owner.token, `qa-alias-student-${suffix}`, "teacher-1");

  const qaOwner = await createAccount(baseUrl, owner.token, {
    loginId: `qa-owner-${suffix}`,
    name: "QA Owner",
    role: "admin",
    initialPassword: "qa-owner-123"
  });
  const qaTeacher = await createAccount(baseUrl, owner.token, {
    loginId: `qa-teacher-${suffix}`,
    name: "QA Teacher",
    role: "coach",
    initialPassword: "qa-teacher-123"
  });
  const qaStudentAccount = await createAccount(baseUrl, owner.token, {
    loginId: `qa-student-${suffix}`,
    name: "QA Student",
    role: "artist",
    initialPassword: "qa-student-123",
    linkedStudentId: studentForAlias.id
  });

  await record("roles", "legacy aliases normalize to canonical roles", async () => {
    assert(qaOwner.role === "owner", "admin alias must normalize to owner.");
    assert(qaTeacher.role === "teacher", "coach alias must normalize to teacher.");
    assert(qaStudentAccount.role === "student", "artist alias must normalize to student.");
  });

  const qaStudentLogin = await login(baseUrl, qaStudentAccount.loginId, "qa-student-123");
  await authorizedRequest(baseUrl, "/auth/change-password", qaStudentLogin.token, {
    method: "POST",
    body: { currentPassword: "qa-student-123", newPassword: "qa-student-456" }
  });

  await record("accounts", "duplicate login and duplicate active student account are rejected", async () => {
    const duplicateLogin = await createAccount(baseUrl, owner.token, {
      loginId: qaStudentAccount.loginId,
      name: "QA Duplicate Login",
      role: "student",
      initialPassword: "qa-student-999",
      linkedStudentId: qaStudent.id
    }, true);
    assert(duplicateLogin.status === 409, "Duplicate loginId must return 409.");

    const duplicateLink = await createAccount(baseUrl, owner.token, {
      loginId: `qa-duplicate-link-${suffix}`,
      name: "QA Duplicate Link",
      role: "student",
      initialPassword: "qa-student-999",
      linkedStudentId: studentForAlias.id
    }, true);
    assert(duplicateLink.status === 409, "Duplicate active student-account link must return 409.");
  });

  await record("accounts", "self status, password reset, and permission edits are blocked", async () => {
    assert((await authorizedRequest(baseUrl, `/accounts/${owner.user.id}/status`, owner.token, { method: "PATCH", body: { active: false }, allowFailure: true })).status === 400, "Self status mutation must be blocked.");
    assert((await authorizedRequest(baseUrl, `/accounts/${owner.user.id}/password`, owner.token, { method: "PATCH", body: { password: "new-owner-123" }, allowFailure: true })).status === 400, "Self password reset must be blocked.");
    assert((await authorizedRequest(baseUrl, `/accounts/${owner.user.id}/permissions`, owner.token, { method: "PATCH", body: { permissions: { viewPayments: false } }, allowFailure: true })).status === 400, "Self permission edit must be blocked.");
  });

  await record("accounts", "pause/reactivate account and permissions update are audited", async () => {
    await authorizedRequest(baseUrl, `/accounts/${qaTeacher.id}/status`, owner.token, { method: "PATCH", body: { active: false } });
    assert((await login(baseUrl, qaTeacher.loginId, "qa-teacher-123", true)).status === 401, "Paused account must not login.");
    await authorizedRequest(baseUrl, `/accounts/${qaTeacher.id}/status`, owner.token, { method: "PATCH", body: { active: true } });
    await login(baseUrl, qaTeacher.loginId, "qa-teacher-123");
    await authorizedRequest(baseUrl, `/accounts/${qaTeacher.id}/permissions`, owner.token, {
      method: "PATCH",
      body: { permissions: { viewCalendar: true } }
    });
    const history = await authorizedRequest(baseUrl, "/account-history", owner.token);
    assert(history.some((item) => item.accountId === qaTeacher.id && item.action === "update_permissions"), "Permission update must be in account history.");
  });

  await record("accounts", "account request approve and reject flows", async () => {
    const rejectRequest = await request(baseUrl, "/account-requests", {
      method: "POST",
      body: { loginId: `qa-reject-${suffix}`, name: "QA Reject", requestedRole: "teacher", message: "QA reject request" }
    });
    const rejected = await authorizedRequest(baseUrl, `/account-requests/${rejectRequest.id}/review`, manager.token, {
      method: "PATCH",
      body: { decision: "reject", memo: "QA rejected" }
    });
    assert(rejected.status === "반려", "Rejected request must be marked rejected.");

    const requestStudent = await createStudent(baseUrl, owner.token, `qa-request-student-${suffix}`, "teacher-1");
    const approveRequest = await request(baseUrl, "/account-requests", {
      method: "POST",
      body: {
        loginId: `qa-request-student-${suffix}`,
        name: "QA Request Student",
        requestedRole: "artist",
        linkedStudentId: requestStudent.id,
        message: "QA approve request"
      }
    });
    const approved = await authorizedRequest(baseUrl, `/account-requests/${approveRequest.id}/review`, manager.token, {
      method: "PATCH",
      body: { decision: "approve", initialPassword: "qa-request-123" }
    });
    assert(approved.request.status === "승인" && approved.account.role === "student", "Approved request must create student account.");
    const approvedLogin = await login(baseUrl, approved.account.loginId, "qa-request-123");
    assert(approvedLogin.user.mustChangePassword === true, "Approved request account must require password change.");
  });

  await record("permissions", "manager, teacher, and student forbidden API requests are rejected", async () => {
    assert((await createAccount(baseUrl, manager.token, { loginId: `qa-manager-direct-${suffix}`, name: "Bad", role: "teacher", initialPassword: "bad-bad-123" }, true)).status === 403, "Manager direct account creation must be forbidden.");
    assert((await authorizedRequest(baseUrl, "/actions/createRegistration", teacher.token, { method: "POST", body: { registration: { student_id: qaStudent.id, amount: 1000 } }, allowFailure: true })).status === 403, "Teacher payment creation must be forbidden.");
    assert((await authorizedRequest(baseUrl, "/actions/updateAttendance", qaStudentLogin.token, { method: "POST", body: { attendance: { lesson_id: "lesson-1", student_id: studentForAlias.id, status: "출석" } }, allowFailure: true })).status === 403, "Student attendance mutation must be forbidden.");
  });

  const consultation = await authorizedRequest(baseUrl, "/actions/createConsultation", qaStudentLogin.token, {
    method: "POST",
    body: { consultation: { goal: "QA consultation", memo: "QA student-created consultation" } }
  });
  await record("consultations", "student request is visible to manager and can be triaged to teacher", async () => {
    const managerBootstrap = await authorizedRequest(baseUrl, "/bootstrap", manager.token);
    assert(managerBootstrap.dashboardWorkQueue.some((item) => item.sourceId === consultation.id), "Manager dashboard must include new consultation work item.");
    const triaged = await authorizedRequest(baseUrl, "/actions/updateConsultationStatus", manager.token, {
      method: "POST",
      body: { consultationId: consultation.id, status: "전달 필요", assignedTo: "teacher-1" }
    });
    assert(triaged.status === "전달 필요" && triaged.assignedTo === "teacher-1", "Consultation must triage to teacher.");
    const teacherBootstrap = await authorizedRequest(baseUrl, "/bootstrap", teacher.token);
    assert(teacherBootstrap.consultations.some((item) => item.id === consultation.id), "Assigned consultation must be visible to teacher.");
    const acknowledged = await authorizedRequest(baseUrl, "/actions/acknowledgeConsultation", teacher.token, {
      method: "POST",
      body: { consultationId: consultation.id }
    });
    assert(!acknowledged.unreadForAccountIds?.includes("teacher-1"), "Teacher acknowledge must clear unread state.");
    const history = await authorizedRequest(baseUrl, "/data-export", owner.token);
    assert(history.data.consultationHistory.some((item) => item.consultationId === consultation.id), "Consultation history must be persisted.");
  });

  const lesson = await authorizedRequest(baseUrl, "/actions/createLesson", manager.token, {
    method: "POST",
    body: {
      lesson: {
        student_id: qaStudent.id,
        teacher_id: "teacher-1",
        subject: "QA Vocal",
        lesson_date: "2026-08-18",
        start_time: "15:00",
        duration_minutes: 60
      }
    }
  });
  const studentVisibleLesson = await authorizedRequest(baseUrl, "/actions/createLesson", manager.token, {
    method: "POST",
    body: {
      lesson: {
        student_id: studentForAlias.id,
        teacher_id: "teacher-1",
        subject: "QA Student Visible Vocal",
        lesson_date: "2026-08-21",
        start_time: "16:00",
        duration_minutes: 60
      }
    }
  });

  await record("lessons", "lesson creation validates references and creates pending attendance", async () => {
    const invalidStudent = await authorizedRequest(baseUrl, "/actions/createLesson", manager.token, {
      method: "POST",
      body: { lesson: { student_id: "missing-student", teacher_id: "teacher-1", subject: "QA", lesson_date: "2026-08-19" } },
      allowFailure: true
    });
    assert(invalidStudent.status === 400, "Missing student lesson must be rejected.");
    const invalidTeacher = await authorizedRequest(baseUrl, "/actions/createLesson", manager.token, {
      method: "POST",
      body: { lesson: { student_id: qaStudent.id, teacher_id: "missing-teacher", subject: "QA", lesson_date: "2026-08-19" } },
      allowFailure: true
    });
    assert(invalidTeacher.status === 400, "Missing teacher lesson must be rejected.");
    const bootstrap = await authorizedRequest(baseUrl, "/bootstrap", owner.token);
    assert(bootstrap.attendance.some((item) => item.lessonId === lesson.id && item.status === "미처리"), "Lesson must create pending attendance.");
  });

  await record("attendance", "attendance statuses and makeup flag update lesson status", async () => {
    const present = await authorizedRequest(baseUrl, "/actions/updateAttendance", teacher.token, {
      method: "POST",
      body: { attendance: { lesson_id: lesson.id, student_id: qaStudent.id, status: "출석", memo: "QA present" } }
    });
    assert(present.status === "출석" && present.makeupNeeded === false, "Present attendance must not require makeup.");
    const absent = await authorizedRequest(baseUrl, "/actions/updateAttendance", teacher.token, {
      method: "POST",
      body: { attendance: { lesson_id: lesson.id, student_id: qaStudent.id, status: "결석", memo: "QA absent" } }
    });
    assert(absent.status === "결석" && absent.makeupNeeded === true, "Absence must require makeup.");
    const ownerBootstrap = await authorizedRequest(baseUrl, "/bootstrap", owner.token);
    assert(ownerBootstrap.lessons.find((item) => item.id === lesson.id)?.status === "결석", "Attendance status must reflect on lesson.");
    const studentEdit = await authorizedRequest(baseUrl, "/actions/updateAttendance", qaStudentLogin.token, {
      method: "POST",
      body: { attendance: { lesson_id: lesson.id, student_id: qaStudent.id, status: "출석" } },
      allowFailure: true
    });
    assert(studentEdit.status === 403, "Student must not update attendance.");
  });

  await record("lesson-notes", "lesson note requires existing lesson and hides internal memo from student", async () => {
    const missingContent = await authorizedRequest(baseUrl, "/actions/createLessonLog", teacher.token, {
      method: "POST",
      body: { log: { student_id: qaStudent.id, teacher_id: "teacher-1", lesson_date: "2026-08-18" } },
      allowFailure: true
    });
    assert(missingContent.status === 400, "Lesson note without content must be rejected.");
    const noLesson = await authorizedRequest(baseUrl, "/actions/createLessonLog", teacher.token, {
      method: "POST",
      body: { log: { student_id: qaStudent.id, teacher_id: "teacher-1", lesson_date: "2026-08-30", lesson_content: "No lesson" } },
      allowFailure: true
    });
    assert(noLesson.status === 400, "Lesson note without matching lesson must be rejected.");
    const note = await authorizedRequest(baseUrl, "/actions/createLessonLog", teacher.token, {
      method: "POST",
      body: { log: { student_id: studentForAlias.id, teacher_id: "teacher-1", lesson_date: "2026-08-21", lesson_content: "QA note", homework: "QA homework", next_goal: "QA next", practice_request: "QA practice", internal_memo: "QA internal memo" } }
    });
    assert(note.internalMemo === "QA internal memo", "Teacher-created note should persist internal memo.");
    const studentBootstrap = await authorizedRequest(baseUrl, "/bootstrap", qaStudentLogin.token);
    assert(studentBootstrap.lessons.some((item) => item.id === studentVisibleLesson.id), "Student bootstrap must include the student's own lesson.");
    const visibleNote = studentBootstrap.lessonNotes.find((item) => item.id === note.id);
    assert(visibleNote && !("internalMemo" in visibleNote) && !("internal_memo" in visibleNote), "Student bootstrap must not expose lesson-note internal memo.");
  });

  await record("role-scoped bootstrap", "teacher and student bootstrap data are filtered and sanitized", async () => {
    const teacherBootstrap = await authorizedRequest(baseUrl, "/bootstrap", teacher.token);
    const teacherStudent = teacherBootstrap.students.find((item) => item.id === qaStudent.id);
    assert(teacherStudent, "Teacher must see assigned student.");
    assert(!teacherBootstrap.students.some((item) => item.id === otherTeacherStudent.id), "Teacher must not see unrelated students.");
    assert(!("phone" in teacherStudent) && !("memo" in teacherStudent), "Teacher student payload must not expose phone or memo.");
    assert(teacherBootstrap.guardians.every((guardian) => !("phone" in guardian) && !("memo" in guardian)), "Teacher guardian payload must not expose phone or memo.");

    const studentBootstrap = await authorizedRequest(baseUrl, "/bootstrap", qaStudentLogin.token);
    assert(studentBootstrap.students.length === 1 && studentBootstrap.students[0].id === studentForAlias.id, "Student must only see linked student.");
    assert(studentBootstrap.payments.length === 0 && studentBootstrap.enrollments.length === 0, "Student must not see payment or enrollment operations.");
  });

  await record("reservations", "room reservation permissions, conflicts, and time validation", async () => {
    const studentPractice = await authorizedRequest(baseUrl, "/actions/createReservation", qaStudentLogin.token, {
      method: "POST",
      body: { reservation: { room_id: "room-1", date: "2026-08-20", start_time: "10:00", end_time: "11:00", purpose: "연습" } }
    });
    assert(studentPractice.studentId === studentForAlias.id, "Student reservation must link to linkedStudentId.");
    const duplicate = await authorizedRequest(baseUrl, "/actions/createReservation", manager.token, {
      method: "POST",
      body: { reservation: { room_id: "room-1", date: "2026-08-20", start_time: "10:30", end_time: "11:30", purpose: "연습" } },
      allowFailure: true
    });
    assert(duplicate.status === 409, "Overlapping reservation must be rejected.");
    const badTime = await authorizedRequest(baseUrl, "/actions/createReservation", manager.token, {
      method: "POST",
      body: { reservation: { room_id: "room-1", date: "2026-08-20", start_time: "12:00", end_time: "12:00", purpose: "연습" } },
      allowFailure: true
    });
    assert(badTime.status === 400, "Reservation ending at or before start must be rejected.");
    const studentLessonRoom = await authorizedRequest(baseUrl, "/actions/createReservation", qaStudentLogin.token, {
      method: "POST",
      body: { reservation: { room_id: "room-1", date: "2026-08-20", start_time: "13:00", end_time: "14:00", purpose: "레슨" } },
      allowFailure: true
    });
    assert(studentLessonRoom.status === 403, "Student must not reserve lesson room purpose.");
    await authorizedRequest(baseUrl, "/actions/createReservation", teacher.token, {
      method: "POST",
      body: { reservation: { room_id: "room-1", date: "2026-08-20", start_time: "14:00", end_time: "15:00", purpose: "이론수업" } }
    });
  });

  await record("payments", "registration statuses and payment visibility are role-scoped", async () => {
    const statuses = ["청구예정", "청구완료", "납부완료", "미납", "환불", "취소"];
    for (const status of statuses) {
      const payment = await authorizedRequest(baseUrl, "/actions/createRegistration", manager.token, {
        method: "POST",
        body: { registration: { student_id: qaStudent.id, registration_type: `QA ${status}`, amount: 10000, payment_status: status } }
      });
      assert(payment.status === status && payment.amount === 10000, `Payment status ${status} must persist.`);
    }
    const teacherBootstrap = await authorizedRequest(baseUrl, "/bootstrap", teacher.token);
    const studentBootstrap = await authorizedRequest(baseUrl, "/bootstrap", qaStudentLogin.token);
    assert(teacherBootstrap.payments.length === 0, "Teacher bootstrap must not expose payments.");
    assert(studentBootstrap.payments.length === 0, "Student bootstrap must not expose payments.");
    const managerBootstrap = await authorizedRequest(baseUrl, "/bootstrap", manager.token);
    assert(managerBootstrap.payments.some((payment) => payment.studentId === qaStudent.id), "Manager must see payment records.");
  });

  await record("operations", "tasks, work logs, meetings, calendar, notices, and settings", async () => {
    const task = await authorizedRequest(baseUrl, "/actions/createTask", manager.token, {
      method: "POST",
      body: { task: { title: `QA task ${suffix}`, assignee: "manager-1", dueDate: "2026-08-10" } }
    });
    assert(task.title.includes("QA task"), "Task must be created.");
    const clockIn = await authorizedRequest(baseUrl, "/actions/clockWork", manager.token, {
      method: "POST",
      body: { workLog: { workDate: "2026-08-10", memo: "QA clock in" } }
    });
    const clockOut = await authorizedRequest(baseUrl, "/actions/clockWork", manager.token, {
      method: "POST",
      body: { workLog: { workDate: "2026-08-10", memo: "QA clock out" } }
    });
    assert(clockIn.clockInAt && clockOut.clockOutAt, "Clock-in and clock-out must both work.");
    const meeting = await authorizedRequest(baseUrl, "/actions/createMeeting", manager.token, {
      method: "POST",
      body: { meeting: { title: `QA meeting ${suffix}`, participantIds: ["manager-1", "teacher-1"], date: "2026-08-11", startTime: "10:00" } }
    });
    assert(meeting.participantIds.includes("manager-1") && meeting.participantIds.includes("teacher-1"), "Meeting must keep non-student participants.");
    const event = await authorizedRequest(baseUrl, "/actions/createCalendarEvent", manager.token, {
      method: "POST",
      body: { calendarEvent: { title: `QA event ${suffix}`, date: "2026-08-12", startTime: "11:00", targetRoles: ["owner", "teacher"] } }
    });
    assert(event.targetRoles.includes("owner") && event.targetRoles.includes("teacher"), "Calendar target roles must persist.");
    const notice = await authorizedRequest(baseUrl, "/actions/createNotice", manager.token, {
      method: "POST",
      body: { notice: { title: `QA notice ${suffix}`, body: "QA notice body", targetRoles: ["teacher", "student"], pinned: true } }
    });
    assert(notice.targetRoles.includes("teacher") && notice.targetRoles.includes("student"), "Notice target roles must persist.");
    const settingsDenied = await authorizedRequest(baseUrl, "/actions/updatePublicSettings", manager.token, {
      method: "POST",
      body: { publicSettings: { loginNotice: "manager should not update" } },
      allowFailure: true
    });
    assert(settingsDenied.status === 403, "Manager must not update public settings.");
    const settings = await authorizedRequest(baseUrl, "/actions/updatePublicSettings", owner.token, {
      method: "POST",
      body: { publicSettings: { loginNotice: `QA login notice ${suffix}`, academyPhone: "010-0000-0000" } }
    });
    assert(settings.loginNotice.includes("QA login notice"), "Owner must update public settings.");
  });

  await record("data", "data quality, export, import guards, and audit log coverage", async () => {
    const quality = await authorizedRequest(baseUrl, "/data-quality", owner.token);
    assert(!quality.summary.brokenReferences, "QA flow must not create broken references.");
    const exported = await authorizedRequest(baseUrl, "/data-export", owner.token);
    assert(exported.data.accounts.every((account) => !("password" in account)), "Export must not expose passwords.");
    assert(Array.isArray(exported.data.sessions) && exported.data.sessions.length === 0, "Export must not expose sessions.");
    const invalidImport = await authorizedRequest(baseUrl, "/data-import", owner.token, {
      method: "POST",
      body: { export: { schema: "bad-schema", data: {} } },
      allowFailure: true
    });
    assert(invalidImport.status === 400, "Invalid import schema must be rejected.");
    const managerImport = await authorizedRequest(baseUrl, "/data-import", manager.token, {
      method: "POST",
      body: { export: exported },
      allowFailure: true
    });
    assert(managerImport.status === 403, "Manager must not import data.");
    const imported = await authorizedRequest(baseUrl, "/data-import", owner.token, {
      method: "POST",
      body: { export: exported, temporaryPassword: "qa-import-123" }
    });
    assert(imported.summary.accounts >= 4 && imported.summary.students >= 28, "Valid import must preserve account and student counts.");
    const auditLogs = await authorizedRequest(baseUrl, "/audit-logs", owner.token);
    for (const action of ["create_student", "create_account", "approve_account_request", "reject_account_request", "create_lesson", "update_attendance", "create_lesson_log", "create_reservation", "create_registration", "create_task", "clock_in", "clock_out", "create_meeting", "create_calendar_event", "create_notice", "update_public_settings", "export_data", "import_data"]) {
      assert(auditLogs.some((log) => log.action === action), `Audit log must include ${action}.`);
    }
  });
}

async function startServer({ port, dataFile, tempPrefix, env = {}, keepTemp = false }) {
  const tempDir = dataFile && dataFile !== "memory" ? null : mkdtempSync(join(tmpdir(), tempPrefix));
  const resolvedDataFile = dataFile === "memory"
    ? "memory"
    : dataFile || join(tempDir, "version3-feature-data.json");
  const child = spawn(process.execPath, ["server/version3-local-server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
      VERSION3_LOCAL_SERVER_PORT: String(port),
      VERSION3_LOCAL_SERVER_PASSWORD: seedPassword,
      VERSION3_OWNER_INITIAL_PASSWORD: ownerPassword,
      VERSION3_LOCAL_DATA_FILE: resolvedDataFile
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      await request(url, "/health");
      return {
        url,
        dataFile: resolvedDataFile,
        tempDir,
        stop: async () => {
          if (child.exitCode == null && child.signalCode == null) {
            const closed = new Promise((resolve) => child.once("close", resolve));
            child.kill();
            await closed;
          }
          if (tempDir && !keepTemp) rmSync(tempDir, { recursive: true, force: true });
        }
      };
    } catch {
      await delay(250);
    }
  }
  child.kill();
  if (tempDir && !keepTemp) rmSync(tempDir, { recursive: true, force: true });
  throw new Error(`Version.3 server did not start on ${url}.`);
}

async function createStudent(baseUrl, token, name, teacherId = "teacher-1", extra = {}) {
  return authorizedRequest(baseUrl, "/actions/createStudent", token, {
    method: "POST",
    body: {
      student: {
        name,
        status: "등록대기",
        teacherId,
        teacherName: teacherId === "teacher-1" ? "황휘현" : "미정",
        major: "QA",
        goal: "QA verification",
        ...extra
      }
    }
  });
}

async function createAccount(baseUrl, token, account, allowFailure = false) {
  return authorizedRequest(baseUrl, "/accounts", token, {
    method: "POST",
    body: { account },
    allowFailure
  });
}

async function login(baseUrl, loginId, loginPassword, allowFailure = false) {
  return request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId, password: loginPassword },
    allowFailure
  });
}

async function authorizedRequest(baseUrl, path, token, options = {}) {
  return request(baseUrl, path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }
  });
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    if (options.allowFailure) return { ok: false, status: response.status, error: payload.error || response.statusText, ...payload };
    throw new Error(`${options.method || "GET"} ${path} failed: ${payload.error || response.statusText}`);
  }
  return Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
}

async function record(section, name, fn) {
  try {
    await fn();
    pass(section, name);
  } catch (error) {
    results.push({ section, name, status: "failed", error: error instanceof Error ? error.message : String(error) });
    throw new Error(`${section}: ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function pass(section, name) {
  results.push({ section, name, status: "passed" });
}

function printSummary() {
  const passed = results.filter((item) => item.status === "passed").length;
  const failed = results.filter((item) => item.status === "failed");
  console.log(`Version.3 feature suite summary: ${passed} passed, ${failed.length} failed.`);
  console.log(`Storage modes: memory=${context.storage.memory}; file=${context.storage.file}; postgres=${context.storage.postgres}`);
  console.log(`Base44: ${context.base44}`);
  if (mainDataFile) console.log(`File-mode fixture: ${mainDataFile}`);
  for (const item of failed) console.error(`- ${item.section}: ${item.name}: ${item.error}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
