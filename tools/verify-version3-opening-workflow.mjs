import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const explicitBaseUrl = (process.env.VERSION3_OPENING_WORKFLOW_BASE_URL || "").trim();
const localPort = Number(process.env.VERSION3_OPENING_WORKFLOW_PORT || process.env.VERSION3_LOCAL_SERVER_PORT || 4313);
const password = process.env.VERSION3_OPENING_WORKFLOW_PASSWORD || process.env.VERSION3_LOCAL_SERVER_PASSWORD || "version3";
const ownerPassword = process.env.VERSION3_OPENING_WORKFLOW_OWNER_PASSWORD || process.env.VERSION3_OWNER_INITIAL_PASSWORD || "owner-test-123";
let serverProcess;
let tempDataDir;
let stepIndex = 0;

try {
  const baseUrl = explicitBaseUrl || await startLocalServer();
  await verifyOpeningWorkflow(baseUrl.replace(/\/+$/, ""));
  console.log(`Version.3 opening workflow verification passed: ${baseUrl}`);
} finally {
  if (serverProcess) serverProcess.kill();
  if (tempDataDir) rmSync(tempDataDir, { recursive: true, force: true });
}

async function startLocalServer() {
  const url = `http://127.0.0.1:${localPort}`;
  tempDataDir = mkdtempSync(join(tmpdir(), "bonsung-opening-workflow-"));
  const tempDataFile = join(tempDataDir, "opening-workflow-data.json");
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

async function verifyOpeningWorkflow(baseUrl) {
  const owner = await step("대표 계정 로그인", () => login(baseUrl, "owner", ownerPassword));
  const manager = await step("매니저 계정 로그인", () => login(baseUrl, "manager", password));
  const teacher = await step("강사 계정 로그인", () => login(baseUrl, "teacher", password));

  const consultation = await step("신규 상담요청 생성", () => authorizedRequest(baseUrl, "/actions/createConsultation", manager.token, {
    method: "POST",
    body: {
      consultation: {
        studentName: "테스트수강생 개원검증",
        phone: "010-0000-0000",
        channel: "개원 전 검증",
        major: "보컬",
        goal: "2026-08-01 신규 수강상담",
        memo: "opening-workflow consultation fixture"
      }
    }
  }));

  const acknowledged = await step("상담요청 상태를 확인 중으로 변경", () => authorizedRequest(baseUrl, "/actions/updateConsultationStatus", manager.token, {
    method: "POST",
    body: { consultationId: consultation.id, status: "확인 중", assignedTo: "manager-1" }
  }));
  assert(acknowledged.status === "확인 중", "Consultation must move to 확인 중.");

  const handedOff = await step("상담요청 상태를 전달 필요로 변경", () => authorizedRequest(baseUrl, "/actions/updateConsultationStatus", manager.token, {
    method: "POST",
    body: { consultationId: consultation.id, status: "전달 필요", assignedTo: "teacher-1" }
  }));
  assert(handedOff.status === "전달 필요" && handedOff.assignedTo === "teacher-1", "Consultation must be assigned to the teacher.");

  const student = await step("신규 학생 생성", () => authorizedRequest(baseUrl, "/actions/createStudent", manager.token, {
    method: "POST",
    body: {
      student: {
        name: "테스트수강생 개원검증",
        phone: "010-0000-0000",
        major: "보컬",
        goal: "2026-08-18 파운딩멤버 보컬 수업",
        status: "등록대기",
        teacherId: "teacher-1",
        teacherName: "황휘현",
        memo: "opening-workflow-student"
      }
    }
  }));

  const studentAccount = await step("신규 학생의 수강생 계정 생성", () => authorizedRequest(baseUrl, "/accounts", owner.token, {
    method: "POST",
    body: {
      account: {
        loginId: `opening-student-${Date.now()}`,
        name: "테스트수강생 계정",
        role: "student",
        email: "opening-workflow-student@bonsung.local",
        initialPassword: "opening-student-123",
        linkedStudentId: student.id
      }
    }
  }));
  assert(studentAccount.role === "student" && studentAccount.linkedStudentId === student.id, "Created account must be linked to the new student.");

  const studentLogin = await step("수강생 첫 로그인과 비밀번호 변경 필요 상태 확인", () => login(baseUrl, studentAccount.loginId, "opening-student-123"));
  assert(studentLogin.user.mustChangePassword === true, "First student login must require a password change.");

  await step("수강생 비밀번호 변경 플로우 확인", () => authorizedRequest(baseUrl, "/auth/change-password", studentLogin.token, {
    method: "POST",
    body: { currentPassword: "opening-student-123", newPassword: "opening-student-456" }
  }));

  const payment = await step("신규등록 수납 항목 생성", () => authorizedRequest(baseUrl, "/actions/createRegistration", manager.token, {
    method: "POST",
    body: {
      registration: {
        student_id: student.id,
        registration_type: "신규등록 수납 검증",
        amount: 0,
        payment_status: "확인 필요",
        next_due_date: "2026-09-01",
        memo: "opening workflow payment fixture"
      }
    }
  }));
  assert(payment.studentId === student.id, "Payment record must be attached to the new student.");

  const lesson = await step("파운딩멤버 보컬 수업 생성", () => authorizedRequest(baseUrl, "/actions/createLesson", manager.token, {
    method: "POST",
    body: {
      lesson: {
        student_id: student.id,
        teacher_id: "teacher-1",
        subject: "파운딩멤버 보컬",
        lesson_date: "2026-08-18",
        start_time: "15:00",
        duration_minutes: 60,
        memo: "A Vocal Room"
      }
    }
  }));

  const ownerBootstrapAfterLesson = await step("수업 생성 후 미처리 출결 record 확인", () => authorizedRequest(baseUrl, "/bootstrap", owner.token));
  const pendingAttendance = ownerBootstrapAfterLesson.attendance.find((item) => item.lessonId === lesson.id && item.status === "미처리");
  assert(pendingAttendance, "Creating a lesson must create a pending attendance record.");

  const attendance = await step("출결 상태를 출석으로 변경", () => authorizedRequest(baseUrl, "/actions/updateAttendance", teacher.token, {
    method: "POST",
    body: { attendance: { lesson_id: lesson.id, student_id: student.id, status: "출석", memo: "opening workflow attendance" } }
  }));
  assert(attendance.status === "출석", "Attendance status must be updated.");

  const note = await step("강사 레슨노트 작성", () => authorizedRequest(baseUrl, "/actions/createLessonLog", teacher.token, {
    method: "POST",
    body: {
      log: {
        student_id: student.id,
        teacher_id: "teacher-1",
        lesson_date: "2026-08-18",
        lesson_content: "개원 전 첫 수업 흐름 검증",
        homework: "발성 루틴 기록",
        next_goal: "2026-09-01 신규 등록자 수업 확장"
      }
    }
  }));
  assert(note.studentId === student.id, "Lesson note must be attached to the new student.");

  const reservation = await step("강의실/연습실 예약 생성", () => authorizedRequest(baseUrl, "/actions/createReservation", studentLogin.token, {
    method: "POST",
    body: {
      reservation: {
        room_id: "room-1",
        date: "2026-08-15",
        start_time: "16:00",
        end_time: "17:00",
        purpose: "연습",
        memo: "강의실 수업 시뮬레이션"
      }
    }
  }));
  assert(reservation.roomId === "room-1", "Reservation must target the selected room.");

  const duplicateReservation = await step("같은 시간/공간 중복 예약 거부 확인", () => authorizedRequest(baseUrl, "/actions/createReservation", studentLogin.token, {
    method: "POST",
    body: {
      reservation: {
        room_id: "room-1",
        date: "2026-08-15",
        start_time: "16:00",
        end_time: "17:00",
        purpose: "연습"
      }
    },
    allowFailure: true
  }));
  assert(duplicateReservation.ok === false && duplicateReservation.status === 409, "Duplicate room reservations must be rejected.");

  const managerBootstrap = await step("매니저 bootstrap 전체 운영 데이터 확인", () => authorizedRequest(baseUrl, "/bootstrap", manager.token));
  assert(managerBootstrap.students.some((item) => item.id === student.id), "Manager bootstrap must include the new student.");

  const teacherBootstrap = await step("강사 bootstrap 담당 데이터 범위 확인", () => authorizedRequest(baseUrl, "/bootstrap", teacher.token));
  assert(teacherBootstrap.students.some((item) => item.id === student.id), "Teacher bootstrap must include assigned student.");
  assert(teacherBootstrap.lessons.every((item) => item.teacherId === "teacher-1"), "Teacher bootstrap must only include assigned lessons.");

  const studentBootstrap = await step("수강생 bootstrap 본인 데이터 범위 확인", () => authorizedRequest(baseUrl, "/bootstrap", studentLogin.token));
  assert(
    studentBootstrap.students.length === 1 && studentBootstrap.students[0].id === student.id,
    `Student bootstrap must only include the linked student. expected=${student.id} linked=${studentLogin.user.linkedStudentId} actual=${studentBootstrap.students.map((item) => item.id).join(",") || "none"}`
  );
  assert(studentBootstrap.payments.length === 0, "Student bootstrap must not expose payment records.");

  const auditLogs = await step("감사 로그 주요 액션 기록 확인", () => authorizedRequest(baseUrl, "/audit-logs", owner.token));
  for (const action of ["create_consultation", "update_consultation_status", "create_student", "create_account", "create_registration", "create_lesson", "update_attendance", "create_lesson_log", "create_reservation"]) {
    assert(auditLogs.some((item) => item.action === action), `Audit logs must include ${action}.`);
  }

  const quality = await step("data-quality blocking issue 없음 확인", () => authorizedRequest(baseUrl, "/data-quality", owner.token));
  assert(!quality.checks?.some((check) => check.status === "danger"), "Data quality must not report danger checks.");
  assert(!quality.summary?.brokenReferences, "Data quality must not report broken references.");

  const exported = await step("data-export 정상 응답 확인", () => authorizedRequest(baseUrl, "/data-export", owner.token));
  assert(exported.schema === "bonsung-version3-local-v1", "Data export must include the Version.3 schema.");
  assert(exported.data?.accounts?.every((account) => !("password" in account)), "Data export must not expose account passwords.");
}

async function step(name, fn) {
  stepIndex += 1;
  try {
    return await fn();
  } catch (error) {
    throw new Error(`[step ${stepIndex}] ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function login(baseUrl, loginId, loginPassword) {
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
