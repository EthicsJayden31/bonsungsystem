const AUTO_API_ENDPOINT = window.BONSUNG_CONFIG?.apiEndpoint || "";

const STORAGE = {
  token: "bonsung_session_token",
  user: "bonsung_current_user",
  demoData: "bonsung_demo_data_v3",
  lessonDraft: "bonsung_lesson_draft_v1"
};

const ROLE_LABELS = { admin: "관리자", staff: "직원", teacher: "강사", student: "수강생" };
const STATUS_OPTIONS = ["상담중", "등록대기", "재원", "휴원", "퇴원"];
const ATTENDANCE_OPTIONS = ["출석", "지각", "결석", "취소"];
const ENROLLMENT_STATUS_LABELS = { active: "수강중", paused: "휴강", completed: "종료", canceled: "취소" };
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const root = document.getElementById("app");

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  userCog: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a6 6 0 0 1 9-5.2"/><circle cx="18" cy="18" r="3"/><path d="M18 13v2M18 21v2M13 18h2M21 18h2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.09a1.7 1.7 0 0 0-1.1-1.51 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.09A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.17.36.38.7.6 1 .27.27.62.41 1 .4h.09v4H21a1.7 1.7 0 0 0-1.6.6Z"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0 2 5.5"/><path d="M20 4v7h-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3Z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  template: '<path d="M4 4h16v16H4zM4 9h16M9 9v11"/>'
};

