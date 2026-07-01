import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const explicitBaseUrl = (process.env.VERSION3_SERVER_VERIFY_BASE_URL || process.env.NEXT_PUBLIC_VERSION3_API_BASE_URL || "").trim();
const password = process.env.VERSION3_SERVER_VERIFY_PASSWORD || process.env.VERSION3_LOCAL_SERVER_PASSWORD || "version3";
const localPort = Number(process.env.VERSION3_LOCAL_SERVER_PORT || 4303);
let serverProcess;
let tempDataDir;
let tempDataFile;

try {
  if (!explicitBaseUrl) await assertPublicStartupGuard();
  const baseUrl = explicitBaseUrl || await startLocalServer();
  await runVerification(baseUrl.replace(/\/+$/, ""));
  console.log(`Version.3 server verification passed: ${baseUrl}`);
} finally {
  if (serverProcess) serverProcess.kill();
  if (tempDataDir) rmSync(tempDataDir, { recursive: true, force: true });
}

async function startLocalServer() {
  const url = `http://127.0.0.1:${localPort}`;
  tempDataDir = mkdtempSync(join(tmpdir(), "bonsung-version3-"));
  tempDataFile = join(tempDataDir, "server-data.json");
  serverProcess = spawn(process.execPath, ["server/version3-local-server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, VERSION3_LOCAL_SERVER_PORT: String(localPort), VERSION3_LOCAL_SERVER_PASSWORD: password, VERSION3_LOCAL_DATA_FILE: tempDataFile },
    stdio: ["ignore", "pipe", "pipe"]
  });

  serverProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await request(url, "/health");
      return url;
    } catch {
      await delay(250);
    }
  }
  throw new Error("Local Version.3 server did not start in time.");
}

