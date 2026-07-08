import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const explicitBaseUrl = (process.env.VERSION3_SERVER_VERIFY_BASE_URL || process.env.NEXT_PUBLIC_VERSION3_API_BASE_URL || "").trim();
const password = process.env.VERSION3_SERVER_VERIFY_PASSWORD || process.env.VERSION3_LOCAL_SERVER_PASSWORD || "version3";
const ownerPassword = process.env.VERSION3_OWNER_INITIAL_PASSWORD || process.env.VERSION3_ADMIN_INITIAL_PASSWORD || "owner-test-123";
const localPort = Number(process.env.VERSION3_LOCAL_SERVER_PORT || 4303);
let serverProcess;
let tempDataDir;

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
  const tempDataFile = join(tempDataDir, "server-data.json");
  serverProcess = spawn(process.execPath, ["server/version3-local-server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VERSION3_LOCAL_SERVER_PORT: String(localPort),
      VERSION3_LOCAL_SERVER_PASSWORD: password,
      VERSION3_OWNER_INITIAL_PASSWORD: ownerPassword,
      VERSION3_LOCAL_DATA_FILE: tempDataFile
    },
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

  const owner = await login(baseUrl, "owner", ownerPassword);
  const manager = await login(baseUrl, "manager");
  const teacher = await login(baseUrl, "teacher");
  const student = await login(baseUrl, "student");

  assert(owner.user.role === "owner", "Owner login must return role=owner.");
  assert(manager.user.role === "manager", "Manager login must return role=manager.");
  assert(teacher.user.role === "teacher", "Teacher login must return role=teacher.");
  assert(student.user.role === "student", "Student login must return role=student.");
  assert(Boolean(owner.expiresAt), "Login response must include expiresAt.");
  assert(Boolean(student.user.linkedStudentId || student.user.linked_student_id), "Student login must include linkedStudentId.");
  assert(student.user.permissions?.viewPayments !== true, "Student accounts must not receive payment-view permission by default.");
  assert(manager.user.permissions?.resetPasswords === true, "Manager accounts must be able to reset passwords.");
  assert(manager.user.permissions?.reviewAccountRequests === true, "Manager accounts must be able to review account requests.");
  assert(manager.user.permissions?.manageAccounts !== true, "Manager accounts must not directly manage account records.");
  assert(owner.user.permissions?.manageAccounts === true, "Owner accounts must directly manage account records.");
  assert(owner.user.permissions?.managePublicSettings === true, "Owner accounts must manage public settings.");

  const studentBootstrap = await authorizedRequest(baseUrl, "/bootstrap", student.token);
  assert(Array.isArray(studentBootstrap.payments) && studentBootstrap.payments.length === 0, "Student bootstrap must not expose payment records.");
  assert(Array.isArray(studentBootstrap.enrollments) && studentBootstrap.enrollments.length === 0, "Student bootstrap must not expose enrollment operations.");

  const ownerBootstrap = await authorizedRequest(baseUrl, "/bootstrap", owner.token);
  for (const key of ["teachers", "students", "consultations", "courses", "payments", "tasks", "notices", "dashboardWorkQueue", "workLogs", "meetings", "calendarEvents", "accountRequests"]) {
    assert(Array.isArray(ownerBootstrap[key]), `/bootstrap must return ${key} array.`);
  }
  assert(ownerBootstrap.students.length >= 28, "Bootstrap must include selected Notion student rows.");
  assert(ownerBootstrap.courses.length === 7, "Bootstrap must include the 7 current Notion Program DB rows.");
  assert(ownerBootstrap.calendarEvents.length === 3, "Bootstrap must include only the 3 public Notion opening schedule rows.");
  for (const title of ["신규 수강상담 및 사전등록 시작", "파운딩멤버 보컬 수업 시작", "신규 등록자 수업 시작"]) {
    assert(ownerBootstrap.calendarEvents.some((event) => event.title === title), `Bootstrap must include public opening schedule: ${title}.`);
  }
  for (const privateTitle of ["인테리어 공사 종료", "홈페이지 제작 완료", "SNS 업로드 시작", "강의실 수업 시뮬레이션", "수업 가능 컨디션 원내 정리 완료", "프리컬리지 과정 홍보 시작"]) {
    assert(!ownerBootstrap.calendarEvents.some((event) => event.title === privateTitle), `Bootstrap must not include private opening schedule: ${privateTitle}.`);
  }
  assert(ownerBootstrap.publicSettings && typeof ownerBootstrap.publicSettings === "object", "/bootstrap must return publicSettings.");

  const accounts = await authorizedRequest(baseUrl, "/accounts", owner.token);
  for (const role of ["owner", "manager", "teacher", "student"]) {
    assert(accounts.some((account) => account.role === role), `/accounts must include ${role} accounts.`);
  }
  assert(accounts.every((account) => !("password" in account)), "/accounts must not expose password fields.");

  const managerAccountRequests = await authorizedRequest(baseUrl, "/account-requests", manager.token);
  assert(Array.isArray(managerAccountRequests), "Manager must be able to list account requests.");
  const rejectedManagerDirectAccountCreate = await authorizedRequest(baseUrl, "/accounts", manager.token, {
    method: "POST",
    body: { account: { loginId: `manager-direct-${Date.now()}`, name: "Manager Direct", role: "teacher", initialPassword: password } },
    allowFailure: true
  });
  assert(rejectedManagerDirectAccountCreate?.ok === false, "Manager must not directly create accounts.");

  const createdStudent = await authorizedRequest(baseUrl, "/actions/createStudent", owner.token, {
    method: "POST",
    body: {
      student: {
        name: "Verification New Student",
        phone: "010-0000-0000",
        major: "Vocal",
        goal: "Version.3 verification",
        status: "상담중",
        teacherId: "teacher-1",
        teacherName: "황휘현"
      }
    }
  });
  assert(createdStudent.id && createdStudent.student_id === createdStudent.id, "createStudent must return a server student id.");

  const createdStudentAccount = await authorizedRequest(baseUrl, "/accounts", owner.token, {
    method: "POST",
    body: {
      account: {
        loginId: `student-${Date.now()}`,
        name: "Verification Student",
        role: "student",
        email: "verification-student@bonsung.local",
        initialPassword: password,
        linkedStudentId: createdStudent.id
      }
    }
  });
  assert(createdStudentAccount.role === "student" && createdStudentAccount.linkedStudentId === createdStudent.id, "POST /accounts must create linked student accounts.");

  const accountRequestStudent = await authorizedRequest(baseUrl, "/actions/createStudent", owner.token, {
    method: "POST",
    body: { student: { name: "Verification Requested Student", status: "상담중" } }
  });
  const accountRequest = await request(baseUrl, "/account-requests", {
    method: "POST",
    body: {
      loginId: `request-student-${Date.now()}`,
      name: "Verification Requested Student",
      requestedRole: "student",
      linkedStudentId: accountRequestStudent.id,
      message: "Please create a Version.3 student account."
    }
  });
  const approvedRequest = await authorizedRequest(baseUrl, `/account-requests/${encodeURIComponent(accountRequest.id)}/review`, manager.token, {
    method: "PATCH",
    body: { decision: "approve", linkedStudentId: accountRequestStudent.id, initialPassword: password, memo: "Manager approval verification." }
  });
  assert(approvedRequest.account?.role === "student", "Manager approval must create a student account.");

  const createdLesson = await authorizedRequest(baseUrl, "/actions/createLesson", owner.token, {
    method: "POST",
    body: {
      lesson: {
        student_id: createdStudent.id,
        teacher_id: "teacher-1",
        subject: "Vocal Verification",
        lesson_date: "2026-07-08",
        start_time: "14:00",
        duration_minutes: 60
      }
    }
  });
  assert(createdLesson.id && createdLesson.studentId === createdStudent.id, "createLesson must persist a server lesson.");

  const createdLessonLog = await authorizedRequest(baseUrl, "/actions/createLessonLog", teacher.token, {
    method: "POST",
    body: {
      log: {
        student_id: createdStudent.id,
        teacher_id: "teacher-1",
        lesson_date: "2026-07-08",
        lesson_content: "Verification lesson note",
        homework: "Practice",
        next_goal: "Next lesson"
      }
    }
  });
  assert(createdLessonLog.id && createdLessonLog.teacherId === "teacher-1", "Teacher accounts must write assigned lesson notes.");

  const createdReservation = await authorizedRequest(baseUrl, "/actions/createReservation", student.token, {
    method: "POST",
    body: {
      reservation: {
        room_id: "room-1",
        date: "2026-07-09",
        start_time: "19:00",
        end_time: "20:00",
        purpose: "연습"
      }
    }
  });
  assert(createdReservation.id && createdReservation.roomId === "room-1", "Student accounts must be able to reserve practice rooms.");

  const rejectedStudentPayment = await authorizedRequest(baseUrl, "/actions/createRegistration", student.token, {
    method: "POST",
    body: { registration: { student_id: createdStudent.id, amount: 10000 } },
    allowFailure: true
  });
  assert(rejectedStudentPayment?.ok === false, "Student accounts must not create payment records.");

  const createdConsultation = await authorizedRequest(baseUrl, "/actions/createConsultation", student.token, {
    method: "POST",
    body: { consultation: { goal: "상담 요청 검증", memo: "Student-created consultation." } }
  });
  const updatedConsultation = await authorizedRequest(baseUrl, "/actions/updateConsultationStatus", manager.token, {
    method: "POST",
    body: { consultationId: createdConsultation.id, status: "전달 필요", assignedTo: "teacher-1" }
  });
  assert(updatedConsultation.assignedTo === "teacher-1", "Manager triage must assign consultations to teacher accounts.");

  await authorizedRequest(baseUrl, "/accounts/teacher-1/password", manager.token, {
    method: "PATCH",
    body: { password: "teacher-reset-123" }
  });
  const oldTeacherTokenAfterReset = await authorizedRequest(baseUrl, "/bootstrap", teacher.token, { allowFailure: true });
  assert(oldTeacherTokenAfterReset?.ok === false, "Manager password reset must invalidate existing teacher sessions.");
  const resetTeacher = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId: "teacher", password: "teacher-reset-123" }
  });
  assert(resetTeacher.user.mustChangePassword === true, "Password reset login must require password change.");

  const managerBackups = await authorizedRequest(baseUrl, "/data-backups", manager.token, { allowFailure: true });
  assert(managerBackups?.ok === false, "Only owner accounts must be allowed to list Version.3 backups.");
  const backupList = await authorizedRequest(baseUrl, "/data-backups", owner.token);
  assert(backupList.backupEnabled === true, "/data-backups must report whether backups are enabled.");
  assert(Array.isArray(backupList.backups), "/data-backups must return a backups array.");

  const dataExport = await authorizedRequest(baseUrl, "/data-export", owner.token);
  assert(dataExport.schema === "bonsung-version3-local-v1", "/data-export must include the Version.3 export schema.");
  assert(dataExport.exportedBy.accountId === owner.user.id, "/data-export must include the exporting account.");
  assert(dataExport.data.accounts.every((account) => !("password" in account)), "/data-export must not expose account passwords.");
  const managerImport = await authorizedRequest(baseUrl, "/data-import", manager.token, {
    method: "POST",
    body: { export: dataExport },
    allowFailure: true
  });
  assert(managerImport?.ok === false, "Only owner accounts must import Version.3 data.");

  const auditLogs = await authorizedRequest(baseUrl, "/audit-logs", owner.token);
  for (const action of ["create_student", "create_account", "approve_account_request", "create_lesson", "create_lesson_log", "create_reservation", "update_consultation_status", "reset_password", "export_data"]) {
    assert(auditLogs.some((item) => item.action === action), `/audit-logs must include ${action}.`);
  }
}

async function assertPublicStartupGuard() {
  const result = await runGuardedStartup({ NODE_ENV: "production", VERSION3_ALLOWED_ORIGINS: "https://example.com", VERSION3_LOCAL_SERVER_PASSWORD: "version3" });
  assert(result.code !== 0 && result.output.includes("VERSION3_LOCAL_SERVER_PASSWORD"), "Public startup guard must reject the default server password.");
}

function runGuardedStartup(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["server/version3-local-server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
        VERSION3_LOCAL_SERVER_PORT: String(localPort + 1),
        VERSION3_LOCAL_DATA_FILE: "memory"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", (code) => resolve({ code, output }));
  });
}

async function login(baseUrl, loginId, loginPassword = password) {
  return request(baseUrl, "/auth/login", {
    method: "POST",
    body: { loginId, password: loginPassword }
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