function icon(name, className = "") {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.home}</svg>`;
}

const state = {
  endpoint: AUTO_API_ENDPOINT,
  token: localStorage.getItem(STORAGE.token) || "",
  user: readJson(STORAGE.user),
  demo: new URLSearchParams(location.search).get("demo") === "1",
  connection: "checking",
  connectionError: "",
  page: "dashboard",
  accounts: [],
  students: [],
  enrollments: [],
  lessons: [],
  lessonLogs: [],
  templates: [],
  overview: null,
  usage: null,
  editingStudentId: null,
  selectedLogId: null,
  mobileMenu: false,
  loading: false,
  message: "",
  logFilters: { query: "", teacher: "", student: "", subject: "", from: "", to: "" },
  lessonDraft: readJson(STORAGE.lessonDraft) || {}
};

const demoSeed = {
  accounts: [
    { account_id: "acc-admin", login_id: "admin", role: "admin", name: "원장 관리자", email: "admin@bonsung.test", phone: "", linked_student_id: "", active: true, must_change_password: false },
    { account_id: "acc-staff", login_id: "staff", role: "staff", name: "운영 직원", email: "staff@bonsung.test", phone: "", linked_student_id: "", active: true, must_change_password: false },
    { account_id: "acc-teacher", login_id: "teacher", role: "teacher", name: "안지훈 강사", email: "teacher@bonsung.test", phone: "010-1000-2000", linked_student_id: "", active: true, must_change_password: false },
    { account_id: "acc-teacher-2", login_id: "teacher2", role: "teacher", name: "김나연 강사", email: "", phone: "", linked_student_id: "", active: true, must_change_password: false },
    { account_id: "acc-student", login_id: "student", role: "student", name: "이준호", email: "", phone: "", linked_student_id: "stu-1", active: true, must_change_password: false }
  ],
  students: [
    { student_id: "stu-1", name: "이준호", birth_date: "2008-04-12", phone: "010-0000-0001", guardian_name: "이정민", guardian_phone: "010-0000-1001", major: "드럼", goal: "입시 준비", status: "재원", teacher_id: "acc-teacher", enrolled_at: "2026-03-02", memo: "" },
    { student_id: "stu-2", name: "김하은", birth_date: "2009-08-20", phone: "010-0000-0002", guardian_name: "김민수", guardian_phone: "010-0000-1002", major: "피아노", goal: "재즈 화성 이해", status: "재원", teacher_id: "acc-teacher-2", enrolled_at: "2026-04-06", memo: "" },
    { student_id: "stu-3", name: "정민우", birth_date: "2007-12-03", phone: "010-0000-0003", guardian_name: "정소영", guardian_phone: "010-0000-1003", major: "드럼", goal: "밴드 합주", status: "재원", teacher_id: "acc-teacher", enrolled_at: "2026-05-04", memo: "" }
  ],
  enrollments: [
    { enrollment_id: "enr-1", student_id: "stu-1", teacher_id: "acc-teacher", subject: "드럼 중급", start_date: "2026-03-02", end_date: "", status: "active", weekly_day: 0, start_time: "11:00", duration_minutes: 50, room: "레슨실 2", memo: "" },
    { enrollment_id: "enr-2", student_id: "stu-2", teacher_id: "acc-teacher-2", subject: "피아노 초급", start_date: "2026-04-06", end_date: "", status: "active", weekly_day: 0, start_time: "10:00", duration_minutes: 50, room: "레슨실 1", memo: "" },
    { enrollment_id: "enr-3", student_id: "stu-3", teacher_id: "acc-teacher", subject: "드럼 초급", start_date: "2026-05-04", end_date: "", status: "active", weekly_day: 0, start_time: "14:00", duration_minutes: 50, room: "레슨실 2", memo: "" }
  ],
  lessons: [
    { lesson_id: "les-1", lesson_date: "2026-06-14", start_time: "11:00", duration_minutes: 50, student_id: "stu-1", teacher_id: "acc-teacher", subject: "드럼 중급", status: "예정", room: "레슨실 2", enrollment_id: "enr-1" },
    { lesson_id: "les-2", lesson_date: "2026-06-14", start_time: "14:00", duration_minutes: 50, student_id: "stu-3", teacher_id: "acc-teacher", subject: "드럼 초급", status: "예정", room: "레슨실 2", enrollment_id: "enr-3" },
    { lesson_id: "les-3", lesson_date: "2026-06-15", start_time: "10:00", duration_minutes: 50, student_id: "stu-2", teacher_id: "acc-teacher-2", subject: "피아노 초급", status: "예정", room: "레슨실 1", enrollment_id: "enr-2" }
  ],
  lessonLogs: [
    { log_id: "log-1", lesson_date: "2026-06-13", student_id: "stu-1", teacher_id: "acc-teacher", subject: "드럼 중급", lesson_content: "리듬 필인 연결과 8비트 그루브 연습", homework: "메트로놈 80 BPM 4비트 필인 연습", next_goal: "16비트 필인 안정화", practice_request: "하루 10분 녹음", attendance_status: "출석", internal_memo: "하이햇 타이밍 다음 수업에서 재확인", created_at: "2026-06-13T11:55:00+09:00" },
    { log_id: "log-2", lesson_date: "2026-06-12", student_id: "stu-3", teacher_id: "acc-teacher", subject: "드럼 초급", lesson_content: "스틱 컨트롤과 기본 4비트 패턴", homework: "싱글 스트로크 60 BPM", next_goal: "베이스 드럼 조합", practice_request: "손목 힘 빼기", attendance_status: "지각", internal_memo: "", created_at: "2026-06-12T15:00:00+09:00" },
    { log_id: "log-3", lesson_date: "2026-06-11", student_id: "stu-2", teacher_id: "acc-teacher-2", subject: "피아노 초급", lesson_content: "메이저 스케일과 기본 보이싱", homework: "C, F, G 스케일", next_goal: "2-5-1 진행", practice_request: "양손 천천히", attendance_status: "출석", internal_memo: "", created_at: "2026-06-11T10:55:00+09:00" }
  ],
  templates: [
    { template_id: "tpl-1", teacher_id: "acc-teacher", title: "기본 레슨", subject: "드럼", lesson_content: "지난 과제 확인\n기초 테크닉 점검\n곡 적용 연습", homework: "메트로놈 연습", next_goal: "다음 단계 패턴 연결", practice_request: "매일 짧게라도 녹음", active: true, scope: "personal" },
    { template_id: "tpl-2", teacher_id: "acc-teacher", title: "곡 연습", subject: "드럼", lesson_content: "곡 구조 분석\n구간별 리듬 점검\n처음부터 끝까지 연주", homework: "어려운 구간 반복", next_goal: "원곡 템포 완주", practice_request: "연습 영상 1회 촬영", active: true, scope: "personal" }
  ],
  usage: [
    { event_id: "evt-1", occurred_at: "2026-06-14T09:10:00+09:00", account_id: "acc-admin", role: "admin", action: "login", target_type: "account", target_id: "acc-admin", date_key: "2026-06-14" },
    { event_id: "evt-2", occurred_at: "2026-06-14T09:15:00+09:00", account_id: "acc-teacher", role: "teacher", action: "page_view", target_type: "page", target_id: "my-overview", date_key: "2026-06-14" },
    { event_id: "evt-3", occurred_at: "2026-06-14T09:20:00+09:00", account_id: "acc-staff", role: "staff", action: "create_student", target_type: "student", target_id: "stu-3", date_key: "2026-06-14" }
  ]
};

const BUILTIN_TEMPLATES = [
  { template_id: "builtin-basic", title: "기본 레슨", lesson_content: "지난 과제 확인\n핵심 테크닉 점검\n곡에 적용", homework: "오늘 배운 내용을 천천히 반복", next_goal: "현재 패턴을 안정적으로 연결", practice_request: "연습 과정을 짧게 녹음" },
  { template_id: "builtin-technique", title: "기초 테크닉", lesson_content: "자세와 힘 조절 확인\n기초 패턴 반복\n템포 단계별 연습", homework: "메트로놈에 맞춰 10분 연습", next_goal: "정확도를 유지하며 템포 올리기", practice_request: "속도보다 정확도 우선" },
  { template_id: "builtin-song", title: "곡 연습", lesson_content: "곡 구조 확인\n어려운 구간 분리 연습\n전체 연결", homework: "어려운 구간 3회 반복 후 전체 연주", next_goal: "원곡 템포로 완주", practice_request: "주 1회 전체 연주 영상 촬영" }
];

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/\n/g, "&#10;");
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDemoData() {
  const stored = readJson(STORAGE.demoData);
  if (stored) return stored;
  localStorage.setItem(STORAGE.demoData, JSON.stringify(demoSeed));
  return structuredClone(demoSeed);
}

function saveDemoData(data) {
  localStorage.setItem(STORAGE.demoData, JSON.stringify(data));
}

async function api(action, payload = {}) {
  if (state.demo) return demoApi(action, payload);
  if (!state.endpoint || state.endpoint.includes("REPLACE_WITH_DEPLOYMENT_ID")) {
    throw new Error("운영 데이터 서비스가 아직 배포되지 않았습니다.");
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(state.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: state.token, ...payload }),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("운영 데이터 연결 시간이 초과되었습니다.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`데이터 서비스 응답 오류 (${response.status})`);
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
  return result.data;
}

function demoApi(action, payload) {
  const data = getDemoData();
  if (action === "health") return { academyName: "본성뮤직 아카데미", schemaVersion: "2", service: "Demo" };
  if (action === "login") {
    const account = data.accounts.find((item) => item.login_id === payload.loginId && item.active);
    if (!account || payload.password !== "bonsung1") throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
    pushDemoEvent(data, account, "login", "account", account.account_id);
    return { token: `demo-${account.account_id}`, user: account };
  }
  const user = state.user;
  if (action === "logout") { pushDemoEvent(data, user, "logout", "account", user.account_id); return true; }
  if (action === "listAccounts") return data.accounts;
  if (action === "createAccount") {
    if (data.accounts.some((item) => item.login_id === payload.account.login_id)) throw new Error("이미 사용 중인 아이디입니다.");
    const { password: _password, ...accountInput } = payload.account;
    const account = { ...accountInput, account_id: uid("acc"), active: true, must_change_password: true };
    data.accounts.push(account); pushDemoEvent(data, user, "create_account", "account", account.account_id); return account;
  }
  if (action === "updateAccountStatus") {
    const account = data.accounts.find((item) => item.account_id === payload.accountId);
    if (!account) throw new Error("계정을 찾을 수 없습니다.");
    account.active = payload.active; saveDemoData(data); return true;
  }
  if (action === "resetAccountPassword") return true;
  if (action === "changePassword") {
    const account = data.accounts.find((item) => item.account_id === user.account_id);
    if (account) account.must_change_password = false;
    saveDemoData(data); return true;
  }
  if (action === "listStudents") {
    if (user.role === "teacher") {
      const assignedStudentIds = new Set(data.enrollments
        .filter((item) => item.teacher_id === user.account_id && item.status === "active")
        .map((item) => item.student_id));
      return data.students.filter((item) => item.teacher_id === user.account_id || assignedStudentIds.has(item.student_id));
    }
    return demoVisible(data.students);
  }
  if (action === "createStudent") {
    const student = { ...payload.student, student_id: uid("stu"), created_at: new Date().toISOString() };
    data.students.push(student); pushDemoEvent(data, user, "create_student", "student", student.student_id); return student;
  }
  if (action === "updateStudent") {
    const index = data.students.findIndex((item) => item.student_id === payload.student.student_id);
    if (index < 0) throw new Error("수강생을 찾을 수 없습니다.");
    data.students[index] = { ...data.students[index], ...payload.student };
    pushDemoEvent(data, user, "update_student", "student", payload.student.student_id); return data.students[index];
  }
  if (action === "listEnrollments") return enrichDemoRows(demoVisible(data.enrollments), data);
  if (action === "createEnrollment") {
    const enrollment = { ...payload.enrollment, enrollment_id: uid("enr"), duration_minutes: Number(payload.enrollment.duration_minutes || 50) };
    data.enrollments.push(enrollment); pushDemoEvent(data, user, "create_enrollment", "enrollment", enrollment.enrollment_id); return enrollment;
  }
  if (action === "listLessons") return enrichDemoRows(demoVisible(data.lessons), data);
  if (action === "createLesson") {
    const lesson = { ...payload.lesson, lesson_id: uid("les"), duration_minutes: Number(payload.lesson.duration_minutes || 50) };
    data.lessons.push(lesson); pushDemoEvent(data, user, "create_lesson", "lesson", lesson.lesson_id); return lesson;
  }
  if (action === "listLessonLogs") return enrichDemoRows(demoVisible(data.lessonLogs), data).map((item) => {
    const copy = { ...item };
    if (user.role === "student") delete copy.internal_memo;
    return copy;
  });
  if (action === "createLessonLog") {
    const log = { ...payload.log, log_id: uid("log"), teacher_id: user.role === "teacher" ? user.account_id : payload.log.teacher_id || studentById(data, payload.log.student_id)?.teacher_id, created_at: new Date().toISOString() };
    data.lessonLogs.unshift(log); pushDemoEvent(data, user, "create_lesson_log", "lesson_log", log.log_id); return log;
  }
  if (action === "listLessonTemplates") return data.templates.filter((item) => item.active && (item.scope === "global" || item.teacher_id === user.account_id));
  if (action === "createLessonTemplate") {
    const template = { ...payload.template, template_id: uid("tpl"), teacher_id: user.account_id, active: true, scope: "personal" };
    data.templates.push(template); pushDemoEvent(data, user, "create_lesson_template", "lesson_template", template.template_id); return template;
  }
  if (action === "deleteLessonTemplate") {
    const template = data.templates.find((item) => item.template_id === payload.templateId);
    if (template) template.active = false;
    saveDemoData(data); return true;
  }
  if (action === "getMyOverview") return demoOverview(data, user);
  if (action === "getUsageSummary") return demoUsage(data);
  if (action === "recordPageView") { pushDemoEvent(data, user, "page_view", "page", payload.page); return true; }
  throw new Error("지원하지 않는 데모 작업입니다.");
}

function pushDemoEvent(data, user, action, targetType, targetId) {
  data.usage.unshift({ event_id: uid("evt"), occurred_at: new Date().toISOString(), account_id: user?.account_id || "", role: user?.role || "", action, target_type: targetType, target_id: targetId, date_key: today() });
  saveDemoData(data);
}

function demoVisible(rows) {
  if (!state.user) return [];
  if (state.user.role === "teacher") return rows.filter((item) => item.teacher_id === state.user.account_id);
  if (state.user.role === "student") return rows.filter((item) => item.student_id === state.user.linked_student_id);
  return rows;
}

function enrichDemoRows(rows, data) {
  return rows.map((item) => ({
    ...item,
    student_name: studentById(data, item.student_id)?.name || "",
    teacher_name: accountById(data, item.teacher_id)?.name || ""
  }));
}

function demoOverview(data, user) {
  const enrollments = enrichDemoRows(demoVisible(data.enrollments), data);
  const lessons = enrichDemoRows(demoVisible(data.lessons), data).filter((item) => item.lesson_date >= today()).sort(compareLessons);
  const logs = enrichDemoRows(demoVisible(data.lessonLogs), data).sort((a, b) => String(b.lesson_date).localeCompare(String(a.lesson_date)));
  if (user.role === "teacher") {
    const active = enrollments.filter((item) => item.status === "active");
    return { role: user.role, profile: user, stats: { activeStudents: unique(active.map((item) => item.student_id)).length, subjects: unique(active.map((item) => item.subject)).length, thisWeekLessons: lessons.length, thisMonthLogs: logs.length }, subjects: unique(active.map((item) => item.subject)), enrollments: active, upcoming: lessons, recentLogs: logs.slice(0, 6) };
  }
  if (user.role === "student") {
    const active = enrollments.filter((item) => item.status === "active");
    const student = studentById(data, user.linked_student_id);
    const start = active.map((item) => item.start_date).filter(Boolean).sort()[0];
    return { role: user.role, profile: student, stats: { activeCourses: active.length, enrolledDays: start ? dateDiffDays(start, today()) + 1 : 0, upcomingLessons: lessons.length, lessonLogs: logs.length }, subjects: unique(active.map((item) => item.subject)), enrollments: active, upcoming: lessons, recentLogs: logs.slice(0, 6) };
  }
  const activeStudents = data.students.filter((item) => item.status === "재원").length;
  const teachers = data.accounts.filter((item) => item.role === "teacher" && item.active);
  return {
    role: user.role,
    stats: { activeStudents, activeAccounts: data.accounts.filter((item) => item.active).length, thisMonthLogs: data.lessonLogs.length, attendanceRate: 92.3 },
    todayLessons: enrichDemoRows(data.lessons.filter((item) => item.lesson_date === today()), data),
    upcoming: enrichDemoRows(data.lessons, data).sort(compareLessons),
    workload: teachers.map((teacher) => ({ teacher_id: teacher.account_id, teacher_name: teacher.name, active_students: unique(data.enrollments.filter((item) => item.teacher_id === teacher.account_id).map((item) => item.student_id)).length, next_7_days: data.lessons.filter((item) => item.teacher_id === teacher.account_id).length, month_logs: data.lessonLogs.filter((item) => item.teacher_id === teacher.account_id).length })),
    recentLogs: enrichDemoRows(data.lessonLogs, data).slice(0, 6)
  };
}

function demoUsage(data) {
  const daily = [];
  for (let offset = -13; offset <= 0; offset++) {
    const date = addDays(today(), offset);
    daily.push({ date, count: data.usage.filter((item) => item.date_key === date).length });
  }
  const counts = {};
  data.usage.forEach((item) => counts[item.action] = (counts[item.action] || 0) + 1);
  return {
    todayEvents: data.usage.filter((item) => item.date_key === today()).length,
    last7Events: data.usage.length,
    activeUsers7: unique(data.usage.map((item) => item.account_id)).length,
    last30Events: data.usage.length,
    daily,
    actions: Object.entries(counts).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
    recent: data.usage.map((item) => ({ ...item, account_name: accountById(data, item.account_id)?.name || "알 수 없음" }))
  };
}

async function initializeApp() {
  state.loading = true;
  render();
  try {
    await api("health");
    state.connection = "ready";
    state.connectionError = "";
    if (state.user && state.token) {
      state.page = defaultPage(state.user.role);
      await refreshData(false);
    } else {
      state.loading = false;
      render();
    }
  } catch (error) {
    state.connection = "error";
    state.connectionError = error.message;
    state.loading = false;
    state.user = null;
    state.token = "";
    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.user);
    render();
  }
}

async function retryConnection() {
  state.connection = "checking";
  state.connectionError = "";
  await initializeApp();
}

function startDemo() {
  const url = new URL(location.href);
  url.searchParams.set("demo", "1");
  location.href = url.toString();
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setBusy(true, "");
  try {
    const result = await api("login", { loginId: form.get("loginId"), password: form.get("password") });
    state.token = result.token;
    state.user = result.user;
    state.page = result.user.must_change_password ? "profile" : defaultPage(result.user.role);
    localStorage.setItem(STORAGE.token, result.token);
    localStorage.setItem(STORAGE.user, JSON.stringify(result.user));
    await refreshData(false);
    api("recordPageView", { page: state.page }).catch(() => {});
  } catch (error) {
    setBusy(false, error.message);
  }
}

function defaultPage(role) {
  if (role === "teacher" || role === "student") return "my-overview";
  return "dashboard";
}

async function refreshData(showLoader = true) {
  if (showLoader) setBusy(true, "");
  try {
    const canManage = ["admin", "staff"].includes(state.user.role);
    const [students, lessonLogs, enrollments, lessons, templates, overview, accounts, usage] = await Promise.all([
      api("listStudents"),
      api("listLessonLogs"),
      api("listEnrollments"),
      api("listLessons"),
      state.user.role === "student" ? Promise.resolve([]) : api("listLessonTemplates"),
      api("getMyOverview"),
      canManage ? api("listAccounts") : Promise.resolve([]),
      state.user.role === "admin" ? api("getUsageSummary") : Promise.resolve(null)
    ]);
    Object.assign(state, { students, lessonLogs, enrollments, lessons, templates, overview, accounts, usage, loading: false });
    render();
  } catch (error) {
    if (/세션|로그인|token/i.test(error.message)) return logout(false);
    setBusy(false, error.message);
  }
}

function setBusy(loading, message) {
  state.loading = loading;
  state.message = message;
  render();
}

function logout(callApi = true) {
  if (callApi) api("logout").catch(() => {});
  state.token = "";
  state.user = null;
  state.accounts = [];
  state.students = [];
  state.enrollments = [];
  state.lessons = [];
  state.lessonLogs = [];
  state.templates = [];
  state.overview = null;
  state.usage = null;
  state.message = "";
  localStorage.removeItem(STORAGE.token);
  localStorage.removeItem(STORAGE.user);
  render();
}

function navigate(page) {
  state.page = page;
  state.mobileMenu = false;
  state.message = "";
  render();
  api("recordPageView", { page }).catch(() => {});
}

function toggleMobileMenu() {
  state.mobileMenu = !state.mobileMenu;
  render();
}

async function createAccount(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  values.active = true;
  values.linked_student_id ||= "";
  setBusy(true, "");
  try {
    await api("createAccount", { account: values });
    await refreshData(false);
    state.message = "계정이 생성되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createStudent(event) {
  event.preventDefault();
  const student = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("createStudent", { student });
    await refreshData(false);
    state.message = "수강생이 등록되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function updateStudent(event) {
  event.preventDefault();
  const student = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("updateStudent", { student });
    state.editingStudentId = null;
    await refreshData(false);
    state.message = "수강생 정보가 수정되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createEnrollment(event) {
  event.preventDefault();
  const enrollment = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("createEnrollment", { enrollment });
    await refreshData(false);
    state.message = "수강 등록과 반복 일정이 저장되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createLesson(event) {
  event.preventDefault();
  const lesson = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("createLesson", { lesson });
    await refreshData(false);
    state.message = "개별 수업 일정이 추가되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function toggleAccount(accountId, active) {
  setBusy(true, "");
  try {
    await api("updateAccountStatus", { accountId, active });
    await refreshData(false);
    state.message = active ? "계정 사용을 재개했습니다." : "계정 사용을 중지했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function resetAccountPassword(accountId) {
  const password = window.prompt("새 초기 비밀번호를 입력하세요. 8자 이상이어야 합니다.");
  if (!password) return;
  setBusy(true, "");
  try {
    await api("resetAccountPassword", { accountId, password });
    await refreshData(false);
    state.message = "비밀번호를 초기화했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function changePassword(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (values.newPassword !== values.confirmPassword) {
    state.message = "새 비밀번호 확인이 일치하지 않습니다.";
    render();
    return;
  }
  setBusy(true, "");
  try {
    await api("changePassword", { currentPassword: values.currentPassword, newPassword: values.newPassword });
    state.user.must_change_password = false;
    localStorage.setItem(STORAGE.user, JSON.stringify(state.user));
    state.page = defaultPage(state.user.role);
    state.message = "비밀번호가 변경되었습니다.";
    await refreshData(false);
  } catch (error) { setBusy(false, error.message); }
}

function beginStudentEdit(studentId) {
  state.editingStudentId = studentId;
  render();
}

function cancelStudentEdit() {
  state.editingStudentId = null;
  render();
}

function saveLessonDraft(form) {
  state.lessonDraft = Object.fromEntries(new FormData(form));
  localStorage.setItem(STORAGE.lessonDraft, JSON.stringify(state.lessonDraft));
  const status = document.querySelector("[data-draft-status]");
  if (status) status.textContent = "임시 저장됨";
}

function handleLessonStudentChange(studentId) {
  const form = document.querySelector("#lesson-log-form");
  if (!form) return;
  const student = state.students.find((item) => item.student_id === studentId);
  const activeEnrollment = state.enrollments.find((item) => item.student_id === studentId && item.status === "active");
  if (student && !form.subject.value) form.subject.value = activeEnrollment?.subject || student.major || "";
  if (form.teacher_id && activeEnrollment?.teacher_id) form.teacher_id.value = activeEnrollment.teacher_id;
  saveLessonDraft(form);
}

function setAttendance(value) {
  const form = document.querySelector("#lesson-log-form");
  if (!form) return;
  form.attendance_status.value = value;
  form.querySelectorAll("[data-attendance]").forEach((button) => button.classList.toggle("active", button.dataset.attendance === value));
  saveLessonDraft(form);
}

function applyLessonTemplate(templateId) {
  const template = [...BUILTIN_TEMPLATES, ...state.templates].find((item) => item.template_id === templateId);
  const form = document.querySelector("#lesson-log-form");
  if (!template || !form) return;
  ["subject", "lesson_content", "homework", "next_goal", "practice_request"].forEach((key) => {
    if (template[key]) form.elements[key].value = template[key];
  });
  saveLessonDraft(form);
}

function loadPreviousLessonLog() {
  const form = document.querySelector("#lesson-log-form");
  if (!form) return;
  const studentId = form.student_id.value;
  if (!studentId) {
    state.message = "먼저 수강생을 선택해 주세요.";
    render();
    return;
  }
  const previous = state.lessonLogs.find((item) => item.student_id === studentId);
  if (!previous) {
    state.message = "이 수강생의 이전 수업일지가 없습니다.";
    render();
    return;
  }
  ["subject", "homework", "next_goal", "practice_request"].forEach((key) => {
    if (previous[key]) form.elements[key].value = previous[key];
  });
  form.lesson_content.value = previous.next_goal || previous.lesson_content || "";
  saveLessonDraft(form);
}

async function saveCurrentAsTemplate() {
  const form = document.querySelector("#lesson-log-form");
  if (!form) return;
  const values = Object.fromEntries(new FormData(form));
  if (!values.lesson_content) {
    state.message = "템플릿으로 저장할 수업 내용을 먼저 작성해 주세요.";
    render();
    return;
  }
  const title = window.prompt("템플릿 이름을 입력하세요.");
  if (!title) return;
  setBusy(true, "");
  try {
    await api("createLessonTemplate", { template: { ...values, title } });
    await refreshData(false);
    state.message = "수업일지 템플릿이 저장되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function deleteLessonTemplate(templateId) {
  setBusy(true, "");
  try {
    await api("deleteLessonTemplate", { templateId });
    await refreshData(false);
    state.message = "템플릿을 삭제했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createLessonLog(event) {
  event.preventDefault();
  const log = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("createLessonLog", { log });
    state.lessonDraft = {};
    localStorage.removeItem(STORAGE.lessonDraft);
    await refreshData(false);
    state.message = "수업일지가 저장되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

function setLogFilter(key, value) {
  state.logFilters[key] = value;
  render();
}

function applyLogSearch(event) {
  event.preventDefault();
  state.logFilters.query = new FormData(event.currentTarget).get("query").trim();
  render();
}

function resetLogFilters() {
  state.logFilters = { query: "", teacher: "", student: "", subject: "", from: "", to: "" };
  render();
}

function viewLog(logId) {
  state.selectedLogId = logId;
  render();
}

function closeLog() {
  state.selectedLogId = null;
  render();
}

function menusFor(role) {
  const all = [
    ["dashboard", "홈", "home", ["admin", "staff"]],
    ["my-overview", role === "student" ? "내 수강" : "내 일정", "calendar", ["teacher", "student"]],
    ["students", role === "teacher" ? "담당 수강생" : "수강생", "users", ["admin", "staff", "teacher"]],
    ["enrollments", "수강·일정", "calendar", ["admin", "staff"]],
    ["lesson-logs", role === "student" ? "내 수업일지" : "수업일지", "book", ["admin", "staff", "teacher", "student"]],
    ["accounts", "계정 관리", "userCog", ["admin", "staff"]],
    ["usage", "이용 현황", "chart", ["admin"]],
    ["profile", "내 계정", "settings", ["admin", "staff", "teacher", "student"]]
  ];
  return all.filter(([, , , roles]) => roles.includes(role));
}

function render() {
  if (state.connection === "checking" || (state.loading && !state.user)) return renderSplash();
  if (state.connection === "error") return renderConnectionError();
  if (!state.user) return renderAuth();

  const menus = menusFor(state.user.role);
  if (state.user.must_change_password) state.page = "profile";
  if (!menus.some(([key]) => key === state.page)) state.page = defaultPage(state.user.role);
  const primaryMobile = menus.filter(([key]) => key !== "profile").slice(0, 3);

  root.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand-lockup"><span class="brand-mark">B</span><div><strong>본성뮤직</strong><small>ACADEMY INTRANET</small></div></div>
        <nav class="nav">${menus.map(([key, label, iconName]) => navButton(key, label, iconName)).join("")}</nav>
        <div class="sidebar-foot">
          <button class="nav-utility" onclick="logout()">${icon("logout")}<span>로그아웃</span></button>
        </div>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div class="mobile-brand"><span class="brand-mark">B</span><strong>본성뮤직</strong></div>
          <div class="topbar-title">${escapeHtml(currentPageLabel(menus))}</div>
          <button class="user-button" onclick="navigate('profile')" aria-label="내 계정">
            <span class="avatar">${escapeHtml(state.user.name.slice(0, 1))}</span>
            <span class="identity"><strong>${escapeHtml(state.user.name)}</strong><small>${ROLE_LABELS[state.user.role]}</small></span>
          </button>
        </header>
        <main class="content">
          ${state.message ? `<div class="notice">${icon("check")}<span>${escapeHtml(state.message)}</span></div>` : ""}
          ${state.loading ? `<div class="loading-line"><span></span></div>` : ""}
          ${renderPage()}
        </main>
      </section>
      <nav class="mobile-nav">
        ${primaryMobile.map(([key, label, iconName]) => `<button class="${state.page === key ? "active" : ""}" onclick="navigate('${key}')">${icon(iconName)}<span>${label}</span></button>`).join("")}
        <button class="${state.mobileMenu ? "active" : ""}" onclick="toggleMobileMenu()">${icon("menu")}<span>전체 메뉴</span></button>
      </nav>
      ${state.mobileMenu ? renderMobileMenu(menus) : ""}
      ${state.selectedLogId ? renderLogModal() : ""}
    </div>`;
  labelResponsiveTables();
}