async function runVerification(baseUrl) {
  const health = await request(baseUrl, "/health");
  assert(health.service === "bonsung-version3-server" && health.status === "ok", "/health must return Version.3 server health.");
  if (explicitBaseUrl) {
    assert(health.persistence?.enabled === true, "External Version.3 server must use persistent storage.");
    assert(health.persistence?.backupEnabled === true, "External Version.3 server must keep data backups enabled.");
    assert(health.cors?.restricted === true, "External Version.3 server must restrict CORS to official UI origins.");
  }

  const owner = await login(baseUrl, "owner");
  const manager = await login(baseUrl, "manager");
  const teacher = await login(baseUrl, "teacher");
  const student = await login(baseUrl, "student");

  assert(owner.user.role === "owner", "Owner login must return role=owner.");
  assert(manager.user.role === "manager", "Manager login must return role=manager.");
  assert(teacher.user.role === "teacher", "Teacher login must return role=teacher.");
  assert(student.user.role === "student", "Student login must return role=student.");
  assert(Boolean(owner.expiresAt), "Login response must include expiresAt.");
  assert(typeof owner.user.mustChangePassword === "boolean", "Login user must include mustChangePassword.");
  assert(Boolean(student.user.linkedStudentId || student.user.linked_student_id), "Student login must include linkedStudentId.");

  const throttledLoginId = `rate-limit-${Date.now()}`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failedLogin = await request(baseUrl, "/auth/login", {
      method: "POST",
      body: { loginId: throttledLoginId, password: "wrong-password" },
      allowFailure: true
    });
    assert(failedLogin?.ok === false, "Invalid login attempts must fail.");
  }
  const throttledLogin = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId: throttledLoginId, password: "wrong-password" },
    allowFailure: true
  });
  assert(
    throttledLogin?.ok === false && /too many login attempts/i.test(throttledLogin.error || "") && typeof throttledLogin.retryAfterSeconds === "number",
    "Repeated invalid login attempts must be temporarily throttled."
  );

  const bootstrap = await authorizedRequest(baseUrl, "/bootstrap", owner.token);
  for (const key of ["teachers", "students", "consultations", "notices", "dashboardWorkQueue"]) {
    assert(Array.isArray(bootstrap[key]), `/bootstrap must return ${key} array.`);
  }
  assert(bootstrap.teachers.some((item) => item.name === "강은미" && item.role === "Director"), "Bootstrap must include Notion staff data.");
  assert(bootstrap.students.some((item) => item.name === "장윤호"), "Bootstrap must include Notion student data.");
  assert(bootstrap.courses.some((item) => item.name === "본성 프리컬리지"), "Bootstrap must include Notion program data.");

  const accounts = await authorizedRequest(baseUrl, "/accounts", owner.token);
  assert(Array.isArray(accounts) && accounts.some((account) => account.role === "student"), "/accounts must include student accounts.");
  assert(accounts.every((account) => !("password" in account)), "/accounts must not expose password fields.");

  const history = await authorizedRequest(baseUrl, "/account-history", owner.token);
  assert(Array.isArray(history), "/account-history must return an array.");

  const initialAuditLogs = await authorizedRequest(baseUrl, "/audit-logs", owner.token);
  assert(Array.isArray(initialAuditLogs), "/audit-logs must return an array.");
  assert(
    initialAuditLogs.some((item) => item.action === "login_throttled" && item.targetId === throttledLoginId && item.metadata?.failureCount >= 5 && item.metadata?.lockSeconds > 0),
    "/audit-logs must include login throttling security audit entries."
  );

  const quality = await authorizedRequest(baseUrl, "/data-quality", owner.token);
  assert(Boolean(quality.summary), "/data-quality must include summary.");
  assert(Array.isArray(quality.checks), "/data-quality must include checks array.");
  assert(typeof quality.summary.auditLogs === "number", "/data-quality summary must include auditLogs count.");
  assert(typeof quality.summary.brokenReferences === "number", "/data-quality summary must include brokenReferences count.");
  assert(typeof quality.summary.backupEnabled === "boolean", "/data-quality summary must include backupEnabled.");
  assert(
    quality.checks.some((item) => item.id === "reference-integrity"),
    "/data-quality checks must include reference-integrity."
  );

  const dataExport = await authorizedRequest(baseUrl, "/data-export", owner.token);
  assert(dataExport.schema === "bonsung-version3-local-v1", "/data-export must include the Version.3 export schema.");
  assert(dataExport.exportedBy.accountId === owner.user.id, "/data-export must include the exporting account.");
  assert(dataExport.data.accounts.every((account) => !("password" in account)), "/data-export must not expose account passwords.");
  assert(Array.isArray(dataExport.data.students), "/data-export must include operating data arrays.");
  assert(
    dataExport.data.auditLogs.some((item) => item.action === "export_data" && item.actorId === owner.user.id),
    "/data-export must include its own export_data audit entry."
  );
  assert(
    dataExport.data.auditLogs.some((item) => item.action === "login_throttled" && item.targetType === "security"),
    "/data-export must include login throttling audit entries."
  );
  const rejectedManagerDataImport = await authorizedRequest(baseUrl, "/data-import", manager.token, {
    method: "POST",
    body: { export: dataExport },
    allowFailure: true
  });
  assert(rejectedManagerDataImport?.ok === false, "Only owner accounts must be allowed to import Version.3 data.");
  const rejectedManagerBackups = await authorizedRequest(baseUrl, "/data-backups", manager.token, { allowFailure: true });
  assert(rejectedManagerBackups?.ok === false, "Only owner accounts must be allowed to list Version.3 data backups.");
  const backupList = await authorizedRequest(baseUrl, "/data-backups", owner.token);
  assert(backupList.backupEnabled === true, "/data-backups must report whether backups are enabled.");
  assert(Array.isArray(backupList.backups) && backupList.backups.length > 0, "/data-backups must list local backup files after persisted writes.");
  assert(
    backupList.backups.every((item) => typeof item.name === "string" && item.name.endsWith(".bak") && !item.name.includes("/") && !item.name.includes("\\") && typeof item.sizeBytes === "number"),
    "/data-backups must expose backup metadata without full filesystem paths."
  );

  const createdStudent = await authorizedRequest(baseUrl, "/actions/createStudent", owner.token, {
    method: "POST",
    body: {
      student: {
        name: "Verification New Student",
        birth_date: "2011-03-04",
        phone: "010-0000-0000",
        major: "Vocal",
        goal: "Version.3 server student input",
        status: "등록대기",
        memo: "Created by server verification."
      }
    }
  });
  assert(createdStudent.id && createdStudent.student_id === createdStudent.id, "createStudent must return a server student id.");
  assert(createdStudent.name === "Verification New Student", "createStudent must return the created student record.");

  const rejectedTeacherStudentCreate = await authorizedRequest(baseUrl, "/actions/createStudent", teacher.token, {
    method: "POST",
    body: { student: { name: "Teacher Rejected Student" } },
    allowFailure: true
  });
  assert(rejectedTeacherStudentCreate?.ok === false, "Teacher accounts must not create students without manageStudents permission.");

  const createdTeacher = await authorizedRequest(baseUrl, "/actions/createTeacher", owner.token, {
    method: "POST",
    body: { teacher: { name: "Verification New Teacher", major: "Guitar", memo: "Created by server verification." } }
  });
  assert(createdTeacher.id && createdTeacher.teacher_id === createdTeacher.id, "createTeacher must return a server teacher id.");
  assert(createdTeacher.name === "Verification New Teacher", "createTeacher must return the created teacher record.");

  const createdEnrollment = await authorizedRequest(baseUrl, "/actions/createEnrollment", owner.token, {
    method: "POST",
    body: {
      enrollment: {
        student_id: createdStudent.id,
        teacher_id: "teacher-1",
        subject: "Verification Vocal",
        start_date: "2026-07-02",
        status: "active",
        memo: "Server verification enrollment."
      }
    }
  });
  assert(createdEnrollment.id && createdEnrollment.studentId === createdStudent.id, "createEnrollment must persist a server enrollment.");
  assert(createdEnrollment.status === "수강중", "createEnrollment must normalize active status.");

  const rejectedEnrollmentWithoutTeacher = await authorizedRequest(baseUrl, "/actions/createEnrollment", owner.token, {
    method: "POST",
    body: { enrollment: { student_id: createdStudent.id, teacher_id: "missing-teacher", subject: "Invalid enrollment" } },
    allowFailure: true
  });
  assert(rejectedEnrollmentWithoutTeacher?.ok === false, "createEnrollment must reject invalid teacher references.");

  const createdLesson = await authorizedRequest(baseUrl, "/actions/createLesson", owner.token, {
    method: "POST",
    body: {
      lesson: {
        student_id: createdStudent.id,
        teacher_id: "teacher-1",
        subject: "Verification Vocal",
        lesson_date: "2026-07-02",
        start_time: "15:00",
        duration_minutes: 50,
        status: "예정",
        memo: "Server verification lesson."
      }
    }
  });
  assert(createdLesson.id && createdLesson.studentId === createdStudent.id, "createLesson must persist a server lesson.");
  assert(createdLesson.startsAt.includes("2026-07-02T15:00"), "createLesson must return a usable startsAt value.");

  const updatedAttendance = await authorizedRequest(baseUrl, "/actions/updateAttendance", teacher.token, {
    method: "POST",
    body: {
      attendance: {
        lesson_id: createdLesson.id,
        student_id: createdStudent.id,
        status: "출석",
        makeup_needed: false,
        memo: "Server verification attendance."
      }
    }
  });
  assert(updatedAttendance.id && updatedAttendance.status === "출석", "updateAttendance must persist a server attendance record.");

  const rejectedAttendanceWithoutLesson = await authorizedRequest(baseUrl, "/actions/updateAttendance", teacher.token, {
    method: "POST",
    body: { attendance: { student_id: createdStudent.id, status: "출석" } },
    allowFailure: true
  });
  assert(rejectedAttendanceWithoutLesson?.ok === false, "updateAttendance must reject orphan attendance without a valid lesson.");

  const createdLessonLog = await authorizedRequest(baseUrl, "/actions/createLessonLog", teacher.token, {
    method: "POST",
    body: {
      log: {
        student_id: createdStudent.id,
        teacher_id: "teacher-1",
        lesson_date: "2026-07-02",
        lesson_content: "Server verification note.",
        homework: "Practice slowly.",
        next_goal: "Stable pitch."
      }
    }
  });
  assert(createdLessonLog.id && createdLessonLog.lessonId === createdLesson.id, "createLessonLog must persist a server lesson note linked to the lesson.");

  const rejectedLessonLogWithoutLesson = await authorizedRequest(baseUrl, "/actions/createLessonLog", teacher.token, {
    method: "POST",
    body: { log: { student_id: createdStudent.id, teacher_id: "teacher-1", lesson_date: "2026-07-09", lesson_content: "No lesson." } },
    allowFailure: true
  });
  assert(rejectedLessonLogWithoutLesson?.ok === false, "createLessonLog must reject notes that are not linked to an existing lesson.");

  const createdReservation = await authorizedRequest(baseUrl, "/actions/createReservation", student.token, {
    method: "POST",
    body: {
      reservation: {
        room_id: "room-1",
        reservation_date: "2026-07-02",
        start_time: "20:00",
        end_time: "21:00",
        purpose: "연습",
        memo: "Server verification reservation."
      }
    }
  });
  assert(createdReservation.id && createdReservation.roomId === "room-1", "createReservation must persist a server reservation.");

  const rejectedReservationOverlap = await authorizedRequest(baseUrl, "/actions/createReservation", owner.token, {
    method: "POST",
    body: {
      reservation: {
        room_id: "room-1",
        reservation_date: "2026-07-02",
        start_time: "20:30",
        end_time: "21:30",
        purpose: "연습"
      }
    },
    allowFailure: true
  });
  assert(rejectedReservationOverlap?.ok === false, "createReservation must reject overlapping room reservations.");

  const rejectedReservationTimeOrder = await authorizedRequest(baseUrl, "/actions/createReservation", owner.token, {
    method: "POST",
    body: {
      reservation: {
        room_id: "room-1",
        reservation_date: "2026-07-03",
        start_time: "21:00",
        end_time: "20:00",
        purpose: "연습"
      }
    },
    allowFailure: true
  });
  assert(rejectedReservationTimeOrder?.ok === false, "createReservation must reject end times before start times.");

  const createdRegistration = await authorizedRequest(baseUrl, "/actions/createRegistration", owner.token, {
    method: "POST",
    body: {
      registration: {
        student_id: createdStudent.id,
        registration_type: "검증 수납",
        amount: 123000,
        next_due_date: "2026-07-10",
        payment_status: "청구완료",
        memo: "Server verification registration."
      }
    }
  });
  assert(createdRegistration.id && createdRegistration.amount === 123000, "createRegistration must persist a server payment record.");

  const createdTask = await authorizedRequest(baseUrl, "/actions/createTask", manager.token, {
    method: "POST",
    body: { task: { title: "Server verification task", assignee_id: "manager-1", due_date: "2026-07-05", status: "할일", priority: "보통" } }
  });
  assert(createdTask.id && createdTask.assigneeId === "manager-1", "createTask must persist a server task record.");

  const createdNotice = await authorizedRequest(baseUrl, "/actions/createNotice", manager.token, {
    method: "POST",
    body: { notice: { title: "Server verification notice", category: "검증", body: "Manager notice.", targetRoles: ["owner", "manager"] } }
  });
  assert(createdNotice.id && createdNotice.author === manager.user.name, "Managers must be able to create notices.");

  const rejectedEmptyNotice = await authorizedRequest(baseUrl, "/actions/createNotice", manager.token, {
    method: "POST",
    body: { notice: { title: "", body: "", targetRoles: ["student"] } },
    allowFailure: true
  });
  assert(rejectedEmptyNotice?.ok === false, "createNotice must require both title and body.");

  const rejectedTeacherNotice = await authorizedRequest(baseUrl, "/actions/createNotice", teacher.token, {
    method: "POST",
    body: { notice: { title: "Rejected teacher notice", body: "No permission." } },
    allowFailure: true
  });
  assert(rejectedTeacherNotice?.ok === false, "Teacher accounts must not create notices.");

  const rejectedUnknownAction = await authorizedRequest(baseUrl, "/actions/notARealVersion3Action", owner.token, {
    method: "POST",
    body: {},
    allowFailure: true
  });
  assert(rejectedUnknownAction?.ok === false, "Unknown Version.3 actions must fail instead of pretending to save.");

  const bootstrapAfterWrites = await authorizedRequest(baseUrl, "/bootstrap", owner.token);
  assert(bootstrapAfterWrites.teachers.some((item) => item.id === createdTeacher.id), "/bootstrap must expose server-created teachers.");
  assert(bootstrapAfterWrites.enrollments.some((item) => item.id === createdEnrollment.id), "/bootstrap must expose server-created enrollments.");
  assert(bootstrapAfterWrites.lessons.some((item) => item.id === createdLesson.id), "/bootstrap must expose server-created lessons.");
  assert(bootstrapAfterWrites.attendance.some((item) => item.id === updatedAttendance.id), "/bootstrap must expose server-updated attendance.");
  assert(bootstrapAfterWrites.lessonNotes.some((item) => item.id === createdLessonLog.id), "/bootstrap must expose server-created lesson notes.");
  assert(bootstrapAfterWrites.reservations.some((item) => item.id === createdReservation.id), "/bootstrap must expose server-created reservations.");
  assert(bootstrapAfterWrites.payments.some((item) => item.id === createdRegistration.id), "/bootstrap must expose server-created payment records.");
  assert(bootstrapAfterWrites.tasks.some((item) => item.id === createdTask.id), "/bootstrap must expose server-created tasks.");
  assert(bootstrapAfterWrites.notices.some((item) => item.id === createdNotice.id), "/bootstrap must expose server-created notices.");

  const createdConsultation = await authorizedRequest(baseUrl, "/actions/createConsultation", student.token, {
    method: "POST",
    body: { consultation: { goal: "검증 상담요청", memo: "Server verification request." } }
  });
  assert(createdConsultation.status === "접수됨", "createConsultation must create a one-way request with 접수됨 status.");
  assert(
    Array.isArray(createdConsultation.unreadForAccountIds) && createdConsultation.unreadForAccountIds.includes("manager-1"),
    "createConsultation must mark owner/manager accounts as unread recipients."
  );

  const rejectedStudentTriage = await authorizedRequest(baseUrl, "/actions/updateConsultationStatus", student.token, {
    method: "POST",
    body: { consultationId: createdConsultation.id, status: "종결", assignedTo: "student-1-account" },
    allowFailure: true
  });
  assert(rejectedStudentTriage?.ok === false, "Student accounts must not be allowed to triage consultation requests.");

  const updatedConsultation = await authorizedRequest(baseUrl, "/actions/updateConsultationStatus", owner.token, {
    method: "POST",
    body: { consultationId: createdConsultation.id, status: "전달 필요", assignedTo: "teacher-1" }
  });
  assert(updatedConsultation.status === "전달 필요", "Owner triage must update consultation status.");
  assert(updatedConsultation.assignedTo === "teacher-1", "Owner triage must assign consultation to a teacher account.");
  assert(
    Array.isArray(updatedConsultation.unreadForAccountIds) && updatedConsultation.unreadForAccountIds.includes("teacher-1") && !updatedConsultation.unreadForAccountIds.includes("owner-1"),
    "Owner triage must mark the assignee unread and clear the acting owner from unread recipients."
  );

  const acknowledgedConsultation = await authorizedRequest(baseUrl, "/actions/acknowledgeConsultation", teacher.token, {
    method: "POST",
    body: { consultationId: createdConsultation.id }
  });
  assert(
    Array.isArray(acknowledgedConsultation.unreadForAccountIds) && !acknowledgedConsultation.unreadForAccountIds.includes("teacher-1"),
    "acknowledgeConsultation must clear the acting account from unread recipients."
  );

  const rejectedStudentAssignee = await authorizedRequest(baseUrl, "/actions/updateConsultationStatus", owner.token, {
    method: "POST",
    body: { consultationId: createdConsultation.id, status: "확인 중", assignedTo: "student-1-account" },
    allowFailure: true
  });
  assert(rejectedStudentAssignee?.ok === false, "Consultation assignee must not be a student account.");

  const rejectedSelfStatusChange = await authorizedRequest(baseUrl, "/accounts/owner-1/status", owner.token, {
    method: "PATCH",
    body: { active: false },
    allowFailure: true
  });
  assert(rejectedSelfStatusChange?.ok === false, "Account administrators must not pause their own account.");

  const rejectedSelfPasswordReset = await authorizedRequest(baseUrl, "/accounts/owner-1/password", owner.token, {
    method: "PATCH",
    body: { password: `version3-self-reset-${Date.now()}` },
    allowFailure: true
  });
  assert(rejectedSelfPasswordReset?.ok === false, "Account administrators must use profile settings instead of resetting their own password.");

  const rejectedSelfPermissionChange = await authorizedRequest(baseUrl, "/accounts/owner-1/permissions", owner.token, {
    method: "PATCH",
    body: { permissions: { manageAccounts: false } },
    allowFailure: true
  });
  assert(rejectedSelfPermissionChange?.ok === false, "Account administrators must not edit their own permissions.");

  const rejectedShortInitialPassword = await authorizedRequest(baseUrl, "/accounts", owner.token, {
    method: "POST",
    body: {
      account: {
        loginId: `short-password-${Date.now()}`,
        name: "Short Password Account",
        role: "manager",
        initialPassword: "short"
      }
    },
    allowFailure: true
  });
  assert(rejectedShortInitialPassword?.ok === false, "POST /accounts must reject short initial passwords.");

  const rejectedDuplicateLoginId = await authorizedRequest(baseUrl, "/accounts", owner.token, {
    method: "POST",
    body: {
      account: {
        loginId: "owner",
        name: "Duplicate Owner Login",
        role: "manager",
        initialPassword: password
      }
    },
    allowFailure: true
  });
  assert(rejectedDuplicateLoginId?.ok === false, "POST /accounts must reject duplicate login IDs.");

  const rejectedMissingLinkedStudent = await authorizedRequest(baseUrl, "/accounts", owner.token, {
    method: "POST",
    body: {
      account: {
        loginId: `missing-student-${Date.now()}`,
        name: "Missing Student Account",
        role: "student",
        linkedStudentId: "missing-student-id",
        initialPassword: password
      }
    },
    allowFailure: true
  });
  assert(rejectedMissingLinkedStudent?.ok === false, "POST /accounts must reject missing linked students.");

  const createdAccount = await authorizedRequest(baseUrl, "/accounts", owner.token, {
    method: "POST",
    body: {
      account: {
        loginId: `student-${Date.now()}`,
        name: "Verification Student",
        role: "student",
        email: "verification-student@bonsung.local",
        phone: "",
        linkedStudentId: createdStudent.id,
        initialPassword: password
      }
    }
  });
  assert(createdAccount.role === "student" && createdAccount.linkedStudentId === createdStudent.id, "POST /accounts must create a linked student account.");
  assert(createdAccount.status === "invited", "POST /accounts must create student accounts in invited status.");

  const invitedStudentLogin = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId: createdAccount.loginId, password }
  });
  assert(invitedStudentLogin.user.role === "student", "Invited student accounts must be able to sign in with their initial password.");
  assert(invitedStudentLogin.user.mustChangePassword === true, "Invited student first login must require password change.");
  const invitedStudentBootstrap = await authorizedRequest(baseUrl, "/bootstrap", invitedStudentLogin.token);
  assert(Array.isArray(invitedStudentBootstrap.students), "Invited student first login must activate a usable server session.");
  const accountsAfterInvitedLogin = await authorizedRequest(baseUrl, "/accounts", owner.token);
  assert(
    accountsAfterInvitedLogin.some((account) => account.id === createdAccount.id && account.status === "active"),
    "Invited account first login must activate the account."
  );

  await authorizedRequest(baseUrl, `/accounts/${encodeURIComponent(createdAccount.id)}/password`, owner.token, {
    method: "PATCH",
    body: { password }
  });

  await authorizedRequest(baseUrl, `/accounts/${encodeURIComponent(createdAccount.id)}/status`, owner.token, {
    method: "PATCH",
    body: { active: false }
  });

  const resetPassword = `version3-reset-${Date.now()}`;
  const finalPassword = `version3-final-${Date.now()}`;
  const rejectedShortResetPassword = await authorizedRequest(baseUrl, "/accounts/teacher-1/password", owner.token, {
    method: "PATCH",
    body: { password: "short" },
    allowFailure: true
  });
  assert(rejectedShortResetPassword?.ok === false, "Password reset must reject short temporary passwords.");
  await authorizedRequest(baseUrl, "/accounts/teacher-1/password", owner.token, {
    method: "PATCH",
    body: { password: resetPassword }
  });
  const oldTeacherTokenAfterReset = await authorizedRequest(baseUrl, "/bootstrap", teacher.token, { allowFailure: true });
  assert(oldTeacherTokenAfterReset?.ok === false, "Password reset must invalidate existing sessions for the target account.");
  const resetTeacher = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId: "teacher", password: resetPassword }
  });
  assert(resetTeacher.user.mustChangePassword === true, "Password reset login must require password change.");
  const changedPassword = await authorizedRequest(baseUrl, "/auth/change-password", resetTeacher.token, {
    method: "POST",
    body: { currentPassword: resetPassword, newPassword: finalPassword }
  });
  assert(changedPassword.user.mustChangePassword === false, "Password change must clear mustChangePassword.");
  await authorizedRequest(baseUrl, "/auth/logout", resetTeacher.token, { method: "POST" });
  const afterLogout = await authorizedRequest(baseUrl, "/bootstrap", resetTeacher.token, { allowFailure: true });
  assert(afterLogout?.ok === false, "Logged-out token must not authorize bootstrap.");

  await authorizedRequest(baseUrl, "/accounts/manager-1/permissions", owner.token, {
    method: "PATCH",
    body: { permissions: { viewPayments: false } }
  });
  const oldManagerTokenAfterPermissionChange = await authorizedRequest(baseUrl, "/bootstrap", manager.token, { allowFailure: true });
  assert(oldManagerTokenAfterPermissionChange?.ok === false, "Permission changes must invalidate existing sessions for the target account.");

  const auditLogs = await authorizedRequest(baseUrl, "/audit-logs", owner.token);
  assert(
    auditLogs.some((item) => item.action === "export_data" && item.actorId === owner.user.id),
    "/audit-logs must include data export audit entries."
  );
  assert(
    auditLogs.some((item) => item.action === "login_throttled" && item.targetId === throttledLoginId && item.actorId === "system"),
    "/audit-logs must include system login throttling audit entries."
  );
  assert(
    auditLogs.some((item) => item.action === "create_account" && item.targetId === createdAccount.id),
    "/audit-logs must include account creation audit entries."
  );
  assert(
    auditLogs.some((item) => item.action === "create_student" && item.targetId === createdStudent.id),
    "/audit-logs must include student creation audit entries."
  );
  for (const [action, targetId] of [
    ["create_enrollment", createdEnrollment.id],
    ["create_teacher", createdTeacher.id],
    ["create_lesson", createdLesson.id],
    ["update_attendance", updatedAttendance.id],
    ["create_lesson_log", createdLessonLog.id],
    ["create_reservation", createdReservation.id],
    ["create_registration", createdRegistration.id],
    ["create_task", createdTask.id],
    ["create_notice", createdNotice.id]
  ]) {
    assert(
      auditLogs.some((item) => item.action === action && item.targetId === targetId),
      `/audit-logs must include ${action} audit entries.`
    );
  }
  assert(
    auditLogs.some((item) => item.action === "create_consultation" && item.targetId === createdConsultation.id),
    "/audit-logs must include consultation creation audit entries."
  );
  assert(
    auditLogs.some((item) => item.action === "update_consultation_status" && item.targetId === createdConsultation.id),
    "/audit-logs must include consultation triage audit entries."
  );
  assert(
    auditLogs.some((item) => item.action === "acknowledge_consultation" && item.targetId === createdConsultation.id),
    "/audit-logs must include consultation acknowledgement audit entries."
  );
  assert(
    auditLogs.some((item) => item.action === "change_password" && item.targetId === "teacher-1"),
    "/audit-logs must include password change audit entries."
  );
  assert(
    auditLogs.some((item) => item.action === "reset_password" && item.targetId === "teacher-1" && item.metadata?.invalidatedSessions > 0),
    "/audit-logs must include session invalidation metadata for password reset entries."
  );
  assert(
    auditLogs.some((item) => item.action === "update_permissions" && item.targetId === "manager-1" && item.metadata?.invalidatedSessions > 0),
    "/audit-logs must include session invalidation metadata for permission changes."
  );

  const importResult = await authorizedRequest(baseUrl, "/data-import", owner.token, {
    method: "POST",
    body: { export: dataExport }
  });
  assert(importResult.summary?.students === dataExport.data.students.length, "/data-import must restore the exported student count.");
  assert(importResult.temporaryPasswordApplied === 0, "/data-import must preserve current account passwords when matching accounts already exist.");
  const restoredBootstrap = await authorizedRequest(baseUrl, "/bootstrap", owner.token);
  assert(
    !restoredBootstrap.students.some((student) => student.id === createdStudent.id),
    "/data-import must replace later test data with the imported snapshot."
  );
  const restoredAuditLogs = await authorizedRequest(baseUrl, "/audit-logs", owner.token);
  assert(
    restoredAuditLogs.some((item) => item.action === "import_data" && item.actorId === owner.user.id),
    "/audit-logs must include data import audit entries."
  );
  if (tempDataFile) assertLocalStoredPasswordHashes();
}