function renderSplash() {
  root.innerHTML = `<main class="splash"><div class="brand-lockup large"><span class="brand-mark">B</span><div><strong>본성뮤직</strong><small>ACADEMY INTRANET</small></div></div><div class="spinner"></div><p>운영 데이터를 불러오는 중입니다.</p></main>`;
}

function renderConnectionError() {
  root.innerHTML = `
    <main class="auth-page">
      <section class="auth-panel compact">
        <div class="brand-lockup large"><span class="brand-mark">B</span><div><strong>본성뮤직 아카데미</strong><small>ACADEMY INTRANET</small></div></div>
        <div class="error-state">
          <h1>서비스 연결을 확인하고 있습니다</h1>
          <p>운영 데이터 서비스에 연결하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.</p>
          <div class="error-detail">${escapeHtml(state.connectionError)}</div>
          <div class="button-row">
            <button class="btn" onclick="retryConnection()">${icon("refresh")}다시 시도</button>
            <button class="btn secondary" onclick="startDemo()">데모 화면 보기</button>
          </div>
        </div>
      </section>
      <section class="auth-context">
        <div class="context-copy"><h2>수업과 운영 기록을<br />한 흐름으로 관리합니다.</h2><p>별도의 Google Sheet 연결 과정 없이 로그인하면 역할에 맞는 업무 화면이 바로 열립니다.</p></div>
      </section>
    </main>`;
}

function renderAuth() {
  root.innerHTML = `
    <main class="auth-page">
      <section class="auth-panel">
        <div class="brand-lockup large"><span class="brand-mark">B</span><div><strong>본성뮤직 아카데미</strong><small>ACADEMY INTRANET</small></div></div>
        <div class="auth-copy">
          <h1>인트라넷 로그인</h1>
          <p>발급받은 아이디와 비밀번호를 입력하세요.</p>
        </div>
        <form class="form-stack auth-form" onsubmit="login(event)">
          <label class="field"><span>아이디</span><input name="loginId" autocomplete="username" placeholder="아이디 입력" required /></label>
          <label class="field"><span>비밀번호</span><input name="password" type="password" autocomplete="current-password" placeholder="비밀번호 입력" required /></label>
          <button class="btn login-button" ${state.loading ? "disabled" : ""}>${state.loading ? "확인 중..." : "로그인"}</button>
        </form>
        ${state.demo ? `<div class="demo-hint"><strong>데모 계정</strong><span>admin / staff / teacher / student</span><span>비밀번호 bonsung1</span></div>` : ""}
        <p class="status-line error">${escapeHtml(state.message)}</p>
      </section>
      <section class="auth-context">
        <div class="context-copy"><h2>오늘의 수업부터<br />수강생 성장 기록까지</h2><p>관리자는 운영 흐름을 확인하고, 강사는 수업에 집중하며, 수강생은 자신의 학습 기록을 한곳에서 확인합니다.</p></div>
        <div class="context-preview">
          <div><span>오늘 수업</span><strong>6</strong></div>
          <div><span>작성할 일지</span><strong>2</strong></div>
          <div><span>재원 수강생</span><strong>24</strong></div>
        </div>
      </section>
    </main>`;
}

function navButton(key, label, iconName) {
  return `<button class="${state.page === key ? "active" : ""}" onclick="navigate('${key}')">${icon(iconName)}<span>${label}</span></button>`;
}

function currentPageLabel(menus) {
  return menus.find(([key]) => key === state.page)?.[1] || "홈";
}

function renderMobileMenu(menus) {
  return `<div class="mobile-menu-backdrop" onclick="toggleMobileMenu()"><section class="mobile-menu-sheet" onclick="event.stopPropagation()"><div class="mobile-menu-head"><strong>전체 메뉴</strong><button class="icon-button" onclick="toggleMobileMenu()" aria-label="닫기">${icon("close")}</button></div><nav>${menus.map(([key, label, iconName]) => navButton(key, label, iconName)).join("")}<button onclick="logout()">${icon("logout")}<span>로그아웃</span></button></nav></section></div>`;
}

function labelResponsiveTables() {
  root.querySelectorAll("table").forEach((table) => {
    const labels = Array.from(table.querySelectorAll("thead th")).map((cell) => cell.textContent.trim());
    table.querySelectorAll("tbody tr").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        cell.dataset.label = labels[index] || "정보";
      });
    });
  });
}

function renderPage() {
  if (state.page === "my-overview") return renderMyOverview();
  if (state.page === "accounts") return renderAccounts();
  if (state.page === "students") return renderStudents();
  if (state.page === "enrollments") return renderEnrollments();
  if (state.page === "lesson-logs") return renderLessonLogs();
  if (state.page === "usage") return renderUsage();
  if (state.page === "profile") return renderProfile();
  return renderDashboard();
}