async function login(baseUrl, loginId) {
  return request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId, password }
  });
}

function authorizedRequest(baseUrl, path, token, options = {}) {
  return request(baseUrl, path, {
    method: options.method || "GET",
    body: options.body,
    headers: { Authorization: `Bearer ${token}` },
    allowFailure: options.allowFailure
  });
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body == null ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${path} returned non-JSON response: ${text.slice(0, 200)}`);
  }

  if (!response.ok || parsed?.ok === false) {
    if (options.allowFailure) return parsed?.data ?? parsed;
    throw new Error(`${path} failed: ${parsed?.error || response.status}`);
  }

  return parsed && Object.prototype.hasOwnProperty.call(parsed, "data") ? parsed.data : parsed;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertLocalStoredPasswordHashes() {
  const snapshot = JSON.parse(readFileSync(tempDataFile, "utf8"));
  assert(
    snapshot.accounts.every((account) => typeof account.password === "string" && account.password.startsWith("scrypt$")),
    "Local Version.3 server must store account passwords as scrypt hashes."
  );
  assert(
    snapshot.accounts.every((account) => account.password !== password),
    "Local Version.3 server must not persist plaintext account passwords."
  );
}

async function assertPublicStartupGuard() {
  await assertRejectedPublicStartup(
    {
      VERSION3_LOCAL_SERVER_PASSWORD: "version3",
      VERSION3_ALLOWED_ORIGINS: "https://bonsung.example.com",
      VERSION3_LOCAL_DATA_FILE: "memory"
    },
    /non-default value/i,
    "Public Version.3 server startup must reject the default seed password."
  );
  await assertRejectedPublicStartup(
    {
      VERSION3_LOCAL_SERVER_PASSWORD: "safe-public-password",
      VERSION3_ALLOWED_ORIGINS: "https://bonsung.example.com",
      VERSION3_LOCAL_DATA_FILE: "memory"
    },
    /persistent file/i,
    "Public Version.3 server startup must reject memory-only storage."
  );
  await assertRejectedPublicStartup(
    {
      VERSION3_LOCAL_SERVER_PASSWORD: "safe-public-password",
      VERSION3_ALLOWED_ORIGINS: "https://bonsung.example.com",
      VERSION3_LOCAL_DATA_FILE: tempDataFile || "version3-data.json",
      VERSION3_DISABLE_LOCAL_BACKUPS: "true"
    },
    /backups enabled/i,
    "Public Version.3 server startup must reject disabled data backups."
  );
}

function assertRejectedPublicStartup(extraEnv, errorPattern, message) {
  return new Promise((resolve, reject) => {
    const guardProcess = spawn(process.execPath, ["server/version3-local-server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        VERSION3_SERVER_HOST: "0.0.0.0",
        VERSION3_LOCAL_SERVER_PORT: String(localPort + 1000),
        ...extraEnv
      },
      stdio: ["ignore", "ignore", "pipe"]
    });
    let stderr = "";
    guardProcess.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    guardProcess.on("error", reject);
    guardProcess.on("close", (code) => {
      try {
        assert(code !== 0 && errorPattern.test(stderr), message);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