function pageHeading(title, description, action = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

function statItem(label, value, suffix = "", tone = "") {
  return `<div class="stat ${tone}"><span>${label}</span><strong>${escapeHtml(value)}${suffix ? `<small>${suffix}</small>` : ""}</strong></div>`;
}

function renderDashboard() {
  const overview = state.overview || { stats: {}, todayLessons: [], workload: [], recentLogs: [] };
  const stats = overview.stats || {};
  return `
    ${pageHeading("오늘의 운영", `${formatFullDate(new Date())} 기준 학원 운영 현황입니다.`, `<button class="btn secondary small" onclick="refreshData()">${icon("refresh")}새로고침</button>`)}
    <section class="stats">
      ${statItem("재원 수강생", stats.activeStudents || 0, "명")}
      ${statItem("활성 계정", stats.activeAccounts || 0, "명")}
      ${statItem("이번 달 수업일지", stats.thisMonthLogs || 0, "건")}
      ${statItem("출결 처리율", stats.attendanceRate || 0, "%", Number(stats.attendanceRate) < 80 ? "warning" : "")}
    </section>
    <div class="dashboard-grid">
      <section class="panel schedule-panel">
        <div class="panel-head"><div><h2>오늘 수업 일정</h2><p>${overview.todayLessons?.length || 0}개의 수업</p></div><button class="text-action" onclick="navigate('enrollments')">전체 일정 ${icon("chevron")}</button></div>
        ${scheduleTimeline(overview.todayLessons || [])}
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>최근 활동</h2><p>운영 데이터 변경 기록</p></div>${state.user.role === "admin" ? `<button class="text-action" onclick="navigate('usage')">이용 현황 ${icon("chevron")}</button>` : ""}</div>
        ${activityList(state.user.role === "admin" ? state.usage?.recent?.slice(0, 6) || [] : overview.recentLogs || [])}
      </section>
      <section class="panel wide-panel">
        <div class="panel-head"><div><h2>강사 업무 현황</h2><p>담당 수강생과 최근 기록량</p></div></div>
        ${teacherWorkloadTable(overview.workload || [])}
      </section>
      <section class="panel progress-panel">
        <div class="panel-head"><div><h2>수업일지 작성 현황</h2><p>이번 달 누적</p></div></div>
        <div class="progress-body">
          <div class="progress-summary"><strong>${stats.thisMonthLogs || 0}<small>건</small></strong><span>이번 달 작성 완료</span></div>
          <div class="progress-track"><span style="width:${Math.min(100, (stats.thisMonthLogs || 0) / Math.max(1, state.students.length * 4) * 100)}%"></span></div>
          <div class="progress-meta"><span>수강생 ${state.students.length}명</span><button class="text-action" onclick="navigate('lesson-logs')">일지 보기 ${icon("chevron")}</button></div>
        </div>
      </section>
    </div>`;
}

function renderMyOverview() {
  const overview = state.overview || { stats: {}, enrollments: [], upcoming: [], recentLogs: [], subjects: [] };
  const teacher = state.user.role === "teacher";
  const stats = overview.stats || {};
  const title = teacher ? `${state.user.name}님의 수업` : `${state.user.name}님의 수강`;
  const description = teacher ? "담당 수업과 수강생, 최근 기록을 한눈에 확인합니다." : "수강 과목과 다음 수업, 학습 기록을 확인합니다.";
  return `
    ${pageHeading(title, description, teacher ? `<button class="btn" onclick="navigate('lesson-logs')">${icon("plus")}수업일지 작성</button>` : "")}
    <section class="stats">
      ${teacher ? statItem("담당 수강생", stats.activeStudents || 0, "명") : statItem("수강 과목", stats.activeCourses || 0, "개")}
      ${teacher ? statItem("담당 과목", stats.subjects || 0, "개") : statItem("수강 기간", durationText(stats.enrolledDays || 0))}
      ${teacher ? statItem("이번 주 수업", stats.thisWeekLessons || 0, "회") : statItem("예정 수업", stats.upcomingLessons || 0, "회")}
      ${teacher ? statItem("이번 달 일지", stats.thisMonthLogs || 0, "건") : statItem("학습 기록", stats.lessonLogs || 0, "건")}
    </section>
    <div class="overview-grid">
      <section class="panel schedule-panel">
        <div class="panel-head"><div><h2>다가오는 수업</h2><p>앞으로 예정된 일정</p></div></div>
        ${scheduleTimeline((overview.upcoming || []).slice(0, 8))}
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>${teacher ? "담당 과목" : "현재 수강"}</h2><p>${(overview.enrollments || []).length}개 등록</p></div></div>
        ${enrollmentCards(overview.enrollments || [], teacher)}
      </section>
      <section class="panel full-span">
        <div class="panel-head"><div><h2>최근 수업일지</h2><p>최근 학습 흐름</p></div><button class="text-action" onclick="navigate('lesson-logs')">전체 보기 ${icon("chevron")}</button></div>
        ${logsCompactList(overview.recentLogs || [])}
      </section>
    </div>`;
}

function renderUsage() {
  const usage = state.usage || { daily: [], actions: [], recent: [] };
  const max = Math.max(1, ...usage.daily.map((item) => item.count));
  return `
    ${pageHeading("시스템 이용 현황", "로그인, 페이지 조회, 주요 데이터 변경 활동을 확인합니다.", `<button class="btn secondary small" onclick="refreshData()">${icon("refresh")}새로고침</button>`)}
    <section class="stats">
      ${statItem("오늘 활동", usage.todayEvents || 0, "건")}
      ${statItem("최근 7일 활동", usage.last7Events || 0, "건")}
      ${statItem("최근 7일 사용자", usage.activeUsers7 || 0, "명")}
      ${statItem("최근 30일 활동", usage.last30Events || 0, "건")}
    </section>
    <div class="usage-grid">
      <section class="panel usage-chart-panel">
        <div class="panel-head"><div><h2>최근 14일 활동량</h2><p>로그인과 업무 처리 건수</p></div></div>
        <div class="bar-chart">${usage.daily.map((item) => `<div class="bar-column"><span class="bar-value">${item.count}</span><div class="bar-track"><span style="height:${item.count / max * 100}%"></span></div><small>${formatShortDate(item.date)}</small></div>`).join("")}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>활동 유형</h2><p>최근 30일 기준</p></div></div>
        <div class="rank-list">${usage.actions.length ? usage.actions.slice(0, 8).map((item, index) => `<div><span class="rank">${index + 1}</span><strong>${formatAction(item.action)}</strong><span>${item.count}건</span></div>`).join("") : emptyInline("아직 기록된 이용 데이터가 없습니다.")}</div>
      </section>
      <section class="panel full-span">
        <div class="panel-head"><div><h2>최근 이용 기록</h2><p>최신 30건</p></div></div>
        ${usageTable(usage.recent)}
      </section>
    </div>`;
}

function renderAccounts() {
  const studentOptions = state.students.map((item) => `<option value="${escapeAttr(item.student_id)}">${escapeHtml(item.name)}</option>`).join("");
  const roleOptions = state.user.role === "admin"
    ? `<option value="staff">직원</option><option value="teacher">강사</option><option value="student">수강생</option><option value="admin">관리자</option>`
    : `<option value="staff">직원</option><option value="teacher">강사</option><option value="student">수강생</option>`;
  return `
    ${pageHeading("계정 관리", "직원, 강사, 수강생 계정을 발급하고 사용 상태를 관리합니다.")}
    <div class="management-grid">
      <section class="panel">
        <div class="panel-head"><div><h2>계정 목록</h2><p>${state.accounts.length}명</p></div></div>
        ${accountsTable()}
      </section>
      <section class="panel form-panel">
        <div class="panel-head"><div><h2>새 계정</h2><p>첫 로그인 후 비밀번호 변경 필요</p></div></div>
        <form class="panel-body form-grid" onsubmit="createAccount(event)">
          <label class="field"><span>이름</span><input name="name" required /></label>
          <label class="field"><span>로그인 아이디</span><input name="login_id" autocomplete="off" required /></label>
          <label class="field"><span>초기 비밀번호</span><input name="password" type="password" minlength="8" autocomplete="new-password" required /></label>
          <label class="field"><span>권한</span><select name="role" required>${roleOptions}</select></label>
          <label class="field"><span>연결 수강생</span><select name="linked_student_id"><option value="">해당 없음</option>${studentOptions}</select></label>
          <label class="field"><span>이메일</span><input name="email" type="email" autocomplete="email" /></label>
          <label class="field"><span>연락처</span><input name="phone" autocomplete="tel" /></label>
          <div class="form-actions"><button class="btn">${icon("plus")}계정 생성</button></div>
        </form>
      </section>
    </div>`;
}

function accountsTable() {
  if (!state.accounts.length) return empty("등록된 계정이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>이름</th><th>아이디</th><th>권한</th><th>연결 수강생</th><th>상태</th><th>관리</th></tr></thead><tbody>${state.accounts.map((item) => {
    const canManage = item.account_id !== state.user.account_id && (state.user.role === "admin" || item.role !== "admin");
    return `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.login_id)}</td><td>${ROLE_LABELS[item.role] || item.role}</td><td>${escapeHtml(studentName(item.linked_student_id) || "-")}</td><td>${statusBadge(item.active ? "사용" : "중지", item.active ? "success" : "muted")}</td><td>${canManage ? `<div class="row-actions"><button class="btn secondary small" onclick="toggleAccount('${item.account_id}', ${!item.active})">${item.active ? "중지" : "재개"}</button><button class="btn ghost small" onclick="resetAccountPassword('${item.account_id}')">비밀번호 초기화</button></div>` : "-"}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function renderStudents() {
  const canEdit = ["admin", "staff"].includes(state.user.role);
  const teachers = state.accounts.filter((item) => item.role === "teacher" && item.active);
  const editingStudent = state.students.find((item) => item.student_id === state.editingStudentId);
  const formStudent = editingStudent || {};
  return `
    ${pageHeading(canEdit ? "수강생 관리" : "담당 수강생", canEdit ? "기본 정보, 보호자 연락처와 담당 강사를 관리합니다." : "수업에 필요한 담당 수강생 정보만 표시합니다.")}
    <div class="${canEdit ? "management-grid" : ""}">
      <section class="panel">
        <div class="panel-head"><div><h2>수강생 목록</h2><p>${state.students.length}명</p></div></div>
        ${studentsTable(canEdit)}
      </section>
      ${canEdit ? studentForm(formStudent, teachers, Boolean(editingStudent)) : ""}
    </div>`;
}

function studentsTable(canEdit) {
  if (!state.students.length) return empty("등록된 수강생이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>이름</th><th>전공</th><th>상태</th><th>${canEdit ? "보호자" : "목표"}</th><th>연락처</th><th>담당 강사</th>${canEdit ? "<th>관리</th>" : ""}</tr></thead><tbody>${state.students.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.major || "-")}</td><td>${statusBadge(item.status, item.status === "재원" ? "success" : "muted")}</td><td>${escapeHtml(canEdit ? item.guardian_name || "-" : item.goal || "-")}</td><td>${escapeHtml(canEdit ? item.guardian_phone || item.phone || "-" : item.phone || "-")}</td><td>${escapeHtml(accountName(item.teacher_id) || enrollmentTeacherName(item.student_id) || "-")}</td>${canEdit ? `<td><button class="btn secondary small" onclick="beginStudentEdit('${item.student_id}')">수정</button></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}

function studentForm(student, teachers, editing) {
  return `<section class="panel form-panel"><div class="panel-head"><div><h2>${editing ? "수강생 수정" : "수강생 등록"}</h2><p>${editing ? student.name : "새 수강생 정보"}</p></div>${editing ? `<button class="btn ghost small" onclick="cancelStudentEdit()">취소</button>` : ""}</div><form class="panel-body form-grid two" onsubmit="${editing ? "updateStudent(event)" : "createStudent(event)"}">
    ${editing ? `<input name="student_id" type="hidden" value="${escapeAttr(student.student_id)}" />` : ""}
    <label class="field"><span>이름</span><input name="name" value="${escapeAttr(student.name || "")}" required /></label>
    <label class="field"><span>생년월일</span><input name="birth_date" type="date" value="${escapeAttr(dateInputValue(student.birth_date))}" /></label>
    <label class="field"><span>연락처</span><input name="phone" value="${escapeAttr(student.phone || "")}" autocomplete="tel" /></label>
    <label class="field"><span>전공</span><input name="major" value="${escapeAttr(student.major || "")}" required /></label>
    <label class="field"><span>보호자 이름</span><input name="guardian_name" value="${escapeAttr(student.guardian_name || "")}" /></label>
    <label class="field"><span>보호자 연락처</span><input name="guardian_phone" value="${escapeAttr(student.guardian_phone || "")}" autocomplete="tel" /></label>
    <label class="field"><span>상태</span><select name="status">${STATUS_OPTIONS.map((item) => `<option ${student.status === item ? "selected" : ""}>${item}</option>`).join("")}</select></label>
    <label class="field"><span>기본 담당 강사</span><select name="teacher_id"><option value="">미지정</option>${teachers.map((item) => `<option value="${item.account_id}" ${student.teacher_id === item.account_id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
    <label class="field wide"><span>목표</span><input name="goal" value="${escapeAttr(student.goal || "")}" /></label>
    <label class="field"><span>등록일</span><input name="enrolled_at" type="date" value="${escapeAttr(dateInputValue(student.enrolled_at))}" /></label>
    <label class="field wide"><span>내부 메모</span><textarea name="memo">${escapeHtml(student.memo || "")}</textarea></label>
    <div class="form-actions wide"><button class="btn">${icon("save")}${editing ? "수정 저장" : "수강생 등록"}</button></div>
  </form></section>`;
}

function renderEnrollments() {
  const teachers = state.accounts.filter((item) => item.role === "teacher" && item.active);
  const activeStudents = state.students.filter((item) => item.status !== "퇴원");
  const studentOptions = activeStudents.map((item) => `<option value="${item.student_id}">${escapeHtml(item.name)} · ${escapeHtml(item.major)}</option>`).join("");
  const teacherOptions = teachers.map((item) => `<option value="${item.account_id}">${escapeHtml(item.name)}</option>`).join("");
  return `
    ${pageHeading("수강·일정 관리", "수강 과목과 반복 일정, 개별 수업을 함께 관리합니다.")}
    <div class="management-grid schedule-management">
      <div class="stack">
        <section class="panel">
          <div class="panel-head"><div><h2>수강 등록</h2><p>${state.enrollments.length}건</p></div></div>
          ${enrollmentsTable(state.enrollments)}
        </section>
        <section class="panel">
          <div class="panel-head"><div><h2>예정 수업</h2><p>${state.lessons.filter((item) => item.lesson_date >= today()).length}건</p></div></div>
          ${lessonsTable(state.lessons.filter((item) => item.lesson_date >= today()).sort(compareLessons).slice(0, 30))}
        </section>
      </div>
      <div class="stack">
        <section class="panel form-panel">
          <div class="panel-head"><div><h2>새 수강 등록</h2><p>반복 일정 포함</p></div></div>
          <form class="panel-body form-grid two" onsubmit="createEnrollment(event)">
            <label class="field wide"><span>수강생</span><select name="student_id" required><option value="">선택</option>${studentOptions}</select></label>
            <label class="field"><span>담당 강사</span><select name="teacher_id" required><option value="">선택</option>${teacherOptions}</select></label>
            <label class="field"><span>과목</span><input name="subject" required /></label>
            <label class="field"><span>시작일</span><input name="start_date" type="date" value="${today()}" required /></label>
            <label class="field"><span>종료일</span><input name="end_date" type="date" /></label>
            <label class="field"><span>매주 요일</span><select name="weekly_day">${DAY_LABELS.map((day, index) => `<option value="${index}">${day}요일</option>`).join("")}</select></label>
            <label class="field"><span>시작 시간</span><input name="start_time" type="time" required /></label>
            <label class="field"><span>수업 시간</span><input name="duration_minutes" type="number" min="10" step="10" value="50" /></label>
            <label class="field"><span>강의실</span><input name="room" /></label>
            <input name="status" type="hidden" value="active" />
            <label class="field wide"><span>메모</span><textarea name="memo"></textarea></label>
            <div class="form-actions wide"><button class="btn">${icon("plus")}수강 등록</button></div>
          </form>
        </section>
        <section class="panel form-panel">
          <div class="panel-head"><div><h2>개별 수업 추가</h2><p>보강·임시 수업</p></div></div>
          <form class="panel-body form-grid two" onsubmit="createLesson(event)">
            <label class="field wide"><span>수강생</span><select name="student_id" required><option value="">선택</option>${studentOptions}</select></label>
            <label class="field"><span>담당 강사</span><select name="teacher_id" required><option value="">선택</option>${teacherOptions}</select></label>
            <label class="field"><span>과목</span><input name="subject" required /></label>
            <label class="field"><span>수업일</span><input name="lesson_date" type="date" value="${today()}" required /></label>
            <label class="field"><span>시작 시간</span><input name="start_time" type="time" required /></label>
            <label class="field"><span>수업 시간</span><input name="duration_minutes" type="number" min="10" step="10" value="50" /></label>
            <label class="field"><span>강의실</span><input name="room" /></label>
            <input name="status" type="hidden" value="예정" />
            <label class="field wide"><span>메모</span><textarea name="memo"></textarea></label>
            <div class="form-actions wide"><button class="btn">${icon("plus")}일정 추가</button></div>
          </form>
        </section>
      </div>
    </div>`;
}

function renderLessonLogs() {
  const canWrite = ["admin", "staff", "teacher"].includes(state.user.role);
  const filtered = filteredLessonLogs();
  return `
    ${pageHeading(state.user.role === "student" ? "내 수업일지" : "수업일지", canWrite ? "빠르게 작성하고 강사·수강생·과목별로 모아봅니다." : "강사가 작성한 학습 내용과 과제를 확인합니다.")}
    <div class="${canWrite ? "journal-layout" : ""}">
      <section class="panel journal-list-panel">
        <div class="panel-head"><div><h2>수업 기록</h2><p>${filtered.length}건</p></div></div>
        ${lessonLogFilters()}
        ${logsTable(filtered)}
      </section>
      ${canWrite ? renderLessonLogComposer() : ""}
    </div>`;
}

function lessonLogFilters() {
  const teachers = uniqueBy(state.lessonLogs.map((item) => ({ id: item.teacher_id, name: item.teacher_name || accountName(item.teacher_id) })), "id");
  const students = uniqueBy(state.lessonLogs.map((item) => ({ id: item.student_id, name: item.student_name || studentName(item.student_id) })), "id");
  const subjects = unique(state.lessonLogs.map((item) => item.subject).filter(Boolean)).sort();
  return `<div class="filter-bar">
    <form class="search-box" onsubmit="applyLogSearch(event)">${icon("search")}<input name="query" value="${escapeAttr(state.logFilters.query)}" placeholder="수업 내용 검색" /><button type="submit" class="sr-only">검색</button></form>
    ${state.user.role !== "student" ? `<select aria-label="수강생 필터" onchange="setLogFilter('student', this.value)"><option value="">전체 수강생</option>${students.map((item) => `<option value="${item.id}" ${state.logFilters.student === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select>` : ""}
    ${["admin", "staff"].includes(state.user.role) ? `<select aria-label="강사 필터" onchange="setLogFilter('teacher', this.value)"><option value="">전체 강사</option>${teachers.map((item) => `<option value="${item.id}" ${state.logFilters.teacher === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select>` : ""}
    <select aria-label="과목 필터" onchange="setLogFilter('subject', this.value)"><option value="">전체 과목</option>${subjects.map((item) => `<option ${state.logFilters.subject === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select>
    <input aria-label="시작일" type="date" value="${escapeAttr(state.logFilters.from)}" onchange="setLogFilter('from', this.value)" />
    <input aria-label="종료일" type="date" value="${escapeAttr(state.logFilters.to)}" onchange="setLogFilter('to', this.value)" />
    <button class="btn ghost small" onclick="resetLogFilters()">${icon("refresh")}초기화</button>
  </div>`;
}

function filteredLessonLogs() {
  const filters = state.logFilters;
  return state.lessonLogs.filter((item) => {
    const text = [item.lesson_content, item.homework, item.next_goal, item.practice_request, item.student_name, item.teacher_name, item.subject].join(" ").toLowerCase();
    return (!filters.query || text.includes(filters.query.toLowerCase()))
      && (!filters.teacher || item.teacher_id === filters.teacher)
      && (!filters.student || item.student_id === filters.student)
      && (!filters.subject || item.subject === filters.subject)
      && (!filters.from || item.lesson_date >= filters.from)
      && (!filters.to || item.lesson_date <= filters.to);
  }).sort((a, b) => String(b.lesson_date).localeCompare(String(a.lesson_date)));
}

function renderLessonLogComposer() {
  const draft = state.lessonDraft;
  const attendance = draft.attendance_status || "출석";
  const teachers = state.accounts.filter((item) => item.role === "teacher" && item.active);
  const templates = [...BUILTIN_TEMPLATES, ...state.templates];
  return `<aside class="panel composer-panel">
    <div class="panel-head"><div><h2>수업일지 작성</h2><p data-draft-status>${Object.keys(draft).length ? "임시 저장됨" : "자동 임시 저장"}</p></div><button class="btn ghost small" type="button" onclick="loadPreviousLessonLog()">${icon("refresh")}이전 일지</button></div>
    <div class="template-strip"><span>빠른 템플릿</span><div>${templates.slice(0, 7).map((item) => `<button type="button" onclick="applyLessonTemplate('${item.template_id}')">${escapeHtml(item.title)}</button>`).join("")}</div></div>
    <form id="lesson-log-form" class="panel-body journal-form" onsubmit="createLessonLog(event)" oninput="saveLessonDraft(this)">
      <div class="form-grid two">
        <label class="field"><span>수업일</span><input name="lesson_date" type="date" value="${escapeAttr(draft.lesson_date || today())}" required /></label>
        <label class="field"><span>수강생</span><select name="student_id" onchange="handleLessonStudentChange(this.value)" required><option value="">선택</option>${state.students.map((item) => `<option value="${item.student_id}" ${draft.student_id === item.student_id ? "selected" : ""}>${escapeHtml(item.name)} · ${escapeHtml(item.major || "")}</option>`).join("")}</select></label>
        ${["admin", "staff"].includes(state.user.role) ? `<label class="field"><span>강사</span><select name="teacher_id" required><option value="">선택</option>${teachers.map((item) => `<option value="${item.account_id}" ${draft.teacher_id === item.account_id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>` : ""}
        <label class="field"><span>과목</span><input name="subject" value="${escapeAttr(draft.subject || "")}" required /></label>
      </div>
      <div class="field"><span>출결</span><input name="attendance_status" type="hidden" value="${escapeAttr(attendance)}" /><div class="segmented">${ATTENDANCE_OPTIONS.map((item) => `<button type="button" data-attendance="${item}" class="${attendance === item ? "active" : ""}" onclick="setAttendance('${item}')">${item}</button>`).join("")}</div></div>
      <label class="field"><span>수업 내용</span><textarea name="lesson_content" rows="5" placeholder="오늘 진행한 내용과 피드백을 기록하세요." required>${escapeHtml(draft.lesson_content || "")}</textarea></label>
      <label class="field"><span>과제</span><textarea name="homework" rows="2" placeholder="다음 수업 전까지 할 과제">${escapeHtml(draft.homework || "")}</textarea></label>
      <div class="form-grid two">
        <label class="field"><span>다음 수업 목표</span><textarea name="next_goal" rows="2">${escapeHtml(draft.next_goal || "")}</textarea></label>
        <label class="field"><span>연습 요청</span><textarea name="practice_request" rows="2">${escapeHtml(draft.practice_request || "")}</textarea></label>
      </div>
      <label class="field"><span>내부 메모 <small>수강생에게 비공개</small></span><textarea name="internal_memo" rows="2">${escapeHtml(draft.internal_memo || "")}</textarea></label>
      <div class="composer-actions"><button class="btn secondary" type="button" onclick="saveCurrentAsTemplate()">${icon("template")}템플릿 저장</button><button class="btn" type="submit">${icon("save")}저장 완료</button></div>
    </form>
  </aside>`;
}

function logsTable(logs) {
  if (!logs.length) return empty("조건에 맞는 수업일지가 없습니다.");
  return `<div class="table-wrap"><table class="journal-table"><thead><tr><th>날짜</th><th>수강생</th><th>강사</th><th>과목</th><th>출결</th><th>수업 내용 요약</th><th>보기</th></tr></thead><tbody>${logs.map((item) => `<tr><td>${escapeHtml(formatDate(item.lesson_date))}</td><td><strong>${escapeHtml(item.student_name || studentName(item.student_id) || "-")}</strong></td><td>${escapeHtml(item.teacher_name || accountName(item.teacher_id) || "-")}</td><td>${escapeHtml(item.subject || "-")}</td><td>${statusBadge(item.attendance_status, item.attendance_status === "출석" ? "success" : item.attendance_status === "지각" ? "warning" : "danger")}</td><td class="wrap summary-cell">${escapeHtml(item.lesson_content || "-")}</td><td><button class="icon-button" onclick="viewLog('${item.log_id}')" aria-label="수업일지 보기">${icon("eye")}</button></td></tr>`).join("")}</tbody></table></div>`;
}

function renderLogModal() {
  const log = state.lessonLogs.find((item) => item.log_id === state.selectedLogId);
  if (!log) return "";
  return `<div class="modal-backdrop" onclick="closeLog()"><article class="modal" onclick="event.stopPropagation()"><header><div><span>${formatDate(log.lesson_date)} · ${escapeHtml(log.subject)}</span><h2>${escapeHtml(log.student_name || studentName(log.student_id))} 수업일지</h2></div><button class="icon-button" onclick="closeLog()" aria-label="닫기">${icon("close")}</button></header><div class="modal-meta"><span>${statusBadge(log.attendance_status, log.attendance_status === "출석" ? "success" : "warning")}</span><span>강사 ${escapeHtml(log.teacher_name || accountName(log.teacher_id) || "-")}</span></div><div class="log-detail-grid">${detailBlock("수업 내용", log.lesson_content)}${detailBlock("과제", log.homework)}${detailBlock("다음 수업 목표", log.next_goal)}${detailBlock("연습 요청", log.practice_request)}${log.internal_memo ? detailBlock("내부 메모", log.internal_memo, "private") : ""}</div></article></div>`;
}

function detailBlock(label, value, className = "") {
  return `<section class="log-detail ${className}"><h3>${label}</h3><p>${escapeHtml(value || "기록 없음").replace(/\n/g, "<br />")}</p></section>`;
}

function renderProfile() {
  return `
    ${pageHeading("내 계정", "계정 정보와 로그인 비밀번호를 관리합니다.")}
    <div class="profile-grid">
      <section class="profile-summary">
        <span class="avatar large">${escapeHtml(state.user.name.slice(0, 1))}</span>
        <div><h2>${escapeHtml(state.user.name)}</h2><p>${ROLE_LABELS[state.user.role]} · ${escapeHtml(state.user.login_id)}</p></div>
      </section>
      <section class="panel profile-panel">
        <div class="panel-head"><div><h2>비밀번호 변경</h2><p>8자 이상 사용해 주세요.</p></div></div>
        ${state.user.must_change_password ? `<div class="inline-alert">초기 비밀번호를 사용 중입니다. 계속하려면 새 비밀번호로 변경해 주세요.</div>` : ""}
        <form class="panel-body form-grid" onsubmit="changePassword(event)">
          <label class="field"><span>현재 비밀번호</span><input name="currentPassword" type="password" autocomplete="current-password" required /></label>
          <label class="field"><span>새 비밀번호</span><input name="newPassword" type="password" minlength="8" autocomplete="new-password" required /></label>
          <label class="field"><span>새 비밀번호 확인</span><input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required /></label>
          <div class="form-actions"><button class="btn">${icon("save")}비밀번호 변경</button></div>
        </form>
      </section>
      <section class="panel account-actions">
        <div class="panel-head"><div><h2>로그인 세션</h2><p>공용 기기에서는 사용 후 로그아웃하세요.</p></div></div>
        <div class="panel-body"><button class="btn secondary" onclick="logout()">${icon("logout")}로그아웃</button></div>
      </section>
    </div>`;
}

function scheduleTimeline(items) {
  if (!items.length) return empty("예정된 수업이 없습니다.", "새 일정이 등록되면 시간순으로 표시됩니다.");
  return `<div class="timeline">${items.map((item) => `<div class="timeline-item"><time>${escapeHtml(item.start_time || "--:--")}</time><span class="timeline-dot"></span><div><strong>${escapeHtml(item.student_name || studentName(item.student_id) || "-")}</strong><p>${escapeHtml(item.subject || "-")} · ${escapeHtml(item.teacher_name || accountName(item.teacher_id) || state.user.name)}</p><small>${escapeHtml(item.room || "강의실 미정")} · ${escapeHtml(item.duration_minutes || 50)}분</small></div>${statusBadge(item.status || "예정", item.status === "완료" ? "success" : "info")}</div>`).join("")}</div>`;
}

function activityList(items) {
  if (!items.length) return empty("최근 활동이 없습니다.");
  return `<div class="activity-list">${items.map((item) => {
    const usageItem = Boolean(item.action);
    return `<div><span class="activity-icon">${icon(usageItem ? actionIcon(item.action) : "book")}</span><div><strong>${usageItem ? escapeHtml(item.account_name || "사용자") : escapeHtml(item.teacher_name || "강사")}</strong><p>${usageItem ? formatAction(item.action) : `${escapeHtml(item.student_name || "수강생")} 수업일지 작성`}</p></div><time>${formatRelative(item.occurred_at || item.created_at)}</time></div>`;
  }).join("")}</div>`;
}

function teacherWorkloadTable(items) {
  if (!items.length) return empty("등록된 강사 업무 데이터가 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>강사</th><th>담당 수강생</th><th>7일 내 수업</th><th>이번 달 일지</th></tr></thead><tbody>${items.map((item) => `<tr><td><strong>${escapeHtml(item.teacher_name)}</strong></td><td>${item.active_students}명</td><td>${item.next_7_days}회</td><td>${item.month_logs}건</td></tr>`).join("")}</tbody></table></div>`;
}

function enrollmentCards(items, teacherView) {
  if (!items.length) return empty("현재 활성 수강 등록이 없습니다.");
  return `<div class="enrollment-list">${items.map((item) => `<div><span class="subject-mark">${escapeHtml((item.subject || "수").slice(0, 1))}</span><div><strong>${escapeHtml(item.subject)}</strong><p>${teacherView ? escapeHtml(item.student_name) : escapeHtml(item.teacher_name)}</p><small>${DAY_LABELS[Number(item.weekly_day)] || "-"}요일 ${escapeHtml(item.start_time || "시간 미정")} · ${escapeHtml(item.room || "강의실 미정")}</small></div></div>`).join("")}</div>`;
}

function logsCompactList(items) {
  if (!items.length) return empty("최근 수업일지가 없습니다.");
  return `<div class="compact-log-list">${items.map((item) => `<button onclick="viewLog('${item.log_id}')"><time>${formatDate(item.lesson_date)}</time><div><strong>${escapeHtml(item.student_name || studentName(item.student_id) || "-")} · ${escapeHtml(item.subject || "-")}</strong><p>${escapeHtml(item.lesson_content || "-")}</p></div>${statusBadge(item.attendance_status, item.attendance_status === "출석" ? "success" : "warning")}${icon("chevron")}</button>`).join("")}</div>`;
}

function enrollmentsTable(items) {
  if (!items.length) return empty("등록된 수강 정보가 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>수강생</th><th>과목</th><th>강사</th><th>기간</th><th>반복 일정</th><th>상태</th></tr></thead><tbody>${items.map((item) => `<tr><td><strong>${escapeHtml(item.student_name || studentName(item.student_id))}</strong></td><td>${escapeHtml(item.subject)}</td><td>${escapeHtml(item.teacher_name || accountName(item.teacher_id))}</td><td>${escapeHtml(formatDate(item.start_date))} ~ ${item.end_date ? escapeHtml(formatDate(item.end_date)) : "계속"}</td><td>${DAY_LABELS[Number(item.weekly_day)] || "-"} ${escapeHtml(item.start_time || "")}</td><td>${statusBadge(ENROLLMENT_STATUS_LABELS[item.status] || item.status, item.status === "active" ? "success" : "muted")}</td></tr>`).join("")}</tbody></table></div>`;
}

function lessonsTable(items) {
  if (!items.length) return empty("예정된 개별 수업이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>일시</th><th>수강생</th><th>강사</th><th>과목</th><th>강의실</th><th>상태</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(formatDate(item.lesson_date))} ${escapeHtml(item.start_time || "")}</td><td><strong>${escapeHtml(item.student_name || studentName(item.student_id))}</strong></td><td>${escapeHtml(item.teacher_name || accountName(item.teacher_id))}</td><td>${escapeHtml(item.subject)}</td><td>${escapeHtml(item.room || "-")}</td><td>${statusBadge(item.status || "예정", item.status === "완료" ? "success" : "info")}</td></tr>`).join("")}</tbody></table></div>`;
}

function usageTable(items) {
  if (!items?.length) return empty("이용 기록이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>시간</th><th>사용자</th><th>권한</th><th>활동</th><th>대상</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(formatDateTime(item.occurred_at))}</td><td><strong>${escapeHtml(item.account_name)}</strong></td><td>${ROLE_LABELS[item.role] || item.role}</td><td>${escapeHtml(formatAction(item.action))}</td><td>${escapeHtml(formatTarget(item.target_type, item.target_id))}</td></tr>`).join("")}</tbody></table></div>`;
}

function statusBadge(label, tone = "muted") {
  return `<span class="status-badge ${tone}">${escapeHtml(label)}</span>`;
}

function empty(message, description = "새 항목이 등록되면 이곳에 표시됩니다.") {
  return `<div class="empty"><span class="empty-icon">${icon("calendar")}</span><strong>${escapeHtml(message)}</strong><p>${escapeHtml(description)}</p></div>`;
}

function emptyInline(message) {
  return `<p class="empty-inline">${escapeHtml(message)}</p>`;
}

function studentName(id) {
  return state.students.find((item) => item.student_id === id)?.name;
}

function accountName(id) {
  return state.accounts.find((item) => item.account_id === id)?.name;
}

function enrollmentTeacherName(studentId) {
  return state.enrollments.find((item) => item.student_id === studentId)?.teacher_name;
}

function studentById(data, id) {
  return data.students.find((item) => item.student_id === id);
}

function accountById(data, id) {
  return data.accounts.find((item) => item.account_id === id);
}

function unique(values) {
  return Array.from(new Set(values));
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => item[key] && !seen.has(item[key]) && seen.add(item[key]));
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00+09:00`);
  date.setDate(date.getDate() + amount);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function dateDiffDays(fromDate, toDate) {
  return Math.max(0, Math.floor((new Date(`${toDate}T12:00:00+09:00`) - new Date(`${fromDate}T12:00:00+09:00`)) / 86400000));
}

function durationText(days) {
  if (!days) return "0일";
  if (days < 31) return `${days}일`;
  const months = Math.floor(days / 30);
  const rest = days % 30;
  return rest ? `${months}개월 ${rest}일` : `${months}개월`;
}

function compareLessons(a, b) {
  return `${a.lesson_date} ${a.start_time || ""}`.localeCompare(`${b.lesson_date} ${b.start_time || ""}`);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).slice(0, 10) + "T12:00:00+09:00");
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", weekday: "short", timeZone: "Asia/Seoul" }).format(date);
}

function formatShortDate(value) {
  return String(value).slice(5).replace("-", ".");
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(date);
}

function formatRelative(value) {
  if (!value) return "";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`;
  return formatDate(value);
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formatAction(action) {
  const labels = {
    login: "로그인",
    logout: "로그아웃",
    page_view: "페이지 조회",
    create_account: "계정 생성",
    activate_account: "계정 활성화",
    deactivate_account: "계정 중지",
    reset_password: "비밀번호 초기화",
    change_password: "비밀번호 변경",
    create_student: "수강생 등록",
    update_student: "수강생 수정",
    create_enrollment: "수강 등록",
    create_lesson: "수업 일정 등록",
    create_lesson_log: "수업일지 작성",
    create_lesson_template: "수업일지 템플릿 생성",
    delete_lesson_template: "수업일지 템플릿 삭제"
  };
  return labels[action] || action || "-";
}

function actionIcon(action) {
  if (action === "login" || action === "logout") return "userCog";
  if (action.includes("lesson_log")) return "book";
  if (action.includes("student") || action.includes("account")) return "users";
  if (action.includes("enrollment") || action.includes("lesson")) return "calendar";
  return "chart";
}

function formatTarget(type, id) {
  if (!type) return "-";
  const labels = { account: "계정", student: "수강생", enrollment: "수강", lesson: "수업", lesson_log: "수업일지", lesson_template: "템플릿", page: "화면" };
  return `${labels[type] || type}${id ? ` · ${id}` : ""}`;
}

window.login = login;
window.logout = logout;
window.retryConnection = retryConnection;
window.startDemo = startDemo;
window.navigate = navigate;
window.toggleMobileMenu = toggleMobileMenu;
window.refreshData = refreshData;
window.createAccount = createAccount;
window.createStudent = createStudent;
window.updateStudent = updateStudent;
window.createEnrollment = createEnrollment;
window.createLesson = createLesson;
window.toggleAccount = toggleAccount;
window.resetAccountPassword = resetAccountPassword;
window.changePassword = changePassword;
window.beginStudentEdit = beginStudentEdit;
window.cancelStudentEdit = cancelStudentEdit;
window.saveLessonDraft = saveLessonDraft;
window.handleLessonStudentChange = handleLessonStudentChange;
window.setAttendance = setAttendance;
window.applyLessonTemplate = applyLessonTemplate;
window.loadPreviousLessonLog = loadPreviousLessonLog;
window.saveCurrentAsTemplate = saveCurrentAsTemplate;
window.deleteLessonTemplate = deleteLessonTemplate;
window.createLessonLog = createLessonLog;
window.setLogFilter = setLogFilter;
window.applyLogSearch = applyLogSearch;
window.resetLogFilters = resetLogFilters;
window.viewLog = viewLog;
window.closeLog = closeLog;

initializeApp();
