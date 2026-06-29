const AUTO_API_ENDPOINT = window.BONSUNG_CONFIG?.apiEndpoint || "";

const STORAGE = {
  token: "bonsung_session_token",
  user: "bonsung_current_user",
  demoData: "bonsung_demo_data_v8",
  lessonDraft: "bonsung_lesson_draft_v1",
  theme: "bonsung_theme",
  density: "bonsung_density"
};

const ROLE_LABELS = { admin: "관리자", staff: "직원", teacher: "강사", student: "수강생" };
const POSITION_LABELS = { owner: "원장(대표)", manager: "팀장", employee: "사원", teacher: "강사" };
const STATUS_OPTIONS = ["상담중", "등록대기", "재원", "휴원", "퇴원"];
const ATTENDANCE_OPTIONS = ["출석", "지각", "결석", "취소"];
const RESERVATION_PURPOSES = ["레슨", "이론수업", "회의", "연습"];
const CLASS_TYPE_CATEGORIES = ["보컬"];
const DEFAULT_REGISTRATION_PROGRAMS = [
  { class_type_id: "program-senior", name: "시니어", category: "보컬", active: true, sort_order: 1 },
  { class_type_id: "program-pro", name: "프로 (입시·오디션)", category: "보컬", active: true, sort_order: 2 },
  { class_type_id: "program-academic", name: "아카데믹 (취미)", category: "보컬", active: true, sort_order: 3 },
  { class_type_id: "program-event", name: "이벤트 (축가·행사)", category: "보컬", active: true, sort_order: 4 }
];
const ENROLLMENT_STATUS_LABELS = { active: "수강중", paused: "휴강", completed: "종료", canceled: "취소" };
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const root = document.getElementById("app");
const TEST_MODE = Boolean(window.BONSUNG_TEST_MODE);
const DEFAULT_PUBLIC_CONFIG = {
  login_context_title: "오늘의 수업부터\n수강생 성장 기록까지",
  login_context_body: "관리자는 운영 흐름을 확인하고, 강사는 수업에 집중하며, 수강생은 자신의 학습 기록을 한곳에서 확인합니다.",
  login_popup_enabled: true,
  login_popup_title: "본성뮤직 운영 안내",
  login_popup_body: "계정이 없는 구성원은 신규 계정 요청을 제출해 주세요. 관리자 승인 후 로그인할 수 있습니다."
};
const BRAND_MARK_HTML = '<span class="brand-mark"><img src="./assets/bonsung-logo-seal.png" alt="" /></span>';

const DEFAULT_ADMIN_WIDGETS = ["stats", "calendar", "today", "activity", "workload", "registrations"];
const DEFAULT_PERSONAL_WIDGETS = ["stats", "calendar", "upcoming", "enrollments", "logs"];
const DASHBOARD_WIDGET_LABELS = {
  stats: "핵심 지표",
  calendar: "다가오는 일정",
  today: "오늘 수업",
  activity: "최근 활동",
  workload: "강사 현황",
  registrations: "재등록 확인",
  upcoming: "다가오는 수업",
  enrollments: "현재 수강/담당 과목",
  logs: "최근 수업일지"
};

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
  template: '<path d="M4 4h16v16H4zM4 9h16M9 9v11"/>',
  building: '<path d="M3 21h18M6 21V5l6-3 6 3v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4"/>',
  credit: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18"/>',
  meeting: '<path d="M4 4h16v12H8l-4 4V4Z"/><path d="M8 9h8M8 12h5"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  arrowLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowUp: '<path d="m18 15-6-6-6 6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>'
};

function icon(name, className = "") {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.home}</svg>`;
}

function brandLockup({ large = false, academy = false, system = "ACADEMY INTRANET" } = {}) {
  return `<div class="brand-lockup ${large ? "large" : ""}">${BRAND_MARK_HTML}<div><strong>${academy ? "본성뮤직 아카데미" : "본성뮤직"}</strong><small>${system}</small></div></div>`;
}

function keyBy(items, key) {
  return items.reduce((map, item) => {
    map[item[key]] = item;
    return map;
  }, {});
}

const state = {
  endpoint: AUTO_API_ENDPOINT,
  token: localStorage.getItem(STORAGE.token) || "",
  user: readJson(STORAGE.user),
  demo: TEST_MODE || new URLSearchParams(location.search).get("demo") === "1",
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
  registrations: [],
  rooms: [],
  reservations: [],
  workLogs: [],
  meetings: [],
  calendar: [],
  tasks: [],
  classTypes: [],
  accountRequests: [],
  publicConfig: { ...DEFAULT_PUBLIC_CONFIG },
  capabilities: {},
  loaded: {},
  accountType: "",
  employeePosition: "",
  calendarMonth: today().slice(0, 7),
  editingStudentId: null,
  selectedLogId: null,
  selectedEntity: null,
  subview: "",
  navigationStack: [],
  mobileMenu: false,
  loading: false,
  message: "",
  studentFilters: { query: "", status: "", teacher: "", sort: "nameAsc" },
  logFilters: { query: "", teacher: "", student: "", subject: "", from: "", to: "", sort: "dateDesc" },
  meetingFilters: { query: "", participant: "", status: "", from: "", to: "", sort: "dateAsc" },
  calendarSearch: "",
  calendarSort: "dateAsc",
  calendarFilter: "all",
  reservationFilter: { date: today(), room: "all" },
  reservationDraft: null,
  lessonDraft: readJson(STORAGE.lessonDraft) || {},
  theme: localStorage.getItem(STORAGE.theme) || "system",
  density: localStorage.getItem(STORAGE.density) || "comfortable",
  authDialog: "",
  publicConfigLoaded: false
};

applyTheme(state.theme);
applyDensity(state.density);
if (state.user) {
  state.capabilities = demoCapabilities(state.user);
  state.accountType = state.user.account_type || (state.user.role === "admin" ? "admin" : state.user.role === "student" ? "student" : "staff");
  state.employeePosition = state.user.employee_position || (state.user.role === "teacher" ? "teacher" : "");
  applyUserPreferences(state.user);
}

const DEMO_STUDENTS = [
  ["김도윤", "2008-04-12", "프로 (입시·오디션)", "대학 실용음악과 입시 준비"],
  ["박서아", "2009-08-20", "프로 (입시·오디션)", "기획사 오디션 곡 완성"],
  ["이준호", "1964-02-18", "시니어", "호흡과 발성 기초 다지기"],
  ["최미경", "1958-11-03", "시니어", "애창곡을 안정적으로 부르기"],
  ["정하은", "1997-06-24", "아카데믹 (취미)", "취미 보컬과 자신감 향상"],
  ["윤태민", "1992-09-15", "아카데믹 (취미)", "음정 교정과 고음 확장"],
  ["한지우", "2007-01-30", "프로 (입시·오디션)", "예고 입시 자유곡 준비"],
  ["오세진", "1988-12-08", "이벤트 (축가·행사)", "결혼식 축가 완성"],
  ["송유나", "1995-05-19", "이벤트 (축가·행사)", "기업 행사 무대 준비"],
  ["임재현", "2001-03-11", "아카데믹 (취미)", "밴드 보컬 기본기 강화"],
  ["강수빈", "2006-10-27", "프로 (입시·오디션)", "대학 수시 실기 준비"],
  ["배정훈", "1961-07-06", "시니어", "트로트 발성과 리듬 익히기"]
].map((item, index) => {
  const number = index + 1;
  const teacherNumber = (index % 3) + 1;
  return {
    student_id: `stu-${number}`,
    name: item[0],
    birth_date: item[1],
    phone: `010-3000-${String(number).padStart(4, "0")}`,
    guardian_name: number <= 3 ? `${item[0].slice(0, 1)}보호자` : "",
    guardian_phone: number <= 3 ? `010-4000-${String(number).padStart(4, "0")}` : "",
    major: "보컬",
    goal: item[3],
    status: number === 12 ? "등록대기" : "재원",
    teacher_id: `acc-teacher-${teacherNumber}`,
    enrolled_at: `2026-${String(2 + (index % 4)).padStart(2, "0")}-${String(3 + index).padStart(2, "0")}`,
    memo: `${item[2]} 등록 기준`
  };
});

const DEMO_ACCOUNTS = [
  { account_id: "acc-admin", login_id: "admin", role: "admin", account_type: "admin", employee_position: "owner", name: "admin", email: "admin@bonsung.test", phone: "", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-owner", login_id: "owner", role: "staff", account_type: "staff", employee_position: "owner", name: "한지훈 원장", email: "owner@bonsung.test", phone: "010-1111-1000", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-manager-1", login_id: "manager1", role: "staff", account_type: "staff", employee_position: "manager", name: "서유진 팀장", email: "manager1@bonsung.test", phone: "010-1111-2001", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-manager-2", login_id: "manager2", role: "staff", account_type: "staff", employee_position: "manager", name: "김현우 팀장", email: "manager2@bonsung.test", phone: "010-1111-2002", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-staff-1", login_id: "employee1", role: "staff", account_type: "staff", employee_position: "employee", name: "박서연 사원", email: "employee1@bonsung.test", phone: "010-1111-3001", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-staff-2", login_id: "employee2", role: "staff", account_type: "staff", employee_position: "employee", name: "이채원 사원", email: "employee2@bonsung.test", phone: "010-1111-3002", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-staff-3", login_id: "employee3", role: "staff", account_type: "staff", employee_position: "employee", name: "정민석 사원", email: "employee3@bonsung.test", phone: "010-1111-3003", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-teacher-1", login_id: "teacher1", role: "teacher", account_type: "staff", employee_position: "teacher", name: "안지훈 강사", email: "teacher1@bonsung.test", phone: "010-1000-2001", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-teacher-2", login_id: "teacher2", role: "teacher", account_type: "staff", employee_position: "teacher", name: "김나연 강사", email: "teacher2@bonsung.test", phone: "010-1000-2002", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  { account_id: "acc-teacher-3", login_id: "teacher3", role: "teacher", account_type: "staff", employee_position: "teacher", name: "최도현 강사", email: "teacher3@bonsung.test", phone: "010-1000-2003", linked_student_id: "", active: true, must_change_password: false, theme: "system" },
  ...DEMO_STUDENTS.map((student, index) => ({
    account_id: `acc-student-${index + 1}`,
    login_id: `student${index + 1}`,
    role: "student",
    account_type: "student",
    employee_position: "",
    name: student.name,
    email: "",
    phone: student.phone,
    linked_student_id: student.student_id,
    active: true,
    must_change_password: false,
    theme: "system"
  }))
];

const DEMO_ENROLLMENTS = DEMO_STUDENTS.map((student, index) => ({
  enrollment_id: `enr-${index + 1}`,
  student_id: student.student_id,
  teacher_id: student.teacher_id,
  subject: DEFAULT_REGISTRATION_PROGRAMS[index % DEFAULT_REGISTRATION_PROGRAMS.length].name,
  start_date: student.enrolled_at,
  end_date: "",
  status: student.status === "재원" ? "active" : "paused",
  weekly_day: index % 6,
  start_time: `${String(10 + (index % 8)).padStart(2, "0")}:00`,
  duration_minutes: 50,
  room: `소형 레슨실 ${(index % 2) + 1}`,
  memo: "보컬 정규 수강"
}));

const DEMO_LESSONS = DEMO_ENROLLMENTS.map((enrollment, index) => ({
  lesson_id: `les-${index + 1}`,
  lesson_date: `2026-06-${String(14 + (index % 6)).padStart(2, "0")}`,
  start_time: enrollment.start_time,
  duration_minutes: 50,
  student_id: enrollment.student_id,
  teacher_id: enrollment.teacher_id,
  subject: enrollment.subject,
  status: index === 1 ? "결석" : index < 4 ? "완료" : "예정",
  room: enrollment.room,
  enrollment_id: enrollment.enrollment_id,
  lesson_number: 4 + index,
  absence_reason: index === 1 ? "학교 일정" : "",
  makeup_date: index === 1 ? "2026-06-27" : "",
  memo: index === 1 ? "보강 일정 조율 중" : ""
}));

const DEMO_LESSON_LOGS = DEMO_LESSONS.slice(0, 9).map((lesson, index) => ({
  log_id: `log-${index + 1}`,
  lesson_date: lesson.lesson_date,
  student_id: lesson.student_id,
  teacher_id: lesson.teacher_id,
  subject: lesson.subject,
  lesson_number: lesson.lesson_number,
  lesson_content: ["복식호흡과 성대 접지", "음정 이동과 리듬 정확도", "곡 해석과 프레이징"][index % 3],
  homework: "지정 구간을 하루 15분 녹음하며 연습",
  next_goal: "원곡 키에서 한 절을 안정적으로 완성",
  practice_request: "목에 힘이 들어가지 않는지 확인",
  attendance_status: index === 1 ? "결석" : index === 4 ? "지각" : "출석",
  absence_reason: index === 1 ? "학교 일정" : "",
  makeup_date: index === 1 ? "2026-06-27" : "",
  internal_memo: index % 3 === 0 ? "다음 수업에서 호흡 길이 재확인" : "",
  created_at: `${lesson.lesson_date}T${lesson.start_time}:00+09:00`
}));

const DEMO_REGISTRATIONS = DEMO_ENROLLMENTS.map((enrollment, index) => ({
  registration_id: `reg-${index + 1}`,
  student_id: enrollment.student_id,
  enrollment_id: enrollment.enrollment_id,
  registration_type: index < 4 ? "신규등록" : "재등록",
  period_start: "2026-06-01",
  period_end: "2026-06-30",
  amount: [240000, 280000, 220000, 300000][index % 4],
  paid_at: index % 4 < 2 ? `2026-06-${String(index + 1).padStart(2, "0")}` : "",
  next_due_date: `2026-06-${String(18 + (index % 10)).padStart(2, "0")}`,
  payment_status: ["납부완료", "납부완료", "청구예정", "미납"][index % 4],
  payment_method: index % 4 < 2 ? (index % 2 ? "계좌이체" : "카드") : "",
  memo: index % 4 === 3 ? "수납 확인 연락 필요" : ""
}));

const demoSeed = {
  accounts: DEMO_ACCOUNTS,
  students: DEMO_STUDENTS,
  enrollments: DEMO_ENROLLMENTS,
  lessons: DEMO_LESSONS,
  lessonLogs: DEMO_LESSON_LOGS,
  templates: [
    { template_id: "tpl-1", teacher_id: "acc-teacher-1", title: "보컬 기본기", subject: "보컬", lesson_content: "호흡 확인\n발성 점검\n곡 적용", homework: "립트릴과 허밍 연습", next_goal: "한 절 안정적으로 연결", practice_request: "매일 짧게 녹음", active: true, scope: "personal" },
    { template_id: "tpl-2", teacher_id: "acc-teacher-2", title: "곡 완성", subject: "보컬", lesson_content: "곡 구조 분석\n구간별 프레이징\n전체 연결", homework: "어려운 구간 반복", next_goal: "원곡 템포 완창", practice_request: "연습 영상 1회 촬영", active: true, scope: "personal" }
  ],
  usage: [
    { event_id: "evt-1", occurred_at: "2026-06-14T09:10:00+09:00", account_id: "acc-admin", role: "admin", action: "login", target_type: "account", target_id: "acc-admin", date_key: "2026-06-14" },
    { event_id: "evt-2", occurred_at: "2026-06-14T09:15:00+09:00", account_id: "acc-teacher-1", role: "teacher", action: "page_view", target_type: "page", target_id: "my-overview", date_key: "2026-06-14" },
    { event_id: "evt-3", occurred_at: "2026-06-14T09:20:00+09:00", account_id: "acc-staff-1", role: "staff", action: "create_student", target_type: "student", target_id: "stu-3", date_key: "2026-06-14" }
  ],
  registrations: DEMO_REGISTRATIONS,
  rooms: [
    { room_id: "room-lesson-large-1", room_type: "lesson", name: "대형 레슨실 1", active: true, sort_order: 1 },
    { room_id: "room-lesson-medium-1", room_type: "lesson", name: "중형 레슨실 1", active: true, sort_order: 2 },
    { room_id: "room-lesson-small-1", room_type: "lesson", name: "소형 레슨실 1", active: true, sort_order: 3 },
    { room_id: "room-lesson-small-2", room_type: "lesson", name: "소형 레슨실 2", active: true, sort_order: 4 },
    { room_id: "room-practice-a", room_type: "practice", name: "연습실 A", active: true, sort_order: 5 },
    { room_id: "room-practice-b", room_type: "practice", name: "연습실 B", active: true, sort_order: 6 },
    { room_id: "room-practice-c", room_type: "practice", name: "연습실 C", active: true, sort_order: 7 }
  ],
  reservations: [
    { reservation_id: "rsv-1", room_id: "room-lesson-small-1", reserved_by: "acc-teacher-1", reservation_date: "2026-06-14", start_time: "13:00", end_time: "14:00", purpose: "레슨", status: "예약", memo: "김도윤 보강" },
    { reservation_id: "rsv-2", room_id: "room-practice-a", reserved_by: "acc-student-1", reservation_date: "2026-06-14", start_time: "16:00", end_time: "17:00", purpose: "연습", status: "예약", memo: "오디션 곡 연습" },
    { reservation_id: "rsv-3", room_id: "room-practice-b", reserved_by: "acc-student-2", reservation_date: "2026-06-13", start_time: "18:00", end_time: "19:00", purpose: "연습", status: "사용완료", memo: "과제 연습" },
    { reservation_id: "rsv-4", room_id: "room-lesson-medium-1", reserved_by: "acc-manager-1", reservation_date: "2026-06-15", start_time: "09:00", end_time: "10:00", purpose: "회의", status: "예약", memo: "주간 운영회의" },
    { reservation_id: "rsv-5", room_id: "room-practice-c", reserved_by: "acc-teacher-3", reservation_date: "2026-06-14", start_time: "19:00", end_time: "20:00", purpose: "연습", status: "예약", memo: "레슨 시범곡 준비" }
  ],
  workLogs: [
    { work_log_id: "wrk-1", account_id: "acc-owner", work_date: "2026-06-14", clock_in_at: "2026-06-14T08:45:00+09:00", clock_out_at: "", memo: "" },
    { work_log_id: "wrk-2", account_id: "acc-manager-1", work_date: "2026-06-14", clock_in_at: "2026-06-14T09:05:00+09:00", clock_out_at: "", memo: "" },
    { work_log_id: "wrk-3", account_id: "acc-teacher-1", work_date: "2026-06-13", clock_in_at: "2026-06-13T10:30:00+09:00", clock_out_at: "2026-06-13T18:40:00+09:00", memo: "" }
  ],
  meetings: [
    { meeting_id: "mtg-1", title: "개원 운영 점검", meeting_date: "2026-06-15", start_time: "09:30", end_time: "10:20", location: "중형 레슨실 1", agenda: "신규 문의 대응과 첫 주 운영 점검", participant_ids: "acc-owner,acc-manager-1,acc-staff-1,acc-teacher-1", created_by: "acc-owner", status: "예정" },
    { meeting_id: "mtg-2", title: "강사 수업 운영 회의", meeting_date: "2026-06-18", start_time: "19:00", end_time: "19:40", location: "대형 레슨실 1", agenda: "수업일지 작성 기준 공유", participant_ids: "acc-manager-2,acc-teacher-1,acc-teacher-2,acc-teacher-3", created_by: "acc-manager-2", status: "예정" }
  ],
  calendarEvents: [
    { event_id: "cal-1", title: "학원 정기 휴무", event_date: "2026-06-21", start_time: "", end_time: "", event_type: "휴무", audience: "전체", description: "정기 휴무일", status: "예정" },
    { event_id: "cal-2", title: "월말 미니 콘서트", event_date: "2026-06-28", start_time: "17:00", end_time: "19:00", event_type: "행사", audience: "전체", description: "수강생 자유 참가", status: "예정" }
  ],
  tasks: [
    { task_id: "tsk-1", title: "신규 문의자 후속 연락", assignee_id: "acc-staff-1", due_date: "2026-06-15", status: "진행중", priority: "높음", memo: "오후 2시 이후 연락" },
    { task_id: "tsk-2", title: "강사 계약서 정리", assignee_id: "acc-manager-1", due_date: "2026-06-18", status: "할일", priority: "보통", memo: "" },
    { task_id: "tsk-3", title: "수업일지 작성", assignee_id: "acc-teacher-1", due_date: "2026-06-14", status: "진행중", priority: "높음", memo: "오늘 수업 2건" }
  ],
  classTypes: DEFAULT_REGISTRATION_PROGRAMS,
  accountRequests: [
    { request_id: "req-demo-1", login_id: "vocal.hana", name: "최하나", email: "hana@example.com", phone: "010-2222-3300", requested_role: "student", message: "보컬 수강 등록 후 사용할 계정을 요청합니다.", status: "대기", reviewed_by: "", reviewed_at: "", review_memo: "", created_account_id: "", created_at: "2026-06-15T09:10:00+09:00", updated_at: "2026-06-15T09:10:00+09:00", demo_password: "bonsung1" },
    { request_id: "req-demo-2", login_id: "vocal.min", name: "오민석", email: "min@example.com", phone: "010-2222-4400", requested_role: "teacher", message: "보컬 강사 계정 신청입니다.", status: "대기", reviewed_by: "", reviewed_at: "", review_memo: "", created_account_id: "", created_at: "2026-06-15T08:40:00+09:00", updated_at: "2026-06-15T08:40:00+09:00", demo_password: "bonsung1" }
  ],
  publicConfig: { ...DEFAULT_PUBLIC_CONFIG }
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
  if (action === "health") return { academyName: "본성뮤직 아카데미", schemaVersion: "6", service: "Demo", publicConfig: data.publicConfig || DEFAULT_PUBLIC_CONFIG };
  if (action === "requestAccount") {
    const input = payload.accountRequest || {};
    if (!input.login_id || !input.name || !input.password) throw new Error("이름, 로그인 아이디와 비밀번호를 입력해 주세요.");
    if (String(input.password).length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");
    if (data.accounts.some((item) => item.login_id.toLowerCase() === String(input.login_id).trim().toLowerCase())) throw new Error("이미 사용 중인 아이디입니다.");
    if (data.accountRequests.some((item) => item.login_id.toLowerCase() === String(input.login_id).trim().toLowerCase() && item.status === "대기")) throw new Error("같은 아이디로 검토 중인 요청이 있습니다.");
    const accountRequest = {
      request_id: uid("req"),
      login_id: String(input.login_id).trim(),
      name: String(input.name).trim(),
      email: input.email || "",
      phone: input.phone || "",
      requested_role: ["staff", "teacher", "student"].includes(input.requested_role) ? input.requested_role : "staff",
      message: input.message || "",
      status: "대기",
      reviewed_by: "",
      reviewed_at: "",
      review_memo: "",
      created_account_id: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      demo_password: input.password
    };
    data.accountRequests.unshift(accountRequest);
    saveDemoData(data);
    return { requestId: accountRequest.request_id, status: accountRequest.status };
  }
  if (action === "login") {
    const account = data.accounts.find((item) => item.login_id === payload.loginId && item.active);
    if (!account || payload.password !== (account.demo_password || "bonsung1")) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
    pushDemoEvent(data, account, "login", "account", account.account_id);
    return { token: `demo-${account.account_id}`, user: account };
  }
  const user = state.user;
  if (action === "bootstrap") return demoBootstrap(data, user);
  if (action === "logout") { pushDemoEvent(data, user, "logout", "account", user.account_id); return true; }
  if (action === "listAccounts") return demoAccounts(data);
  if (action === "createAccount") {
    if (data.accounts.some((item) => item.login_id === payload.account.login_id)) throw new Error("이미 사용 중인 아이디입니다.");
    const { password: _password, ...accountInput } = payload.account;
    const account = { ...accountInput, account_id: uid("acc"), active: true, must_change_password: true, account_type: accountInput.role === "admin" ? "admin" : accountInput.role === "student" ? "student" : "staff", employee_position: accountInput.role === "teacher" ? "teacher" : accountInput.employee_position || "", theme: "system", default_page: "", ui_density: "comfortable", dashboard_prefs_json: "" };
    data.accounts.push(account); pushDemoEvent(data, user, "create_account", "account", account.account_id); return account;
  }
  if (action === "updateAccountStatus") {
    const account = data.accounts.find((item) => item.account_id === payload.accountId);
    if (!account) throw new Error("계정을 찾을 수 없습니다.");
    account.active = payload.active; saveDemoData(data); return true;
  }
  if (action === "updateAccount") {
    const account = data.accounts.find((item) => item.account_id === payload.account.account_id);
    if (!account) throw new Error("계정을 찾을 수 없습니다.");
    const role = payload.account.role;
    Object.assign(account, payload.account, {
      account_type: role === "admin" ? "admin" : role === "student" ? "student" : "staff",
      employee_position: role === "teacher" ? "teacher" : payload.account.employee_position || "",
      permissions: {}
    });
    pushDemoEvent(data, user, "update_account", "account", account.account_id);
    return account;
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
    if (!demoCapabilities(user).manageStudents) throw new Error("수강생을 관리할 권한이 없습니다.");
    const student = { ...payload.student, major: "보컬", student_id: uid("stu"), created_at: new Date().toISOString() };
    data.students.push(student); pushDemoEvent(data, user, "create_student", "student", student.student_id); return student;
  }
  if (action === "updateStudent") {
    const index = data.students.findIndex((item) => item.student_id === payload.student.student_id);
    if (index < 0) throw new Error("수강생을 찾을 수 없습니다.");
    data.students[index] = { ...data.students[index], ...payload.student, major: "보컬" };
    pushDemoEvent(data, user, "update_student", "student", payload.student.student_id); return data.students[index];
  }
  if (action === "listEnrollments") return enrichDemoRows(demoVisible(data.enrollments), data);
  if (action === "createEnrollment") {
    const enrollment = { ...payload.enrollment, enrollment_id: uid("enr"), duration_minutes: Number(payload.enrollment.duration_minutes || 50) };
    data.enrollments.push(enrollment); pushDemoEvent(data, user, "create_enrollment", "enrollment", enrollment.enrollment_id); return enrollment;
  }
  if (action === "listLessons") return enrichDemoRows(demoVisible(data.lessons), data);
  if (action === "createLesson") {
    const previousCount = data.lessons.filter((item) => item.student_id === payload.lesson.student_id && item.subject === payload.lesson.subject).length;
    const lesson = { ...payload.lesson, lesson_id: uid("les"), duration_minutes: Number(payload.lesson.duration_minutes || 50), lesson_number: previousCount + 1 };
    data.lessons.push(lesson); pushDemoEvent(data, user, "create_lesson", "lesson", lesson.lesson_id); return lesson;
  }
  if (action === "updateLesson") {
    const lesson = data.lessons.find((item) => item.lesson_id === payload.lesson.lesson_id);
    if (!lesson) throw new Error("수업을 찾을 수 없습니다.");
    const canEdit = demoCapabilities(user).manageOperations || (user.role === "teacher" && lesson.teacher_id === user.account_id);
    if (!canEdit) throw new Error("수업 상태를 변경할 권한이 없습니다.");
    Object.assign(lesson, payload.lesson);
    pushDemoEvent(data, user, "update_lesson", "lesson", lesson.lesson_id); return lesson;
  }
  if (action === "listLessonLogs") return enrichDemoRows(demoVisible(data.lessonLogs), data).map((item) => {
    const copy = { ...item };
    if (user.role === "student") delete copy.internal_memo;
    return copy;
  });
  if (action === "createLessonLog") {
    if (!demoCapabilities(user).writeLessonLogs) throw new Error("수업일지를 작성할 권한이 없습니다.");
    const teacherId = user.role === "teacher" ? user.account_id : payload.log.teacher_id || studentById(data, payload.log.student_id)?.teacher_id;
    const relatedLessons = data.lessons.filter((item) => item.student_id === payload.log.student_id && item.teacher_id === teacherId && item.subject === payload.log.subject && item.lesson_date <= payload.log.lesson_date);
    const log = { ...payload.log, log_id: uid("log"), teacher_id: teacherId, lesson_number: Number(payload.log.lesson_number || relatedLessons.length || 1), created_at: new Date().toISOString() };
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
  if (action === "listRegistrations") return demoRegistrations(data, user);
  if (action === "createRegistration") {
    const registration = { ...payload.registration, registration_id: uid("reg"), amount: Number(payload.registration.amount || 0), created_by: user.account_id, created_at: new Date().toISOString() };
    data.registrations.unshift(registration); pushDemoEvent(data, user, "create_registration", "registration", registration.registration_id); return registration;
  }
  if (action === "listRooms") {
    const capabilities = demoCapabilities(user);
    return data.rooms.filter((item) => item.active && (item.room_type === "lesson" ? capabilities.reserveLessonRoom : capabilities.reservePracticeRoom));
  }
  if (action === "updateRoom") {
    const room = data.rooms.find((item) => item.room_id === payload.room.room_id);
    if (room) Object.assign(room, payload.room);
    saveDemoData(data); return true;
  }
  if (action === "listReservations") return enrichDemoReservations(data);
  if (action === "createReservation") {
    const reservation = { ...payload.reservation, reservation_id: uid("rsv"), reserved_by: user.account_id, status: "예약", created_at: new Date().toISOString() };
    const room = data.rooms.find((item) => item.room_id === reservation.room_id);
    const type = user.account_type || (user.role === "student" ? "student" : user.role === "admin" ? "admin" : "staff");
    const position = user.employee_position || (user.role === "teacher" ? "teacher" : "");
    if (type === "student" && room?.room_type !== "practice") throw new Error("수강생은 연습실만 예약할 수 있습니다.");
    if (type === "student" && reservation.purpose !== "연습") throw new Error("수강생은 연습 목적으로만 예약할 수 있습니다.");
    if (position === "teacher" && !["레슨", "이론수업", "연습"].includes(reservation.purpose)) throw new Error("강사는 레슨, 이론수업, 연습 목적으로 예약할 수 있습니다.");
    if (!/^\d{2}:00$/.test(reservation.start_time) || reservation.end_time !== addMinutesClient(reservation.start_time, 60)) throw new Error("공간 예약은 정각부터 1시간 단위로만 가능합니다.");
    const collision = data.reservations.some((item) => item.room_id === reservation.room_id && item.reservation_date === reservation.reservation_date && item.status === "예약" && reservation.start_time < item.end_time && reservation.end_time > item.start_time);
    if (collision) throw new Error("선택한 시간에 이미 예약이 있습니다.");
    data.reservations.push(reservation); pushDemoEvent(data, user, "create_reservation", "reservation", reservation.reservation_id); return reservation;
  }
  if (action === "updateReservationStatus") {
    const reservation = data.reservations.find((item) => item.reservation_id === payload.reservationId);
    if (reservation && reservation.reserved_by !== user.account_id && !demoCapabilities(user).manageReservations) throw new Error("예약을 변경할 권한이 없습니다.");
    if (reservation) reservation.status = payload.status;
    saveDemoData(data); return true;
  }
  if (action === "listWorkLogs") return demoWorkLogs(data, user);
  if (action === "clockWork") {
    const open = data.workLogs.find((item) => item.account_id === user.account_id && item.work_date === today() && !item.clock_out_at);
    if (payload.mode === "in") {
      if (open) throw new Error("이미 출근 처리되었습니다.");
      data.workLogs.unshift({ work_log_id: uid("wrk"), account_id: user.account_id, work_date: today(), clock_in_at: new Date().toISOString(), clock_out_at: "", memo: "" });
    } else {
      if (!open) throw new Error("출근 기록을 찾을 수 없습니다.");
      open.clock_out_at = new Date().toISOString();
    }
    pushDemoEvent(data, user, payload.mode === "in" ? "clock_in" : "clock_out", "work_log", open?.work_log_id || ""); return true;
  }
  if (action === "listMeetings") return demoMeetings(data, user);
  if (action === "createMeeting") {
    const humanParticipants = (payload.meeting.participant_ids || []).filter((id) => data.accounts.find((item) => item.account_id === id)?.account_type === "staff");
    if (user.account_type === "staff") humanParticipants.push(user.account_id);
    const meeting = { ...payload.meeting, meeting_id: uid("mtg"), participant_ids: unique(humanParticipants).join(","), created_by: user.account_id, status: "예정" };
    data.meetings.push(meeting); pushDemoEvent(data, user, "create_meeting", "meeting", meeting.meeting_id); return meeting;
  }
  if (action === "listCalendar") return demoCalendar(data, user);
  if (action === "createCalendarEvent") {
    const calendarEvent = { ...payload.calendarEvent, event_id: uid("cal"), created_by: user.account_id, status: "예정" };
    data.calendarEvents.push(calendarEvent); pushDemoEvent(data, user, "create_calendar_event", "calendar_event", calendarEvent.event_id); return calendarEvent;
  }
  if (action === "updateProfile") {
    const account = data.accounts.find((item) => item.account_id === user.account_id);
    Object.assign(account, payload.profile);
    state.user = { ...state.user, ...payload.profile };
    saveDemoData(data); return state.user;
  }
  if (action === "updateAccountPermissions") {
    const account = data.accounts.find((item) => item.account_id === payload.accountId);
    if (account) account.permissions = payload.permissions;
    saveDemoData(data); return true;
  }
  if (action === "listTasks") return data.tasks.filter((item) => item.assignee_id === (payload.accountId || user.account_id));
  if (action === "createTask") {
    const task = { ...payload.task, task_id: uid("tsk"), assignee_id: payload.task.assignee_id || user.account_id, created_by: user.account_id, created_at: new Date().toISOString() };
    data.tasks.push(task); pushDemoEvent(data, user, "create_task", "task", task.task_id); return task;
  }
  if (action === "listClassTypes") return data.classTypes.filter((item) => item.active);
  if (action === "createClassType") {
    const classType = { ...payload.classType, class_type_id: uid("cls"), active: true, sort_order: data.classTypes.length + 1 };
    data.classTypes.push(classType); saveDemoData(data); return classType;
  }
  if (action === "updateClassType") {
    const classType = data.classTypes.find((item) => item.class_type_id === payload.classType.class_type_id);
    if (classType) Object.assign(classType, payload.classType);
    saveDemoData(data); return true;
  }
  if (action === "listAccountRequests") return data.accountRequests.map(({ demo_password: _password, ...item }) => item);
  if (action === "reviewAccountRequest") {
    if (!demoCapabilities(user).reviewAccountRequests) throw new Error("계정 요청을 승인할 권한이 없습니다.");
    const accountRequest = data.accountRequests.find((item) => item.request_id === payload.requestId);
    if (!accountRequest || accountRequest.status !== "대기") throw new Error("처리할 수 없는 계정 요청입니다.");
    const now = new Date().toISOString();
    if (payload.decision === "reject") {
      Object.assign(accountRequest, { status: "반려", reviewed_by: user.account_id, reviewed_at: now, review_memo: payload.review?.memo || "", updated_at: now });
      saveDemoData(data);
      return { status: "반려" };
    }
    const role = ["staff", "teacher", "student"].includes(payload.review?.role) ? payload.review.role : accountRequest.requested_role;
    const account = {
      account_id: uid("acc"),
      login_id: accountRequest.login_id,
      role,
      account_type: role === "student" ? "student" : "staff",
      employee_position: role === "teacher" ? "teacher" : role === "staff" ? payload.review?.employee_position || "employee" : "",
      name: accountRequest.name,
      email: accountRequest.email,
      phone: accountRequest.phone,
      linked_student_id: role === "student" ? payload.review?.linked_student_id || "" : "",
      active: true,
      must_change_password: true,
      theme: "system",
      default_page: "",
      ui_density: "comfortable",
      dashboard_prefs_json: "",
      demo_password: accountRequest.demo_password || "bonsung1"
    };
    data.accounts.push(account);
    Object.assign(accountRequest, { status: "승인", reviewed_by: user.account_id, reviewed_at: now, review_memo: payload.review?.memo || "", created_account_id: account.account_id, demo_password: "", updated_at: now });
    saveDemoData(data);
    return { status: "승인", account };
  }
  if (action === "updatePublicSettings") {
    if (!demoCapabilities(user).managePublicSettings) throw new Error("로그인 화면 설정을 변경할 권한이 없습니다.");
    data.publicConfig = { ...DEFAULT_PUBLIC_CONFIG, ...payload.settings, login_popup_enabled: Boolean(payload.settings.login_popup_enabled) };
    saveDemoData(data);
    return data.publicConfig;
  }
  throw new Error("지원하지 않는 데모 작업입니다.");
}

function demoCapabilities(user) {
  const position = user.employee_position || (user.role === "teacher" ? "teacher" : user.role === "admin" ? "owner" : "");
  const type = user.account_type || (user.role === "admin" ? "admin" : user.role === "student" ? "student" : "staff");
  return {
    manageAccounts: type === "admin" || position === "owner",
    viewAccounts: type === "admin" || ["owner", "manager"].includes(position),
    manageOperations: type === "admin" || ["owner", "manager", "employee"].includes(position),
    managePermissions: type === "admin" || position === "owner",
    manageMeetings: type === "admin" || ["owner", "manager"].includes(position),
    manageCalendar: type === "admin" || ["owner", "manager"].includes(position),
    viewPayments: type !== "staff" || position !== "teacher",
    clockWork: type === "staff",
    viewStudents: true,
    manageStudents: type === "admin" || ["owner", "manager", "employee"].includes(position),
    viewLessonLogs: true,
    writeLessonLogs: type === "admin" || type === "staff",
    viewReservations: true,
    manageReservations: type === "admin" || ["owner", "manager", "employee"].includes(position),
    reserveLessonRoom: type === "admin" || type === "staff",
    reservePracticeRoom: true,
    viewTeam: type === "admin" || type === "staff",
    viewMeetings: type === "admin" || type === "staff",
    viewCalendar: true,
    reviewAccountRequests: type === "admin" || position === "owner",
    managePublicSettings: type === "admin" || position === "owner",
    ...(user.permissions || {})
  };
}

function demoAccounts(data) {
  return data.accounts.map((account) => {
    const logins = data.usage.filter((item) => item.account_id === account.account_id && item.action === "login").sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));
    return { ...account, last_login_at: logins[0]?.occurred_at || "", login_count: logins.length, recent_logins: logins.slice(0, 10).map((item) => item.occurred_at) };
  });
}

function demoBootstrap(data, user) {
  user = data.accounts.find((item) => item.account_id === user.account_id) || user;
  const capabilities = demoCapabilities(user);
  return {
    user,
    students: user.role === "teacher" ? data.students.filter((item) => item.teacher_id === user.account_id) : user.role === "student" ? data.students.filter((item) => item.student_id === user.linked_student_id) : data.students,
    lessonLogs: enrichDemoRows(demoVisible(data.lessonLogs), data),
    enrollments: enrichDemoRows(demoVisible(data.enrollments), data),
    lessons: enrichDemoRows(demoVisible(data.lessons), data),
    templates: user.role === "student" ? [] : data.templates.filter((item) => item.active && (item.scope === "global" || item.teacher_id === user.account_id)),
    overview: demoOverview(data, user),
    accounts: capabilities.viewAccounts ? demoAccounts(data) : [],
    usage: user.role === "admin" ? demoUsage(data) : null,
    registrations: demoRegistrations(data, user),
    rooms: data.rooms.filter((item) => item.active && (item.room_type === "lesson" ? capabilities.reserveLessonRoom : capabilities.reservePracticeRoom)),
    reservations: enrichDemoReservations(data),
    workLogs: demoWorkLogs(data, user),
    meetings: demoMeetings(data, user),
    calendar: demoCalendar(data, user),
    classTypes: data.classTypes,
    accountRequests: capabilities.reviewAccountRequests ? data.accountRequests.map(({ demo_password: _password, ...item }) => item) : [],
    publicConfig: data.publicConfig || DEFAULT_PUBLIC_CONFIG,
    capabilities,
    accountType: user.account_type || (user.role === "student" ? "student" : user.role === "admin" ? "admin" : "staff"),
    employeePosition: user.employee_position || (user.role === "teacher" ? "teacher" : ""),
    loaded: { core: true, accounts: true, usage: true, "lesson-logs": true, reservations: true, team: true, meetings: true, registrations: true, calendar: true }
  };
}

function demoRegistrations(data, user) {
  if (user.role === "teacher") return [];
  const rows = user.role === "student" ? data.registrations.filter((item) => item.student_id === user.linked_student_id) : data.registrations;
  return rows.map((item) => ({
    ...item,
    student_name: studentById(data, item.student_id)?.name || "",
    program_name: data.enrollments.find((enrollment) => enrollment.enrollment_id === item.enrollment_id)?.subject || ""
  }));
}

function enrichDemoReservations(data) {
  return data.reservations.filter((item) => state.user?.role !== "student" || data.rooms.find((room) => room.room_id === item.room_id)?.room_type === "practice").map((item) => ({
    ...item,
    room_name: data.rooms.find((room) => room.room_id === item.room_id)?.name || "",
    room_type: data.rooms.find((room) => room.room_id === item.room_id)?.room_type || "",
    reserved_by_name: accountById(data, item.reserved_by)?.name || ""
  })).sort((a, b) => `${a.reservation_date}${a.start_time}`.localeCompare(`${b.reservation_date}${b.start_time}`));
}

function demoWorkLogs(data, user) {
  const rows = demoCapabilities(user).manageOperations ? data.workLogs : data.workLogs.filter((item) => item.account_id === user.account_id);
  return rows.map((item) => ({ ...item, account_name: accountById(data, item.account_id)?.name || "" }));
}

function demoMeetings(data, user) {
  if (user.role === "student") return [];
  const rows = user.role === "admin" ? data.meetings : data.meetings.filter((item) => String(item.participant_ids).split(",").includes(user.account_id) || item.created_by === user.account_id);
  return rows.map((item) => ({
    ...item,
    participant_names: String(item.participant_ids).split(",").map((id) => accountById(data, id)?.name).filter(Boolean),
    creator_name: accountById(data, item.created_by)?.name || ""
  }));
}

function demoCalendar(data, user) {
  const lessons = enrichDemoRows(demoVisible(data.lessons), data).map((item) => ({ calendar_id: `lesson:${item.lesson_id}`, entity_id: item.lesson_id, title: `${item.subject} · ${item.student_name}`, date: item.lesson_date, start_time: item.start_time, end_time: addMinutesClient(item.start_time, item.duration_minutes), type: String(item.subject).includes("이론") ? "theory" : "lesson", detail: item.room, owner: item.teacher_name }));
  const meetings = demoMeetings(data, user).map((item) => ({ calendar_id: `meeting:${item.meeting_id}`, title: item.title, date: item.meeting_date, start_time: item.start_time, end_time: item.end_time, type: "meeting", detail: item.location, owner: item.creator_name }));
  const events = data.calendarEvents.map((item) => ({ calendar_id: `event:${item.event_id}`, title: item.title, date: item.event_date, start_time: item.start_time, end_time: item.end_time, type: item.event_type, detail: item.description, owner: "" }));
  return [...lessons, ...meetings, ...events].sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
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
    state.connection = "ready";
    state.connectionError = "";
    if (TEST_MODE && (!state.user || !String(state.token).startsWith("demo-"))) {
      const data = getDemoData();
      state.user = data.accounts.find((item) => item.login_id === "admin");
      state.token = `demo-${state.user.account_id}`;
      state.page = requestedTestPage() || "dashboard";
      applyBootstrap(demoBootstrap(data, state.user));
      return;
    }
    if (state.user && state.token) {
      state.page = preferredPage(state.user);
      state.loading = false;
      render();
      await refreshData(true);
    } else {
      if (state.user && !state.token) {
        state.user = null;
        localStorage.removeItem(STORAGE.user);
      }
      const health = await api("health");
      applyPublicConfig(health.publicConfig);
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

function applyPublicConfig(config) {
  state.publicConfig = { ...DEFAULT_PUBLIC_CONFIG, ...(config || {}) };
  state.publicConfig.login_popup_enabled = state.publicConfig.login_popup_enabled !== false;
  if (!state.publicConfigLoaded && state.publicConfig.login_popup_enabled) state.authDialog = "notice";
  state.publicConfigLoaded = true;
}

function startDemo() {
  const url = new URL(location.href);
  url.searchParams.set("demo", "1");
  location.href = url.toString();
}

function requestedTestPage() {
  const page = new URLSearchParams(location.search).get("page");
  return page ? page : "";
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setBusy(true, "");
  try {
    const result = await api("login", { loginId: form.get("loginId"), password: form.get("password") });
    state.token = result.token;
    state.user = result.user;
    state.capabilities = demoCapabilities(result.user);
    state.accountType = result.user.account_type || (result.user.role === "admin" ? "admin" : result.user.role === "student" ? "student" : "staff");
    state.employeePosition = result.user.employee_position || (result.user.role === "teacher" ? "teacher" : "");
    state.page = result.user.must_change_password ? "profile" : preferredPage(result.user);
    localStorage.setItem(STORAGE.token, result.token);
    localStorage.setItem(STORAGE.user, JSON.stringify(result.user));
    if (result.initialData) applyBootstrap(result.initialData);
    else {
      state.capabilities = demoCapabilities(result.user);
      state.accountType = result.user.account_type || (result.user.role === "admin" ? "admin" : result.user.role === "student" ? "student" : "staff");
      state.employeePosition = result.user.employee_position || (result.user.role === "teacher" ? "teacher" : "");
      state.loading = false;
      render();
      await refreshData(true);
    }
    api("recordPageView", { page: state.page }).catch(() => {});
  } catch (error) {
    setBusy(false, error.message);
  }
}

function openAuthDialog(dialog) {
  state.authDialog = dialog;
  state.message = "";
  render();
}

function closeAuthDialog() {
  state.authDialog = "";
  state.message = "";
  render();
}

async function submitAccountRequest(event) {
  event.preventDefault();
  const accountRequest = Object.fromEntries(new FormData(event.currentTarget));
  if (accountRequest.password !== accountRequest.confirm_password) {
    state.message = "비밀번호 확인이 일치하지 않습니다.";
    render();
    return;
  }
  delete accountRequest.confirm_password;
  setBusy(true, "");
  try {
    await api("requestAccount", { accountRequest });
    state.loading = false;
    state.authDialog = "request-success";
    state.message = "";
    render();
  } catch (error) {
    setBusy(false, error.message);
  }
}

function defaultPage(role) {
  if (role === "teacher" || role === "student") return "my-overview";
  return "dashboard";
}

function preferredPage(user = state.user) {
  if (!user) return "dashboard";
  const fallback = defaultPage(user.role);
  const candidate = user.default_page || fallback;
  return pageAllowed(candidate, user) ? candidate : fallback;
}

function pageAllowed(page, user = state.user) {
  if (!user) return false;
  return menusFor(user.role).some(([key]) => key === page);
}

async function refreshData(showLoader = true) {
  if (showLoader) setBusy(true, "");
  try {
    applyBootstrap(await api("bootstrap"));
  } catch (error) {
    if (/세션|로그인|token/i.test(error.message)) return logout(false);
    setBusy(false, error.message);
  }
}

function applyBootstrap(data) {
  Object.assign(state, data, { loading: false });
  if (data.publicConfig) {
    state.publicConfig = { ...DEFAULT_PUBLIC_CONFIG, ...data.publicConfig };
    state.publicConfigLoaded = true;
  }
  if (data.user) {
    state.user = data.user;
    localStorage.setItem(STORAGE.user, JSON.stringify(data.user));
    applyUserPreferences(data.user);
  }
  render();
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
  state.registrations = [];
  state.rooms = [];
  state.reservations = [];
  state.workLogs = [];
  state.meetings = [];
  state.calendar = [];
  state.tasks = [];
  state.classTypes = [];
  state.accountRequests = [];
  state.message = "";
  localStorage.removeItem(STORAGE.token);
  localStorage.removeItem(STORAGE.user);
  render();
}

function switchTestAccount(accountId) {
  if (!state.demo) return;
  const data = getDemoData();
  const account = data.accounts.find((item) => item.account_id === accountId);
  if (!account) return;
  state.user = account;
  state.token = `demo-${account.account_id}`;
  state.page = preferredPage(account);
  state.subview = "";
  state.selectedEntity = null;
  state.navigationStack = [];
  localStorage.setItem(STORAGE.user, JSON.stringify(account));
  localStorage.setItem(STORAGE.token, state.token);
  applyBootstrap(demoBootstrap(data, account));
}

function resetTestData() {
  localStorage.removeItem(STORAGE.demoData);
  const data = getDemoData();
  const account = data.accounts.find((item) => item.login_id === "admin");
  state.user = account;
  state.token = `demo-${account.account_id}`;
  state.page = preferredPage(account);
  applyBootstrap(demoBootstrap(data, account));
}

function navigate(page) {
  if (state.page !== page || state.selectedEntity) {
    state.navigationStack.push({ page: state.page, subview: state.subview, selectedEntity: state.selectedEntity });
    if (state.navigationStack.length > 20) state.navigationStack.shift();
  }
  state.page = page;
  state.subview = defaultSubview(page);
  state.selectedEntity = null;
  state.mobileMenu = false;
  state.message = "";
  render();
  api("recordPageView", { page }).catch(() => {});
  loadPageData(page);
}

function navigateSubview(page, subview) {
  if (state.page !== page || state.selectedEntity) {
    state.navigationStack.push({ page: state.page, subview: state.subview, selectedEntity: state.selectedEntity });
    if (state.navigationStack.length > 20) state.navigationStack.shift();
  }
  state.page = page;
  state.subview = subview || defaultSubview(page);
  state.selectedEntity = null;
  state.mobileMenu = false;
  state.message = "";
  render();
  api("recordPageView", { page }).catch(() => {});
  loadPageData(page);
}

function defaultSubview(page) {
  if (page === "lesson-logs") return "browse";
  if (page === "reservations") return "schedule";
  if (page === "enrollments") return "history";
  if (page === "accounts") return "list";
  if (page === "students") return "list";
  return "";
}

function setSubview(subview) {
  state.subview = subview;
  state.selectedEntity = null;
  state.mobileMenu = false;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function appBack() {
  const previous = state.navigationStack.pop();
  if (state.selectedEntity) {
    state.selectedEntity = null;
    render();
    return;
  }
  if (previous) {
    state.page = previous.page;
    state.subview = previous.subview || defaultSubview(previous.page);
    state.selectedEntity = previous.selectedEntity || null;
    render();
    loadPageData(state.page);
    return;
  }
  navigate(preferredPage(state.user));
}

function scrollTopPage() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function openEntity(type, id) {
  state.navigationStack.push({ page: state.page, subview: state.subview, selectedEntity: null });
  state.selectedEntity = { type, id };
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if ((type === "account" || type === "account-admin") && !state.accounts.some((item) => item.account_id === id) && state.capabilities.viewAccounts) {
    try {
      state.accounts = await api("listAccounts");
      state.loaded.accounts = true;
      render();
    } catch (error) {
      state.message = error.message;
      render();
      return;
    }
  }
  if (type === "account") {
    try {
      state.tasks = await api("listTasks", { accountId: id });
      render();
    } catch (error) {
      state.message = error.message;
      render();
    }
  }
}

function closeEntity() {
  state.navigationStack.pop();
  state.selectedEntity = null;
  render();
}

async function loadPageData(page) {
  if (state.demo || state.loaded[page] || !state.user) return;
  const tasks = [];
  const keys = [];
  if (page === "lesson-logs") {
    tasks.push(api("listLessonLogs"), state.user.role === "student" ? Promise.resolve([]) : api("listLessonTemplates"));
    keys.push("lessonLogs", "templates");
    if (["admin", "staff"].includes(state.user.role) && !state.loaded.accounts) { tasks.push(api("listAccounts")); keys.push("accounts"); }
  }
  if (page === "reservations") {
    tasks.push(api("listRooms"), api("listReservations"));
    keys.push("rooms", "reservations");
  }
  if (page === "team") {
    tasks.push(api("listWorkLogs"));
    keys.push("workLogs");
    if ((state.capabilities.viewAccounts || state.capabilities.manageOperations) && !state.loaded.accounts) { tasks.push(api("listAccounts")); keys.push("accounts"); }
  }
  if (page === "meetings") {
    tasks.push(api("listMeetings"));
    keys.push("meetings");
    if (state.capabilities.viewAccounts && !state.loaded.accounts) { tasks.push(api("listAccounts")); keys.push("accounts"); }
  }
  if (page === "accounts" && !state.loaded.accounts) {
    tasks.push(api("listAccounts"));
    keys.push("accounts");
  }
  if (page === "accounts" && state.capabilities.reviewAccountRequests) {
    tasks.push(api("listAccountRequests"));
    keys.push("accountRequests");
  }
  if (["students", "enrollments"].includes(page) && ["admin", "staff"].includes(state.user.role) && !state.loaded.accounts) {
    tasks.push(api("listAccounts"));
    keys.push("accounts");
  }
  if (page === "usage" && state.user.role === "admin") {
    tasks.push(api("getUsageSummary"));
    keys.push("usage");
  }
  if (!tasks.length) {
    state.loaded[page] = true;
    return;
  }
  state.loading = true;
  render();
  try {
    const results = await Promise.all(tasks);
    results.forEach((value, index) => { state[keys[index]] = value; });
    keys.forEach((key) => { if (key === "accounts") state.loaded.accounts = true; });
    state.loaded[page] = true;
    state.loading = false;
    render();
  } catch (error) {
    state.loading = false;
    state.message = error.message;
    render();
  }
}

async function refreshFeature(page, includeCore = false) {
  if (state.demo) {
    await refreshData(false);
    return;
  }
  if (includeCore) await refreshData(false);
  state.loaded[page] = false;
  await loadPageData(page);
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
    await refreshFeature("accounts");
    state.message = "계정이 생성되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function reviewAccountRequest(event, requestId) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const decision = event.submitter?.value || "approve";
  const review = Object.fromEntries(form);
  setBusy(true, "");
  try {
    await api("reviewAccountRequest", { requestId, decision, review });
    const [accounts, accountRequests] = await Promise.all([api("listAccounts"), api("listAccountRequests")]);
    state.accounts = accounts;
    state.accountRequests = accountRequests;
    state.loading = false;
    state.subview = "requests";
    state.message = decision === "approve" ? "신규 계정 요청을 승인했습니다." : "신규 계정 요청을 반려했습니다.";
    render();
  } catch (error) {
    setBusy(false, error.message);
  }
}

async function updatePublicSettings(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const settings = Object.fromEntries(form);
  settings.login_popup_enabled = form.get("login_popup_enabled") === "on";
  setBusy(true, "");
  try {
    applyPublicConfig(await api("updatePublicSettings", { settings }));
    state.loading = false;
    state.message = "로그인 전 화면 설정을 저장했습니다.";
    render();
  } catch (error) {
    setBusy(false, error.message);
  }
}

async function createStudent(event) {
  event.preventDefault();
  const student = Object.fromEntries(new FormData(event.currentTarget));
  setBusy(true, "");
  try {
    await api("createStudent", { student });
    await refreshData(false);
    state.subview = "list";
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
    state.subview = "list";
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

async function updateLesson(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    await api("updateLesson", { lesson: Object.fromEntries(new FormData(event.currentTarget)) });
    await refreshData(false);
    state.selectedEntity = null;
    state.message = "수업 상태와 보강 정보를 저장했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createRegistration(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    await api("createRegistration", { registration: Object.fromEntries(new FormData(event.currentTarget)) });
    await refreshData(false);
    state.message = "등록 결제 이력을 저장했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createReservation(event) {
  event.preventDefault();
  const reservation = Object.fromEntries(new FormData(event.currentTarget));
  reservation.end_time = addMinutesClient(reservation.start_time, 60);
  setBusy(true, "");
  try {
    await api("createReservation", { reservation });
    await refreshFeature("reservations");
    state.reservationDraft = null;
    state.subview = "schedule";
    state.reservationFilter = { date: reservation.reservation_date, room: reservation.room_id };
    state.message = "공간 예약을 등록했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function updateAccountDetails(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    await api("updateAccount", { account: Object.fromEntries(new FormData(event.currentTarget)) });
    await refreshFeature("accounts");
    state.selectedEntity = null;
    state.message = "계정 구분과 프로필 정보를 변경했습니다. 해당 계정은 다시 로그인해야 합니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createTask(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    await api("createTask", { task: Object.fromEntries(new FormData(event.currentTarget)) });
    state.tasks = await api("listTasks", { accountId: state.selectedEntity?.id || state.user.account_id });
    state.loading = false;
    state.message = "업무를 등록했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createClassType(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    await api("createClassType", { classType: Object.fromEntries(new FormData(event.currentTarget)) });
    state.classTypes = await api("listClassTypes");
    state.loading = false;
    state.message = "등록 기준을 추가했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function updateClassType(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    await api("updateClassType", { classType: Object.fromEntries(new FormData(event.currentTarget)) });
    state.classTypes = await api("listClassTypes");
    state.loading = false;
    state.message = "등록 기준을 변경했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

function syncReservationEnd(input) {
  const form = input.form;
  if (form?.end_time) form.end_time.value = addMinutesClient(input.value, 60);
}

async function updateReservationStatus(reservationId, status) {
  setBusy(true, "");
  try {
    await api("updateReservationStatus", { reservationId, status });
    await refreshFeature("reservations");
    state.message = `예약을 ${status} 상태로 변경했습니다.`;
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function clockWork(mode) {
  setBusy(true, "");
  try {
    await api("clockWork", { mode });
    await refreshFeature("team");
    state.message = mode === "in" ? "출근 시간이 기록되었습니다." : "퇴근 시간이 기록되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createMeeting(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const meeting = Object.fromEntries(form);
  meeting.participant_ids = form.getAll("participant_ids");
  setBusy(true, "");
  try {
    await api("createMeeting", { meeting });
    await refreshFeature("meetings", true);
    state.message = "회의 일정을 등록했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function createCalendarEvent(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    await api("createCalendarEvent", { calendarEvent: Object.fromEntries(new FormData(event.currentTarget)) });
    await refreshData(false);
    state.message = "학원 일정을 등록했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function updateRoom(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    await api("updateRoom", { room: Object.fromEntries(new FormData(event.currentTarget)) });
    await refreshFeature("reservations");
    state.message = "공간 이름을 변경했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function updateProfile(event) {
  event.preventDefault();
  setBusy(true, "");
  try {
    const form = new FormData(event.currentTarget);
    const profile = Object.fromEntries(form);
    profile.dashboard_prefs_json = JSON.stringify({ widgets: form.getAll("dashboard_widgets") });
    delete profile.dashboard_widgets;
    const user = await api("updateProfile", { profile });
    state.user = user;
    localStorage.setItem(STORAGE.user, JSON.stringify(user));
    applyUserPreferences(user);
    state.message = "프로필과 환경 설정을 저장했습니다.";
    setBusy(false, state.message);
  } catch (error) { setBusy(false, error.message); }
}

async function updatePermissions(event, accountId) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const permissions = {};
  ["manageStudents", "writeLessonLogs", "manageReservations", "manageMeetings", "manageCalendar", "viewPayments"].forEach((key) => permissions[key] = form.get(key) === "on");
  setBusy(true, "");
  try {
    await api("updateAccountPermissions", { accountId, permissions });
    await refreshFeature("accounts");
    state.message = "개별 권한을 저장했습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

function setTheme(theme, persist = true) {
  state.theme = ["system", "light", "dark"].includes(theme) ? theme : "system";
  if (persist) localStorage.setItem(STORAGE.theme, state.theme);
  applyTheme(state.theme);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "system" ? "" : theme;
  document.documentElement.style.colorScheme = theme === "system" ? "light dark" : theme;
}

function setDensity(density, persist = true) {
  state.density = density === "compact" ? "compact" : "comfortable";
  if (persist) localStorage.setItem(STORAGE.density, state.density);
  applyDensity(state.density);
}

function applyDensity(density) {
  document.documentElement.dataset.density = density === "compact" ? "compact" : "";
}

function applyUserPreferences(user = state.user) {
  if (!user) return;
  setTheme(user.theme || "system", false);
  setDensity(user.ui_density || "comfortable", false);
}

async function toggleAccount(accountId, active) {
  setBusy(true, "");
  try {
    await api("updateAccountStatus", { accountId, active });
    await refreshFeature("accounts");
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
    await refreshFeature("accounts");
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
    state.page = preferredPage(state.user);
    state.message = "비밀번호가 변경되었습니다.";
    await refreshData(false);
  } catch (error) { setBusy(false, error.message); }
}

function beginStudentEdit(studentId) {
  state.editingStudentId = studentId;
  state.subview = "edit";
  render();
}

function cancelStudentEdit() {
  state.editingStudentId = null;
  state.subview = "list";
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
  const detail = form.querySelector("[data-absence-detail]");
  if (detail) detail.hidden = !["결석", "취소"].includes(value);
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
    await refreshFeature("lesson-logs");
    state.message = "수업일지 템플릿이 저장되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

async function deleteLessonTemplate(templateId) {
  setBusy(true, "");
  try {
    await api("deleteLessonTemplate", { templateId });
    await refreshFeature("lesson-logs");
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
    await refreshFeature("lesson-logs", true);
    state.message = "수업일지가 저장되었습니다.";
    render();
  } catch (error) { setBusy(false, error.message); }
}

function setStudentFilter(key, value) {
  state.studentFilters[key] = value;
  render();
}

function applyStudentSearch(event) {
  event.preventDefault();
  state.studentFilters.query = new FormData(event.currentTarget).get("query").trim();
  render();
}

function resetStudentFilters() {
  state.studentFilters = { query: "", status: "", teacher: "", sort: "nameAsc" };
  render();
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
  state.logFilters = { query: "", teacher: "", student: "", subject: "", from: "", to: "", sort: "dateDesc" };
  render();
}

function setMeetingFilter(key, value) {
  state.meetingFilters[key] = value;
  render();
}

function applyMeetingSearch(event) {
  event.preventDefault();
  state.meetingFilters.query = new FormData(event.currentTarget).get("query").trim();
  render();
}

function resetMeetingFilters() {
  state.meetingFilters = { query: "", participant: "", status: "", from: "", to: "", sort: "dateAsc" };
  render();
}

function applyCalendarSearch(event) {
  event.preventDefault();
  state.calendarSearch = new FormData(event.currentTarget).get("query").trim();
  render();
}

function setCalendarSort(value) {
  state.calendarSort = value;
  render();
}

function resetCalendarFilters() {
  state.calendarSearch = "";
  state.calendarSort = "dateAsc";
  state.calendarFilter = "all";
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
    ["calendar", "통합 캘린더", "calendar", ["admin", "staff", "teacher", "student"]],
    ["students", role === "teacher" ? "담당 수강생" : "수강생", "users", ["admin", "staff", "teacher"]],
    ["enrollments", "수강·일정", "calendar", ["admin", "staff"]],
    ["registrations", role === "student" ? "등록·결제 이력" : "등록·재등록", "credit", ["admin", "staff", "student"]],
    ["reservations", "공간 예약", "building", ["admin", "staff", "teacher", "student"]],
    ["lesson-logs", role === "student" ? "내 수업일지" : "수업일지", "book", ["admin", "staff", "teacher", "student"]],
    ["team", "직원·근태", "briefcase", ["admin", "staff", "teacher"]],
    ["meetings", "회의", "meeting", ["admin", "staff", "teacher"]],
    ["accounts", "계정·권한", "userCog", ["admin", "staff"]],
    ["system-settings", "시스템 설정", "settings", ["admin", "staff"]],
    ["usage", "이용 현황", "chart", ["admin"]],
    ["profile", "환경 설정", "settings", ["admin", "staff", "teacher", "student"]]
  ];
  return all.filter(([key, , , roles]) => {
    if (!roles.includes(role)) return false;
    if (key === "accounts" && !state.capabilities.viewAccounts) return false;
    if (key === "system-settings" && !state.capabilities.managePublicSettings) return false;
    if (key === "registrations" && !state.capabilities.viewPayments) return false;
    if (key === "meetings" && !state.capabilities.viewMeetings) return false;
    if (key === "students" && !state.capabilities.viewStudents) return false;
    if (key === "lesson-logs" && !state.capabilities.viewLessonLogs) return false;
    if (key === "reservations" && !state.capabilities.viewReservations) return false;
    if (key === "team" && !state.capabilities.viewTeam) return false;
    if (key === "calendar" && !state.capabilities.viewCalendar) return false;
    return true;
  });
}

function render() {
  if (state.connection === "checking") return renderSplash();
  if (state.connection === "error") return renderConnectionError();
  if (!state.user) return renderAuth();

  const menus = menusFor(state.user.role);
  if (state.user.must_change_password) state.page = "profile";
  if (!menus.some(([key]) => key === state.page)) state.page = preferredPage(state.user);
  if (!state.subview) state.subview = defaultSubview(state.page);
  const primaryMobile = mobilePrimaryMenus(menus, state.user);
  const canGoBack = state.navigationStack.length > 0;

  root.innerHTML = `
    ${TEST_MODE ? renderTestToolbar() : ""}
    <div class="shell">
      <aside class="sidebar">
        ${brandLockup()}
        <nav class="nav">${menus.map(([key, label, iconName]) => navButton(key, label, iconName)).join("")}</nav>
        <div class="sidebar-foot">
          <button class="nav-utility" onclick="logout()">${icon("logout")}<span>로그아웃</span></button>
        </div>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div class="mobile-brand">${BRAND_MARK_HTML}<strong>본성뮤직</strong></div>
          <div class="topbar-title">${escapeHtml(currentPageLabel(menus))}</div>
          <button class="user-button" onclick="navigate('profile')" aria-label="내 계정">
            <span class="avatar">${escapeHtml(state.user.name.slice(0, 1))}</span>
            <span class="identity"><strong>${escapeHtml(state.user.name)}</strong><small>${escapeHtml(accountLabel(state.user))}</small></span>
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
      ${canGoBack ? `<div class="mobile-float-actions"><button onclick="appBack()" aria-label="이전 화면">${icon("arrowLeft")}</button></div>` : ""}
    </div>`;
  labelResponsiveTables();
}

function renderSplash() {
  root.innerHTML = `<main class="splash">${brandLockup({ large: true })}<div class="spinner"></div><p>운영 데이터를 불러오는 중입니다.</p></main>`;
}

function renderConnectionError() {
  root.innerHTML = `
    <main class="auth-page">
      <section class="auth-panel compact">
        ${brandLockup({ large: true, academy: true })}
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
        <div class="brand-hero-card"><img src="./assets/bonsung-design-template.png" alt="Bonsung Music Academy 본성뮤직 브랜드 이미지" /></div>
        <div class="context-copy"><h2>수업과 운영 기록을<br />한 흐름으로 관리합니다.</h2><p>별도의 Google Sheet 연결 과정 없이 로그인하면 역할에 맞는 업무 화면이 바로 열립니다.</p></div>
      </section>
    </main>`;
}

function renderAuth() {
  const config = state.publicConfig || DEFAULT_PUBLIC_CONFIG;
  root.innerHTML = `
    <main class="auth-page">
      <section class="auth-panel">
        ${brandLockup({ large: true, academy: true, system: "BONSUNG MUSIC ACADEMY" })}
        <div class="auth-copy">
          <h1>본성 통합 관리 시스템</h1>
          <p>발급받은 아이디와 비밀번호를 입력하세요.</p>
        </div>
        <form class="form-stack auth-form" onsubmit="login(event)">
          <label class="field"><span>아이디</span><input name="loginId" autocomplete="username" placeholder="아이디 입력" required /></label>
          <label class="field"><span>비밀번호</span><input name="password" type="password" autocomplete="current-password" placeholder="비밀번호 입력" required /></label>
          <button class="btn login-button" ${state.loading ? "disabled" : ""}>${state.loading ? "확인 중..." : "로그인"}</button>
        </form>
        <button class="btn secondary account-request-button" onclick="openAuthDialog('request')">${icon("userCog")}신규 계정 요청</button>
        ${state.demo ? `<div class="demo-hint"><strong>데모 계정</strong><span>admin / staff / teacher / student</span><span>비밀번호 bonsung1</span></div>` : ""}
        <p class="status-line error">${escapeHtml(state.message)}</p>
      </section>
      <section class="auth-context">
        <div class="brand-hero-card"><img src="./assets/bonsung-design-template.png" alt="Bonsung Music Academy 본성뮤직 브랜드 이미지" /></div>
        <div class="context-copy"><h2>${multiline(config.login_context_title)}</h2><p>${multiline(config.login_context_body)}</p></div>
        ${config.login_popup_enabled ? `<button class="login-notice-card" onclick="openAuthDialog('notice')"><span>운영 공지</span><strong>${escapeHtml(config.login_popup_title)}</strong><p>${escapeHtml(config.login_popup_body)}</p><small>자세히 보기 ${icon("chevron")}</small></button>` : ""}
        <div class="context-preview">
          <div><span>오늘 수업</span><strong>6</strong></div>
          <div><span>작성할 일지</span><strong>2</strong></div>
          <div><span>재원 수강생</span><strong>24</strong></div>
        </div>
      </section>
    </main>
    ${renderAuthDialog()}`;
}

function renderAuthDialog() {
  if (!state.authDialog) return "";
  if (state.authDialog === "request-success") {
    return `<div class="modal-backdrop auth-modal-backdrop"><article class="modal auth-modal"><header><div><span>신규 계정 요청</span><h2>요청이 접수되었습니다</h2></div><button class="icon-button" onclick="closeAuthDialog()" aria-label="닫기">${icon("close")}</button></header><div class="auth-modal-body"><p>admin 또는 원장(대표)의 승인 후 요청한 아이디로 로그인할 수 있습니다.</p><button class="btn" onclick="closeAuthDialog()">확인</button></div></article></div>`;
  }
  if (state.authDialog === "notice") {
    const config = state.publicConfig || DEFAULT_PUBLIC_CONFIG;
    return `<div class="modal-backdrop auth-modal-backdrop" onclick="closeAuthDialog()"><article class="modal auth-modal notice-modal" onclick="event.stopPropagation()"><header><div><span>본성뮤직 운영 공지</span><h2>${escapeHtml(config.login_popup_title)}</h2></div><button class="icon-button" onclick="closeAuthDialog()" aria-label="닫기">${icon("close")}</button></header><div class="auth-modal-body"><p>${multiline(config.login_popup_body)}</p><button class="btn" onclick="closeAuthDialog()">확인</button></div></article></div>`;
  }
  return `<div class="modal-backdrop auth-modal-backdrop" onclick="closeAuthDialog()"><article class="modal auth-modal" onclick="event.stopPropagation()"><header><div><span>승인 후 이용 가능</span><h2>신규 계정 요청</h2></div><button class="icon-button" onclick="closeAuthDialog()" aria-label="닫기">${icon("close")}</button></header><form class="auth-modal-body form-grid two" onsubmit="submitAccountRequest(event)">
    <label class="field"><span>이름</span><input name="name" autocomplete="name" required /></label>
    <label class="field"><span>희망 아이디</span><input name="login_id" pattern="[A-Za-z0-9._-]{4,40}" autocomplete="username" required /></label>
    <label class="field"><span>계정 유형</span><select name="requested_role"><option value="staff">직원</option><option value="teacher">강사</option><option value="student">수강생</option></select></label>
    <label class="field"><span>연락처</span><input name="phone" autocomplete="tel" /></label>
    <label class="field wide"><span>이메일</span><input name="email" type="email" autocomplete="email" /></label>
    <label class="field"><span>비밀번호</span><input name="password" type="password" minlength="8" autocomplete="new-password" required /></label>
    <label class="field"><span>비밀번호 확인</span><input name="confirm_password" type="password" minlength="8" autocomplete="new-password" required /></label>
    <label class="field wide"><span>요청 메모</span><textarea name="message" maxlength="500" placeholder="소속이나 계정이 필요한 이유를 적어주세요."></textarea></label>
    ${state.message ? `<p class="status-line error wide">${escapeHtml(state.message)}</p>` : ""}
    <div class="form-actions wide"><button type="button" class="btn secondary" onclick="closeAuthDialog()">취소</button><button class="btn" ${state.loading ? "disabled" : ""}>${state.loading ? "접수 중..." : "요청 제출"}</button></div>
  </form></article></div>`;
}

function navButton(key, label, iconName) {
  return `<button class="${state.page === key ? "active" : ""}" onclick="navigate('${key}')">${icon(iconName)}<span>${label}</span></button>`;
}

function currentPageLabel(menus) {
  return menus.find(([key]) => key === state.page)?.[1] || "홈";
}

function mobilePrimaryMenus(menus, user) {
  const menuMap = keyBy(menus.map(([key, label, iconName]) => ({ key, label, iconName })), "key");
  const preferred = user.role === "teacher"
    ? ["my-overview", "lesson-logs", "students"]
    : user.role === "student"
      ? ["my-overview", "lesson-logs", "reservations"]
      : user.role === "staff"
        ? ["students", "enrollments", "registrations"]
        : ["dashboard", "students", "accounts"];
  const picked = preferred.map((key) => menuMap[key]).filter(Boolean);
  const fallback = menus
    .filter(([key]) => key !== "profile" && !picked.some((item) => item.key === key))
    .slice(0, Math.max(0, 3 - picked.length))
    .map(([key, label, iconName]) => ({ key, label, iconName }));
  return [...picked, ...fallback].slice(0, 3).map((item) => [item.key, item.label, item.iconName]);
}

function renderMobileMenu(menus) {
  const menuMap = keyBy(menus.map(([key, label, iconName]) => ({ key, label, iconName })), "key");
  const sections = mobileMenuSections(state.user).map((section) => ({
    ...section,
    items: section.keys.map((key) => menuMap[key]).filter(Boolean)
  })).filter((section) => section.items.length);
  return `<div class="mobile-menu-backdrop" onclick="toggleMobileMenu()"><section class="mobile-menu-sheet" onclick="event.stopPropagation()"><div class="mobile-menu-grip" aria-hidden="true"></div><div class="mobile-menu-head"><div><strong>더보기</strong><small>${escapeHtml(mobileMenuHelp(state.user))}</small></div><button class="icon-button" onclick="toggleMobileMenu()" aria-label="닫기">${icon("close")}</button></div><nav>${sections.map((section) => `<section class="mobile-menu-section"><h3>${escapeHtml(section.title)}</h3>${section.items.map((item) => `<div class="mobile-menu-group">${navButton(item.key, item.label, item.iconName)}${mobileMenuChildren(item.key)}</div>`).join("")}</section>`).join("")}<section class="mobile-menu-section mobile-menu-section-utility"><h3>계정</h3><button onclick="logout()">${icon("logout")}<span>로그아웃</span></button></section></nav></section></div>`;
}

function mobileMenuHelp(user) {
  if (user.role === "teacher") return "오늘 수업과 담당 수강생 업무를 먼저 모았습니다.";
  if (user.role === "student") return "내 수업, 피드백, 연습실 예약을 빠르게 확인합니다.";
  if (user.role === "staff") return "접수와 운영 업무를 하나씩 선택해 들어갑니다.";
  return "관리자가 자주 보는 운영·권한 업무를 먼저 모았습니다.";
}

function mobileMenuSections(user) {
  if (user.role === "teacher") {
    return [
      { title: "오늘 수업", keys: ["my-overview", "calendar"] },
      { title: "담당 수강생", keys: ["students", "lesson-logs"] },
      { title: "예약·협업", keys: ["reservations", "meetings"] },
      { title: "내 설정", keys: ["team", "profile"] }
    ];
  }
  if (user.role === "student") {
    return [
      { title: "내 수업", keys: ["my-overview", "lesson-logs"] },
      { title: "이용하기", keys: ["reservations", "calendar"] },
      { title: "결제·설정", keys: ["registrations", "profile"] }
    ];
  }
  if (user.role === "staff") {
    return [
      { title: "접수·상담", keys: ["students", "enrollments", "registrations"] },
      { title: "오늘 운영", keys: ["dashboard", "calendar", "reservations"] },
      { title: "팀 업무", keys: ["team", "meetings"] },
      { title: "계정·설정", keys: ["accounts", "system-settings", "profile"] }
    ];
  }
  return [
    { title: "운영 현황", keys: ["dashboard", "usage", "calendar"] },
    { title: "수강·등록", keys: ["students", "enrollments", "registrations", "lesson-logs"] },
    { title: "공간·팀", keys: ["reservations", "team", "meetings"] },
    { title: "권한·설정", keys: ["accounts", "system-settings", "profile"] }
  ];
}

function mobileMenuChildren(page) {
  const childMap = {
    "lesson-logs": [["browse", "일지 조회"]],
    reservations: [["schedule", "예약 현황"], ["list", "예약 목록"], ["create", "새 예약"]],
    enrollments: [["history", "수강 이력"], ["schedule", "수업 일정"]],
    accounts: [["list", "계정 목록"]],
    students: [["list", "수강생 목록"]]
  };
  if (state.capabilities.writeLessonLogs) childMap["lesson-logs"].push(["create", "일지 작성"]);
  if (state.capabilities.manageReservations) childMap.reservations.push(["rooms", "공간 관리"]);
  if (state.capabilities.manageOperations) childMap.enrollments.push(["create", "수강 등록"]);
  if (state.capabilities.manageCalendar) childMap.enrollments.push(["types", "등록 기준"]);
  if (state.capabilities.manageStudents) childMap.students.push(["create", "수강생 등록"]);
  if (state.capabilities.reviewAccountRequests) childMap.accounts.push(["requests", "신규 요청"]);
  if (state.capabilities.manageAccounts) childMap.accounts.push(["create", "계정 생성"]);
  const children = childMap[page] || [];
  return children.map(([subview, label]) => `<button class="mobile-child" onclick="navigateSubview('${page}', '${subview}')">${icon("chevron")}<span>${label}</span></button>`).join("");
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
  if (state.selectedEntity) return renderEntityDetail(state.selectedEntity);
  if (state.page === "my-overview") return renderMyOverview();
  if (state.page === "calendar") return renderCalendar();
  if (state.page === "accounts") return renderAccounts();
  if (state.page === "system-settings") return renderSystemSettings();
  if (state.page === "students") return renderStudents();
  if (state.page === "enrollments") return renderEnrollments();
  if (state.page === "registrations") return renderRegistrations();
  if (state.page === "reservations") return renderReservations();
  if (state.page === "team") return renderTeam();
  if (state.page === "meetings") return renderMeetings();
  if (state.page === "lesson-logs") return renderLessonLogs();
  if (state.page === "usage") return renderUsage();
  if (state.page === "profile") return renderProfile();
  return renderDashboard();
}

function subviewTabs(items) {
  const options = items.map(([key, label]) => `<option value="${key}" ${state.subview === key ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
  return `<div class="mobile-subview-picker"><label><span>작업 선택</span><select onchange="setSubview(this.value)">${options}</select></label></div><nav class="subview-tabs" aria-label="세부 메뉴">${items.map(([key, label, iconName]) => `<button class="${state.subview === key ? "active" : ""}" onclick="setSubview('${key}')">${icon(iconName || "list")}<span>${label}</span></button>`).join("")}</nav>`;
}

function renderTestToolbar() {
  const data = getDemoData();
  return `<aside class="test-toolbar"><strong>로컬 기능 테스트</strong><label>계정 전환 <select onchange="switchTestAccount(this.value)">${data.accounts.filter((item) => item.active).map((item) => `<option value="${item.account_id}" ${item.account_id === state.user.account_id ? "selected" : ""}>${escapeHtml(item.name)} · ${escapeHtml(accountLabel(item))}</option>`).join("")}</select></label><span>원장 1명 · 팀장 2명 · 사원 3명 · 강사 3명 · 수강생 12명</span><button class="btn secondary small" onclick="resetTestData()">${icon("refresh")}초기화</button></aside>`;
}

function pageHeading(title, description, action = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

function statItem(label, value, suffix = "", tone = "") {
  return `<div class="stat ${tone}"><span>${label}</span><strong>${escapeHtml(value)}${suffix ? `<small>${suffix}</small>` : ""}</strong></div>`;
}

function dashboardPrefs(user = state.user) {
  const defaults = user?.role === "teacher" || user?.role === "student" ? DEFAULT_PERSONAL_WIDGETS : DEFAULT_ADMIN_WIDGETS;
  try {
    const parsed = JSON.parse(user?.dashboard_prefs_json || "{}");
    const widgets = Array.isArray(parsed.widgets) && parsed.widgets.length ? parsed.widgets.filter((item) => defaults.includes(item)) : defaults;
    return { widgets };
  } catch (_error) {
    return { widgets: defaults };
  }
}

function dashboardWidgetEnabled(key) {
  return dashboardPrefs().widgets.includes(key);
}

function dashboardWidgetOptions() {
  const defaults = state.user?.role === "teacher" || state.user?.role === "student" ? DEFAULT_PERSONAL_WIDGETS : DEFAULT_ADMIN_WIDGETS;
  const selected = dashboardPrefs().widgets;
  return `<fieldset class="field wide preference-field"><legend>홈 화면 구성</legend><div>${defaults.map((key) => `<label><input type="checkbox" name="dashboard_widgets" value="${key}" ${selected.includes(key) ? "checked" : ""} /><span>${DASHBOARD_WIDGET_LABELS[key]}</span></label>`).join("")}</div></fieldset>`;
}

function renderDashboard() {
  const overview = state.overview || { stats: {}, todayLessons: [], workload: [], recentLogs: [] };
  const stats = overview.stats || {};
  const dueSoon = registrationDueSoon();
  return `
    ${pageHeading("오늘의 운영", `${formatFullDate(new Date())} 기준 학원 운영 현황입니다.`, `<button class="btn secondary small" onclick="refreshData()">${icon("refresh")}새로고침</button>`)}
    ${dashboardWidgetEnabled("stats") ? `<section class="stats">
      ${statItem("재원 수강생", stats.activeStudents || 0, "명")}
      ${statItem("활성 계정", stats.activeAccounts || 0, "명")}
      ${statItem("이번 달 수업일지", stats.thisMonthLogs || 0, "건")}
      ${statItem("재등록 예정", dueSoon.length, "명", dueSoon.length ? "warning" : "")}
    </section>` : ""}
    ${dashboardWidgetEnabled("calendar") ? calendarSummary() : ""}
    <div class="dashboard-grid">
      ${dashboardWidgetEnabled("today") ? `<section class="panel schedule-panel">
        <div class="panel-head"><div><h2>오늘 수업 일정</h2><p>${overview.todayLessons?.length || 0}개의 수업</p></div><button class="text-action" onclick="navigate('enrollments')">전체 일정 ${icon("chevron")}</button></div>
        ${scheduleTimeline(overview.todayLessons || [])}
      </section>` : ""}
      ${dashboardWidgetEnabled("activity") ? `<section class="panel">
        <div class="panel-head"><div><h2>최근 활동</h2><p>운영 데이터 변경 기록</p></div>${state.user.role === "admin" ? `<button class="text-action" onclick="navigate('usage')">이용 현황 ${icon("chevron")}</button>` : ""}</div>
        ${activityList(state.user.role === "admin" ? state.usage?.recent?.slice(0, 6) || overview.recentLogs || [] : overview.recentLogs || [])}
      </section>` : ""}
      ${dashboardWidgetEnabled("workload") ? `<section class="panel wide-panel">
        <div class="panel-head"><div><h2>강사 업무 현황</h2><p>담당 수강생과 최근 기록량</p></div></div>
        ${teacherWorkloadTable(overview.workload || [])}
      </section>` : ""}
      ${dashboardWidgetEnabled("registrations") ? `<section class="panel progress-panel">
        <div class="panel-head"><div><h2>재등록 확인</h2><p>14일 이내 결제 예정</p></div><button class="text-action" onclick="navigate('registrations')">전체 보기 ${icon("chevron")}</button></div>
        ${registrationDueList(dueSoon)}
      </section>` : ""}
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
    ${dashboardWidgetEnabled("stats") ? `<section class="stats">
      ${teacher ? statItem("담당 수강생", stats.activeStudents || 0, "명") : statItem("수강 과목", stats.activeCourses || 0, "개")}
      ${teacher ? statItem("담당 과목", stats.subjects || 0, "개") : statItem("수강 기간", durationText(stats.enrolledDays || 0))}
      ${teacher ? statItem("이번 주 수업", stats.thisWeekLessons || 0, "회") : statItem("예정 수업", stats.upcomingLessons || 0, "회")}
      ${teacher ? statItem("이번 달 일지", stats.thisMonthLogs || 0, "건") : statItem("학습 기록", stats.lessonLogs || 0, "건")}
    </section>` : ""}
    ${dashboardWidgetEnabled("calendar") ? calendarSummary() : ""}
    <div class="overview-grid">
      ${dashboardWidgetEnabled("upcoming") ? `<section class="panel schedule-panel">
        <div class="panel-head"><div><h2>다가오는 수업</h2><p>앞으로 예정된 일정</p></div></div>
        ${scheduleTimeline((overview.upcoming || []).slice(0, 8))}
      </section>` : ""}
      ${dashboardWidgetEnabled("enrollments") ? `<section class="panel">
        <div class="panel-head"><div><h2>${teacher ? "담당 과목" : "현재 수강"}</h2><p>${(overview.enrollments || []).length}개 등록</p></div></div>
        ${enrollmentCards(overview.enrollments || [], teacher)}
      </section>` : ""}
      ${dashboardWidgetEnabled("logs") ? `<section class="panel full-span">
        <div class="panel-head"><div><h2>최근 수업일지</h2><p>최근 학습 흐름</p></div><button class="text-action" onclick="navigate('lesson-logs')">전체 보기 ${icon("chevron")}</button></div>
        ${logsCompactList(overview.recentLogs || [])}
      </section>` : ""}
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
  const roleOptions = state.accountType === "admin"
    ? `<option value="staff">직원</option><option value="teacher">강사</option><option value="student">수강생</option><option value="admin">관리자</option>`
    : `<option value="staff">직원</option><option value="teacher">강사</option><option value="student">수강생</option>`;
  const tabs = [["list", "계정 목록", "list"]];
  if (state.capabilities.reviewAccountRequests) tabs.push(["requests", `신규 요청 ${pendingAccountRequests().length}`, "userCog"]);
  if (state.capabilities.manageAccounts) tabs.push(["create", "계정 생성", "plus"]);
  const heading = `${pageHeading("계정·권한 관리", "계정 구분, 자동 권한과 로그인 이력을 관리합니다.")}${subviewTabs(tabs)}`;
  if (state.subview === "requests" && state.capabilities.reviewAccountRequests) return `${heading}${renderAccountRequests()}`;
  if (state.subview !== "create" || !state.capabilities.manageAccounts) return `${heading}<section class="panel"><div class="panel-head"><div><h2>계정 목록</h2><p>${state.accounts.length}명</p></div></div>${accountsTable()}</section>`;
  return `${heading}<section class="panel form-panel focused-panel">
        <div class="panel-head"><div><h2>새 계정</h2><p>첫 로그인 후 비밀번호 변경 필요</p></div></div>
        <form class="panel-body form-grid" onsubmit="createAccount(event)">
          <label class="field"><span>이름</span><input name="name" required /></label>
          <label class="field"><span>로그인 아이디</span><input name="login_id" autocomplete="off" required /></label>
          <label class="field"><span>초기 비밀번호</span><input name="password" type="password" minlength="8" autocomplete="new-password" required /></label>
          <label class="field"><span>계정 구분</span><select name="role" required>${roleOptions}</select></label>
          <label class="field"><span>직원 직급</span><select name="employee_position"><option value="employee">사원</option><option value="manager">팀장</option><option value="owner">원장(대표)</option><option value="teacher">강사</option></select></label>
          <label class="field"><span>연결 수강생</span><select name="linked_student_id"><option value="">해당 없음</option>${studentOptions}</select></label>
          <label class="field"><span>이메일</span><input name="email" type="email" autocomplete="email" /></label>
          <label class="field"><span>연락처</span><input name="phone" autocomplete="tel" /></label>
          <div class="form-actions"><button class="btn">${icon("plus")}계정 생성</button></div>
        </form>
      </section>`;
}

function pendingAccountRequests() {
  return state.accountRequests.filter((item) => item.status === "대기");
}

function renderAccountRequests() {
  const pending = pendingAccountRequests();
  const processed = state.accountRequests.filter((item) => item.status !== "대기");
  return `<div class="request-management">
    <section class="panel"><div class="panel-head"><div><h2>승인 대기</h2><p>${pending.length}건</p></div></div>${pending.length ? `<div class="account-request-list">${pending.map(accountRequestCard).join("")}</div>` : empty("승인 대기 중인 계정 요청이 없습니다.")}</section>
    <section class="panel"><div class="panel-head"><div><h2>처리 이력</h2><p>최근 ${processed.length}건</p></div></div>${accountRequestHistory(processed)}</section>
  </div>`;
}

function accountRequestCard(item) {
  return `<article class="account-request-card"><header><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(roleLabel(item.requested_role))} 요청</span></div><time>${escapeHtml(formatDateTime(item.created_at))}</time></header>
    <dl><div><dt>희망 아이디</dt><dd>${escapeHtml(item.login_id)}</dd></div><div><dt>연락처</dt><dd>${escapeHtml(item.phone || "-")}</dd></div><div><dt>이메일</dt><dd>${escapeHtml(item.email || "-")}</dd></div><div><dt>요청 메모</dt><dd>${escapeHtml(item.message || "-")}</dd></div></dl>
    <form class="request-review-form" onsubmit="reviewAccountRequest(event,'${item.request_id}')">
      <label class="field"><span>승인 계정 유형</span><select name="role"><option value="staff" ${item.requested_role === "staff" ? "selected" : ""}>직원</option><option value="teacher" ${item.requested_role === "teacher" ? "selected" : ""}>강사</option><option value="student" ${item.requested_role === "student" ? "selected" : ""}>수강생</option></select></label>
      <label class="field"><span>직원 직급</span><select name="employee_position"><option value="employee">사원</option><option value="manager">팀장</option><option value="owner">원장(대표)</option><option value="teacher">강사</option></select></label>
      <label class="field"><span>연결 수강생</span><select name="linked_student_id"><option value="">나중에 연결</option>${state.students.map((student) => `<option value="${student.student_id}">${escapeHtml(student.name)}</option>`).join("")}</select></label>
      <label class="field wide"><span>검토 메모</span><input name="memo" placeholder="승인 또는 반려 사유" /></label>
      <div class="form-actions wide"><button class="btn secondary" name="decision" value="reject">반려</button><button class="btn" name="decision" value="approve">${icon("check")}승인 및 계정 생성</button></div>
    </form>
  </article>`;
}

function accountRequestHistory(items) {
  if (!items.length) return empty("아직 처리된 요청이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>요청자</th><th>아이디</th><th>요청 유형</th><th>상태</th><th>처리일</th><th>메모</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.login_id)}</td><td>${escapeHtml(roleLabel(item.requested_role))}</td><td>${statusBadge(item.status, item.status === "승인" ? "success" : "muted")}</td><td>${escapeHtml(formatDateTime(item.reviewed_at))}</td><td>${escapeHtml(item.review_memo || "-")}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderSystemSettings() {
  const config = state.publicConfig || DEFAULT_PUBLIC_CONFIG;
  return `${pageHeading("로그인 화면 설정", "로그인 전 오른쪽 소개 문구와 운영 공지 팝업을 관리합니다.")}
    <div class="settings-preview-grid">
      <section class="panel form-panel"><div class="panel-head"><div><h2>공개 화면 내용</h2><p>저장 즉시 다음 로그인 화면부터 적용됩니다.</p></div></div><form class="panel-body form-grid" onsubmit="updatePublicSettings(event)">
        <label class="field"><span>오른쪽 제목</span><textarea name="login_context_title" maxlength="120" required>${escapeHtml(config.login_context_title)}</textarea></label>
        <label class="field"><span>오른쪽 설명</span><textarea name="login_context_body" maxlength="500" required>${escapeHtml(config.login_context_body)}</textarea></label>
        <label class="switch-field"><input name="login_popup_enabled" type="checkbox" ${config.login_popup_enabled ? "checked" : ""} /><span>로그인 공지 팝업 사용</span></label>
        <label class="field"><span>팝업 제목</span><input name="login_popup_title" maxlength="80" value="${escapeAttr(config.login_popup_title)}" required /></label>
        <label class="field"><span>팝업 내용</span><textarea name="login_popup_body" maxlength="500" required>${escapeHtml(config.login_popup_body)}</textarea></label>
        <div class="form-actions"><button class="btn">${icon("save")}공개 화면 저장</button></div>
      </form></section>
      <section class="login-settings-preview"><span>미리보기</span><div class="preview-copy"><h2>${multiline(config.login_context_title)}</h2><p>${multiline(config.login_context_body)}</p></div>${config.login_popup_enabled ? `<div class="preview-notice"><small>운영 공지</small><strong>${escapeHtml(config.login_popup_title)}</strong><p>${escapeHtml(config.login_popup_body)}</p></div>` : `<div class="preview-notice disabled"><strong>공지 팝업 사용 안 함</strong></div>`}</section>
    </div>`;
}

function accountsTable() {
  if (!state.accounts.length) return empty("등록된 계정이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>이름</th><th>아이디</th><th>계정 구분</th><th>연결 수강생</th><th>상태</th><th>관리</th></tr></thead><tbody>${state.accounts.map((item) => {
    const canManage = state.capabilities.manageAccounts && item.account_id !== state.user.account_id && (state.accountType === "admin" || item.account_type !== "admin");
    const permissions = effectivePermissions(item);
    return `<tr><td>${entityLink("account", item.account_id, item.name)}</td><td>${escapeHtml(item.login_id)}</td><td>${escapeHtml(accountLabel(item))}</td><td>${escapeHtml(studentName(item.linked_student_id) || "-")}</td><td>${statusBadge(item.active ? "사용" : "중지", item.active ? "success" : "muted")}<br /><small>로그인 ${item.login_count || 0}회 · ${item.last_login_at ? formatRelative(item.last_login_at) : "기록 없음"}</small></td><td>${canManage ? `<div class="row-actions"><button class="btn secondary small" onclick="openEntity('account-admin','${item.account_id}')">계정 편집</button><button class="btn secondary small" onclick="toggleAccount('${item.account_id}', ${!item.active})">${item.active ? "중지" : "재개"}</button><button class="btn ghost small" onclick="resetAccountPassword('${item.account_id}')">비밀번호 초기화</button></div>${state.capabilities.managePermissions && item.account_type === "staff" ? `<details class="permission-editor"><summary>페이지·기능 권한</summary><form onsubmit="updatePermissions(event,'${item.account_id}')">${permissionToggle("manageStudents", "수강생 관리", permissions.manageStudents)}${permissionToggle("writeLessonLogs", "수업일지 작성", permissions.writeLessonLogs)}${permissionToggle("manageReservations", "전체 예약 관리", permissions.manageReservations)}${permissionToggle("manageMeetings", "회의 예약", permissions.manageMeetings)}${permissionToggle("manageCalendar", "캘린더 관리", permissions.manageCalendar)}${permissionToggle("viewPayments", "수납 정보 조회", permissions.viewPayments)}<button class="btn small">저장</button></form></details>` : ""}` : "-"}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function permissionToggle(name, label, checked) {
  return `<label><input type="checkbox" name="${name}" ${checked ? "checked" : ""} /><span>${label}</span></label>`;
}

function effectivePermissions(account) {
  const defaults = demoCapabilities(account);
  return { ...defaults, ...(account.permissions || {}) };
}

function renderStudents() {
  const canEdit = state.capabilities.manageStudents;
  const teachers = state.accounts.filter((item) => item.role === "teacher" && item.active);
  const editingStudent = state.students.find((item) => item.student_id === state.editingStudentId);
  const formStudent = editingStudent || {};
  const filtered = filteredStudents();
  const tabs = [["list", "수강생 목록", "list"]];
  if (canEdit) tabs.push(["create", "수강생 등록", "plus"]);
  if (editingStudent) tabs.push(["edit", "정보 수정", "settings"]);
  const heading = `${pageHeading(canEdit ? "수강생 관리" : "담당 수강생", canEdit ? "목록, 등록과 수정을 작업별로 분리했습니다." : "수업에 필요한 담당 수강생 정보만 표시합니다.")}${subviewTabs(tabs)}`;
  if (state.subview === "create" && canEdit) return `${heading}${studentForm({}, teachers, false)}`;
  if (state.subview === "edit" && canEdit && editingStudent) return `${heading}${studentForm(formStudent, teachers, true)}`;
  return `${heading}<section class="panel"><div class="panel-head"><div><h2>수강생 목록</h2><p>${filtered.length}명 / 전체 ${state.students.length}명</p></div></div>${studentFilters(teachers)}${studentsTable(canEdit, filtered)}</section>`;
}

function studentFilters(teachers) {
  return `<div class="filter-bar">
    <form class="search-box" onsubmit="applyStudentSearch(event)">${icon("search")}<input name="query" value="${escapeAttr(state.studentFilters.query)}" placeholder="이름, 연락처, 목표 검색" /><button type="submit" class="sr-only">검색</button></form>
    <select aria-label="상태 필터" onchange="setStudentFilter('status', this.value)"><option value="">전체 상태</option>${STATUS_OPTIONS.map((item) => `<option ${state.studentFilters.status === item ? "selected" : ""}>${item}</option>`).join("")}</select>
    <select aria-label="담당 강사 필터" onchange="setStudentFilter('teacher', this.value)"><option value="">전체 강사</option>${teachers.map((item) => `<option value="${item.account_id}" ${state.studentFilters.teacher === item.account_id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select>
    <select aria-label="정렬" onchange="setStudentFilter('sort', this.value)"><option value="nameAsc" ${state.studentFilters.sort === "nameAsc" ? "selected" : ""}>이름순</option><option value="enrolledDesc" ${state.studentFilters.sort === "enrolledDesc" ? "selected" : ""}>최근 등록순</option><option value="status" ${state.studentFilters.sort === "status" ? "selected" : ""}>상태순</option><option value="teacher" ${state.studentFilters.sort === "teacher" ? "selected" : ""}>강사순</option></select>
    <button type="button" class="btn ghost small" onclick="resetStudentFilters()">${icon("refresh")}초기화</button>
  </div>`;
}

function filteredStudents() {
  const filters = state.studentFilters;
  return state.students.filter((item) => {
    const text = [item.name, item.phone, item.guardian_name, item.guardian_phone, item.major, item.goal, item.memo, accountName(item.teacher_id)].join(" ").toLowerCase();
    return (!filters.query || text.includes(filters.query.toLowerCase()))
      && (!filters.status || item.status === filters.status)
      && (!filters.teacher || item.teacher_id === filters.teacher);
  }).sort((a, b) => {
    if (filters.sort === "enrolledDesc") return String(b.enrolled_at || "").localeCompare(String(a.enrolled_at || ""));
    if (filters.sort === "status") return `${a.status}${a.name}`.localeCompare(`${b.status}${b.name}`, "ko");
    if (filters.sort === "teacher") return `${accountName(a.teacher_id) || ""}${a.name}`.localeCompare(`${accountName(b.teacher_id) || ""}${b.name}`, "ko");
    return String(a.name || "").localeCompare(String(b.name || ""), "ko");
  });
}

function studentsTable(canEdit, items = state.students) {
  if (!items.length) return empty("조건에 맞는 수강생이 없습니다.", "검색어와 필터를 조정하면 다시 표시됩니다.");
  return `<div class="table-wrap"><table><thead><tr><th>이름</th><th>분야</th><th>상태</th><th>${canEdit ? "보호자" : "목표"}</th><th>연락처</th><th>담당 강사</th>${canEdit ? "<th>관리</th>" : ""}</tr></thead><tbody>${items.map((item) => `<tr><td>${entityLink("student", item.student_id, item.name)}</td><td>${escapeHtml(item.major || "보컬")}</td><td>${statusBadge(item.status, item.status === "재원" ? "success" : "muted")}</td><td>${escapeHtml(canEdit ? item.guardian_name || "-" : item.goal || "-")}</td><td>${escapeHtml(canEdit ? item.guardian_phone || item.phone || "-" : item.phone || "-")}</td><td>${entityLink("account", item.teacher_id, accountName(item.teacher_id) || enrollmentTeacherName(item.student_id) || "-")}</td>${canEdit ? `<td><button class="btn secondary small" onclick="beginStudentEdit('${item.student_id}')">수정</button></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}

function studentForm(student, teachers, editing) {
  return `<section class="panel form-panel"><div class="panel-head"><div><h2>${editing ? "수강생 수정" : "수강생 등록"}</h2><p>${editing ? student.name : "새 수강생 정보"}</p></div>${editing ? `<button class="btn ghost small" onclick="cancelStudentEdit()">취소</button>` : ""}</div><form class="panel-body form-grid two" onsubmit="${editing ? "updateStudent(event)" : "createStudent(event)"}">
    ${editing ? `<input name="student_id" type="hidden" value="${escapeAttr(student.student_id)}" />` : ""}
    <label class="field"><span>이름</span><input name="name" value="${escapeAttr(student.name || "")}" required /></label>
    <label class="field"><span>생년월일</span><input name="birth_date" type="date" value="${escapeAttr(dateInputValue(student.birth_date))}" /></label>
    <label class="field"><span>연락처</span><input name="phone" value="${escapeAttr(student.phone || "")}" autocomplete="tel" /></label>
    <label class="field"><span>분야</span><input name="major" value="보컬" readonly /></label>
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
  const tabs = [["history", "수강 이력", "list"], ["schedule", "수업 일정", "calendar"], ["create", "수강·수업 등록", "plus"]];
  if (state.capabilities.manageCalendar) tabs.push(["types", "등록 기준", "settings"]);
  const heading = `${pageHeading("수강·일정 관리", "수강 이력, 수업 일정과 등록 업무를 각각 확인합니다.")}${subviewTabs(tabs)}`;
  if (state.subview === "history") return `${heading}<section class="panel"><div class="panel-head"><div><h2>수강 이력</h2><p>${state.enrollments.length}건</p></div></div>${enrollmentsTable(state.enrollments)}</section>`;
  if (state.subview === "schedule") return `${heading}<section class="panel"><div class="panel-head"><div><h2>수업 일정</h2><p>${state.lessons.length}건</p></div></div>${lessonsTable(state.lessons.sort(compareLessons))}</section>`;
  if (state.subview === "types" && state.capabilities.manageCalendar) return `${heading}${renderClassTypes()}`;
  return `
    ${heading}
    <div class="management-grid schedule-management enrollment-create-view">
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
            <label class="field"><span>등록 기준</span><input name="subject" list="enrollment-class-types" required /><datalist id="enrollment-class-types">${state.classTypes.map((item) => `<option value="${escapeAttr(item.name)}">${escapeHtml(item.category)}</option>`).join("")}</datalist></label>
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
            <label class="field"><span>등록 기준</span><input name="subject" list="lesson-class-types" required /><datalist id="lesson-class-types">${state.classTypes.map((item) => `<option value="${escapeAttr(item.name)}">${escapeHtml(item.category)}</option>`).join("")}</datalist></label>
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

function renderClassTypes() {
  return `<div class="management-grid"><section class="panel"><div class="panel-head"><div><h2>등록 기준</h2><p>${state.classTypes.length}개 · 이름은 언제든 변경할 수 있습니다.</p></div></div><div class="class-type-list">${state.classTypes.map((item) => `<form onsubmit="updateClassType(event)"><input type="hidden" name="class_type_id" value="${item.class_type_id}" /><input name="name" value="${escapeAttr(item.name)}" required /><select name="category">${CLASS_TYPE_CATEGORIES.map((category) => `<option ${item.category === category ? "selected" : ""}>${category}</option>`).join("")}</select><input type="number" name="sort_order" value="${item.sort_order || 0}" min="0" /><input type="hidden" name="active" value="true" /><button class="icon-button" aria-label="저장">${icon("save")}</button></form>`).join("")}</div></section><section class="panel form-panel"><div class="panel-head"><div><h2>등록 기준 추가</h2><p>보컬 수강 목적에 맞게 자유롭게 추가합니다.</p></div></div><form class="panel-body form-grid" onsubmit="createClassType(event)"><label class="field"><span>이름</span><input name="name" required /></label><label class="field"><span>분야</span><select name="category">${CLASS_TYPE_CATEGORIES.map((item) => `<option>${item}</option>`).join("")}</select></label><div class="form-actions"><button class="btn">${icon("plus")}추가</button></div></form></section></div>`;
}

function renderRegistrations() {
  const canManage = state.capabilities.manageOperations;
  const dueSoon = registrationDueSoon();
  const myNext = state.registrations.filter((item) => item.next_due_date).sort((a, b) => String(a.next_due_date).localeCompare(String(b.next_due_date)))[0];
  if (state.user.role === "student") {
    return `${pageHeading("등록·결제 이력", "등록 기간과 다음 재등록 예정일을 확인합니다.")}
      <section class="stats">
        ${statItem("다음 결제 예정일", myNext ? formatDate(myNext.next_due_date) : "-", "")}
        ${statItem("등록 이력", state.registrations.length, "건")}
        ${statItem("현재 수강", state.enrollments.filter((item) => item.status === "active").length, "개")}
        ${statItem("최근 납부 상태", myNext?.payment_status || "-", "")}
      </section>
      <section class="panel"><div class="panel-head"><div><h2>나의 등록 이력</h2><p>금액과 납부 확인 기록</p></div></div>${registrationsTable(state.registrations)}</section>`;
  }
  return `${pageHeading("등록·재등록 관리", "등록 이력과 결제 확인, 다음 재등록 예정일을 관리합니다.")}
    <section class="stats">
      ${statItem("14일 내 재등록", dueSoon.length, "명", dueSoon.length ? "warning" : "")}
      ${statItem("전체 등록 이력", state.registrations.length, "건")}
      ${statItem("미납·확인 필요", state.registrations.filter((item) => ["미납", "청구예정", "청구완료"].includes(item.payment_status)).length, "건", "warning")}
      ${statItem("이번 달 납부", state.registrations.filter((item) => String(item.paid_at).slice(0, 7) === today().slice(0, 7)).length, "건")}
    </section>
    <div class="management-grid">
      <div class="stack">
        <section class="panel"><div class="panel-head"><div><h2>재등록 예정</h2><p>14일 이내 도래</p></div></div>${registrationDueList(dueSoon)}</section>
        <section class="panel"><div class="panel-head"><div><h2>등록·결제 이력</h2><p>${state.registrations.length}건</p></div></div>${registrationsTable(state.registrations)}</section>
      </div>
      ${canManage ? `<section class="panel form-panel"><div class="panel-head"><div><h2>등록 이력 추가</h2><p>신규 등록 또는 재등록</p></div></div>
        <form class="panel-body form-grid two" onsubmit="createRegistration(event)">
          <label class="field wide"><span>수강생</span><select name="student_id" required><option value="">선택</option>${state.students.map((item) => `<option value="${item.student_id}">${escapeHtml(item.name)} · ${escapeHtml(item.major)}</option>`).join("")}</select></label>
          <label class="field"><span>구분</span><select name="registration_type"><option>재등록</option><option>신규등록</option></select></label>
          <label class="field"><span>상태</span><select name="payment_status">${["청구예정", "청구완료", "납부완료", "미납", "환불", "취소"].map((item) => `<option>${item}</option>`).join("")}</select></label>
          <label class="field"><span>등록 시작일</span><input name="period_start" type="date" value="${today()}" required /></label>
          <label class="field"><span>등록 종료일</span><input name="period_end" type="date" /></label>
          <label class="field"><span>결제 확인일</span><input name="paid_at" type="date" /></label>
          <label class="field"><span>다음 결제 예정일</span><input name="next_due_date" type="date" value="${addDays(today(), 30)}" required /></label>
          <label class="field"><span>금액</span><input name="amount" type="number" min="0" step="1000" /></label>
          <label class="field"><span>결제 수단</span><select name="payment_method"><option value="">미정</option><option>카드</option><option>계좌이체</option><option>현금</option></select></label>
          <label class="field wide"><span>메모</span><textarea name="memo"></textarea></label>
          <div class="form-actions wide"><button class="btn">${icon("save")}등록 이력 저장</button></div>
        </form></section>` : ""}
    </div>`;
}

function renderReservations() {
  const selectableRooms = state.rooms.filter((room) => {
    if (room.room_type === "lesson") return state.capabilities.reserveLessonRoom;
    return state.capabilities.reservePracticeRoom;
  });
  const upcoming = state.reservations.filter((item) => item.reservation_date >= today() && item.status === "예약");
  const purposes = state.accountType === "student" ? ["연습"] : state.employeePosition === "teacher" ? ["레슨", "이론수업", "연습"] : RESERVATION_PURPOSES;
  const tabs = [["schedule", "예약 현황", "calendar"], ["list", "예약 목록", "list"], ["create", "새 예약", "plus"]];
  if (state.capabilities.manageReservations) tabs.push(["rooms", "공간 관리", "settings"]);
  const heading = `${pageHeading("레슨실·연습실 예약", "접근 가능한 공간의 1시간 예약 현황을 확인하고 예약합니다.")}${subviewTabs(tabs)}`;
  if (state.subview === "create") {
    const draft = state.reservationDraft || {};
    const draftRoomId = draft.room_id || "";
    const draftDate = draft.reservation_date || state.reservationFilter.date || today();
    const draftStart = draft.start_time || "09:00";
    const draftEnd = addMinutesClient(draftStart, 60);
    const draftRoom = selectableRooms.find((item) => item.room_id === draftRoomId);
    const selectionSummary = draftRoom ? `<div class="reservation-selection-summary" aria-live="polite">
      <span>선택한 예약</span>
      <strong>${escapeHtml(draftRoom.name)}</strong>
      <p>${escapeHtml(formatDate(draftDate))} · ${escapeHtml(draftStart)}-${escapeHtml(draftEnd)}</p>
      <button class="text-action" type="button" onclick="returnReservationSchedule()">시간 다시 선택 ${icon("chevron")}</button>
    </div>` : "";
    return `${heading}<section class="panel form-panel focused-panel"><div class="panel-head"><div><h2>새 공간 예약</h2><p>정각부터 1시간 단위</p></div></div>
      ${selectionSummary}
      <form class="panel-body form-grid two" onsubmit="createReservation(event)">
        <label class="field wide"><span>공간</span><select name="room_id" required><option value="">선택</option>${selectableRooms.map((item) => `<option value="${item.room_id}" ${draftRoomId === item.room_id ? "selected" : ""}>${escapeHtml(item.name)} · ${item.room_type === "lesson" ? "레슨실" : "연습실"}</option>`).join("")}</select></label>
        <label class="field"><span>예약일</span><input name="reservation_date" type="date" value="${escapeAttr(draftDate)}" required /></label>
        <label class="field"><span>목적</span><select name="purpose" required>${purposes.map((item) => `<option>${item}</option>`).join("")}</select></label>
        <label class="field"><span>시작</span><select name="start_time" onchange="syncReservationEnd(this)" required>${hourOptions(draftStart)}</select></label>
        <label class="field"><span>종료</span><input name="end_time" value="${escapeAttr(draftEnd)}" readonly /></label>
        <label class="field wide"><span>메모</span><textarea name="memo" placeholder="예약 대상이나 준비 사항"></textarea></label>
        <div class="form-actions wide"><button class="btn">${icon("plus")}1시간 예약하기</button></div>
      </form>
    </section>`;
  }
  if (state.subview === "rooms" && state.capabilities.manageReservations) {
    return `${heading}${roomZoneMap(upcoming)}<section class="panel"><div class="panel-head"><div><h2>공간 이름 관리</h2><p>공간 카드를 누르면 예정 사용 일정을 확인합니다.</p></div></div><div class="room-settings">${state.rooms.map((room) => `<form onsubmit="updateRoom(event)"><input type="hidden" name="room_id" value="${room.room_id}" /><button type="button" class="room-link" onclick="openEntity('room','${room.room_id}')">${room.room_type === "lesson" ? "레슨" : "연습"}</button><input name="name" value="${escapeAttr(room.name)}" required /><button class="icon-button" aria-label="공간 이름 저장">${icon("save")}</button></form>`).join("")}</div></section>`;
  }
  if (state.subview === "list") {
    return `${heading}<section class="panel reservation-list-panel"><div class="panel-head"><div><h2>예약 목록</h2><p>${state.reservations.length}건 · 공간명과 예약자명을 눌러 상세 보기</p></div><button class="btn secondary small" type="button" onclick="setSubview('schedule')">${icon("calendar")}시간표 보기</button></div>${reservationsTable(state.reservations)}</section>`;
  }
  return `${heading}${roomZoneMap(upcoming, "reserve")}
    <section class="panel reservation-board"><div class="panel-head"><div><h2>시간별 예약 현황</h2><p>${upcoming.length}건 예정</p></div><div class="inline-filters"><input type="date" value="${escapeAttr(state.reservationFilter.date)}" onchange="setReservationFilter('date',this.value)" /><select onchange="setReservationFilter('room',this.value)"><option value="all">전체 공간</option>${selectableRooms.map((item) => `<option value="${item.room_id}" ${state.reservationFilter.room === item.room_id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></div></div>${reservationSchedule()}</section>
    <button class="mobile-list-shortcut" type="button" onclick="setSubview('list')">${icon("list")}예약 목록 ${state.reservations.length}건 보기</button>`;
}

function hourOptions(selected = "09:00") {
  return Array.from({ length: 14 }, (_, index) => {
    const time = `${String(index + 9).padStart(2, "0")}:00`;
    return `<option value="${time}" ${selected === time ? "selected" : ""}>${time} - ${addMinutesClient(time, 60)}</option>`;
  }).join("");
}

function setReservationFilter(key, value) {
  state.reservationFilter[key] = value;
  render();
}

function returnReservationSchedule() {
  state.subview = "schedule";
  render();
}

function roomZoneMap(upcoming, mode = "detail") {
  const visibleRooms = state.rooms.filter((room) => room.room_type === "lesson" ? state.capabilities.reserveLessonRoom : state.capabilities.reservePracticeRoom);
  const roomById = keyBy(visibleRooms, "room_id");
  return `<section class="room-map floor-plan" aria-label="본성뮤직 아카데미 내부 공간 구조도">
    <header class="floor-plan-head">
      <div>
        <span>공간 예약 안내도</span>
        <h2>어느 위치의 공간을 예약하는지 한눈에 확인하세요</h2>
      </div>
      <a class="floor-plan-reference" href="./assets/bonsung-floor-plan-reference.png" target="_blank" rel="noreferrer">원본 구조도 보기</a>
    </header>
    <div class="floor-grid">
      ${floorTile(roomById, upcoming, "room-lesson-large-1", "lesson-large", "lesson", mode)}
      ${floorTile(roomById, upcoming, "room-lesson-medium-1", "lesson-medium", "lesson", mode)}
      ${floorTile(roomById, upcoming, "room-lesson-small-1", "lesson-small-1", "lesson", mode)}
      ${floorTile(roomById, upcoming, "room-lesson-small-2", "lesson-small-2", "lesson", mode)}
      ${floorStaticTile("창고 / 팬트리", "storage", "storage")}
      ${floorStaticTile("이론 강의실", "theory", "theory")}
      ${floorStaticTile("복도 공간", "corridor", "corridor")}
      ${floorStaticTile("원장(대표)실", "office-owner", "office")}
      ${floorTile(roomById, upcoming, "room-practice-a", "practice-a", "practice", mode)}
      ${floorTile(roomById, upcoming, "room-practice-b", "practice-b", "practice", mode)}
      ${floorTile(roomById, upcoming, "room-practice-c", "practice-c", "practice", mode)}
      ${floorStaticTile("로비 및 카페테리아", "lobby", "lobby")}
      ${floorStaticTile("교무실", "office-staff", "staff")}
      <div class="floor-entrance">출입구</div>
    </div>
    <div class="floor-legend">
      <span><i class="legend-dot lesson"></i>레슨실</span>
      <span><i class="legend-dot practice"></i>연습실</span>
      <span><i class="legend-dot support"></i>공용/지원 공간</span>
      <span><i class="legend-dot active"></i>예약 예정 있음</span>
    </div>
  </section>`;
}

function floorTile(roomById, upcoming, roomId, area, type, mode = "detail") {
  const room = roomById[roomId];
  if (!room) return floorStaticTile(roomNameFallback(roomId), area, `${type} disabled`);
  const count = upcoming.filter((item) => item.room_id === room.room_id).length;
  const selected = mode === "reserve" && state.reservationFilter.room === room.room_id;
  const action = mode === "reserve" ? `setReservationFilter('room','${room.room_id}')` : `openEntity('room','${room.room_id}')`;
  return `<button class="floor-room ${type} area-${area} ${count ? "has-booking" : ""} ${selected ? "selected" : ""}" onclick="${action}">
    <span>${escapeHtml(room.name)}</span>
    <small>${count ? `${count}건 예정` : "예약 가능"}</small>
  </button>`;
}

function floorStaticTile(label, area, type) {
  return `<div class="floor-room ${type} area-${area}"><span>${escapeHtml(label)}</span><small>위치 안내</small></div>`;
}

function roomNameFallback(roomId) {
  return ({
    "room-lesson-large-1": "대형 레슨실 1",
    "room-lesson-medium-1": "중형 레슨실 1",
    "room-lesson-small-1": "소형 레슨실 1",
    "room-lesson-small-2": "소형 레슨실 2",
    "room-practice-a": "연습실 A",
    "room-practice-b": "연습실 B",
    "room-practice-c": "연습실 C"
  })[roomId] || "예약 공간";
}

function reservationSchedule() {
  const date = state.reservationFilter.date;
  const rooms = state.rooms.filter((item) => (item.room_type === "lesson" ? state.capabilities.reserveLessonRoom : state.capabilities.reservePracticeRoom) && (state.reservationFilter.room === "all" || item.room_id === state.reservationFilter.room));
  const hours = Array.from({ length: 14 }, (_, index) => `${String(index + 9).padStart(2, "0")}:00`);
  return `<div class="reservation-schedule">${rooms.map((room) => `<section><button class="schedule-room" onclick="openEntity('room','${room.room_id}')">${escapeHtml(room.name)}</button><div class="schedule-slots">${hours.map((hour) => {
    const reservation = state.reservations.find((item) => item.room_id === room.room_id && item.reservation_date === date && item.start_time === hour && item.status === "예약");
    const slotLabel = `${room.name} ${formatDate(date)} ${hour}부터 1시간 예약하기`;
    return reservation ? `<button class="slot occupied purpose-${reservationPurposeKey(reservation.purpose)}" onclick="openEntity('reservation','${reservation.reservation_id}')"><time>${hour}</time><span>${escapeHtml(reservation.purpose)}</span><small>${escapeHtml(reservation.reserved_by_name)}</small></button>` : `<button class="slot open" aria-label="${escapeAttr(slotLabel)}" onclick="prefillReservation('${room.room_id}','${date}','${hour}')"><time>${hour}</time><span>예약 가능</span></button>`;
  }).join("")}</div></section>`).join("")}</div>`;
}

function reservationPurposeKey(purpose) {
  return ({ 레슨: "lesson", 이론수업: "theory", 회의: "meeting", 연습: "practice" })[purpose] || "other";
}

function prefillReservation(roomId, date, time) {
  state.reservationDraft = { room_id: roomId, reservation_date: date, start_time: time };
  state.subview = "create";
  render();
}

function renderTeam() {
  const open = state.workLogs.find((item) => item.account_id === state.user.account_id && item.work_date === today() && !item.clock_out_at);
  const staffAccounts = state.accounts.filter((item) => item.account_type === "staff" || ["staff", "teacher"].includes(item.role));
  return `${pageHeading("직원·강사 및 근태", "직원 구분과 출퇴근 기록을 확인합니다.")}
    ${state.capabilities.clockWork ? `<section class="clock-panel"><div><span>${open ? "근무 중" : "근무 시작 전"}</span><strong>${open ? `${formatTime(open.clock_in_at)} 출근` : formatFullDate(new Date())}</strong><small>${open ? "업무 종료 시 퇴근 버튼을 눌러 주세요." : "출근 버튼을 누르면 현재 시간이 기록됩니다."}</small></div><button class="btn ${open ? "secondary" : ""}" onclick="clockWork('${open ? "out" : "in"}')">${icon("clock")}${open ? "퇴근하기" : "출근하기"}</button></section>` : ""}
    <div class="overview-grid">
      <section class="panel"><div class="panel-head"><div><h2>근태 기록</h2><p>${state.capabilities.manageOperations ? "전체 직원" : "나의 기록"}</p></div></div>${workLogsTable(state.workLogs)}</section>
      <section class="panel"><div class="panel-head"><div><h2>직원 구성</h2><p>${staffAccounts.length ? `${staffAccounts.length}명` : "조회 권한 없음"}</p></div></div>${staffAccounts.length ? `<div class="staff-list">${staffAccounts.map((item) => `<div><span class="avatar">${escapeHtml(item.name.slice(0, 1))}</span><div>${entityLink("account", item.account_id, item.name)}<p>${escapeHtml(accountLabel(item))}</p></div>${statusBadge(item.active ? "재직" : "중지", item.active ? "success" : "muted")}</div>`).join("")}</div>` : empty("직원 목록 조회 권한이 없습니다.")}</section>
    </div>`;
}

function renderMeetings() {
  const upcoming = filteredMeetings();
  return `${pageHeading("회의 예약·관리", "나에게 예정된 회의와 참석자를 확인합니다.")}
    <div class="${state.capabilities.manageMeetings ? "management-grid" : ""}">
      <section class="panel"><div class="panel-head"><div><h2>회의 목록</h2><p>${upcoming.length}건 / 전체 ${state.meetings.length}건</p></div></div>${meetingFilters()}${meetingsList(upcoming)}</section>
      ${state.capabilities.manageMeetings ? `<section class="panel form-panel"><div class="panel-head"><div><h2>회의 예약</h2><p>참석자를 선택해 일정을 공유합니다.</p></div></div>
        <form class="panel-body form-grid two" onsubmit="createMeeting(event)">
          <label class="field wide"><span>회의명</span><input name="title" required /></label>
          <label class="field"><span>날짜</span><input name="meeting_date" type="date" value="${today()}" required /></label>
          <label class="field"><span>장소</span><input name="location" /></label>
          <label class="field"><span>시작</span><input name="start_time" type="time" required /></label>
          <label class="field"><span>종료</span><input name="end_time" type="time" required /></label>
          <fieldset class="field wide participant-field"><legend>참석자</legend><div>${state.accounts.filter((item) => item.account_type === "staff" && item.active).map((item) => `<label><input type="checkbox" name="participant_ids" value="${item.account_id}" /><span>${escapeHtml(item.name)} · ${escapeHtml(accountLabel(item))}</span></label>`).join("")}</div></fieldset>
          <label class="field wide"><span>안건</span><textarea name="agenda"></textarea></label>
          <div class="form-actions wide"><button class="btn">${icon("plus")}회의 예약</button></div>
        </form></section>` : ""}
    </div>`;
}

function meetingFilters() {
  const participants = uniqueBy(state.accounts.filter((item) => item.account_type === "staff" && item.active).map((item) => ({ id: item.account_id, name: item.name })), "id");
  const statuses = unique(state.meetings.map((item) => item.status || "예정")).sort();
  return `<div class="filter-bar">
    <form class="search-box" onsubmit="applyMeetingSearch(event)">${icon("search")}<input name="query" value="${escapeAttr(state.meetingFilters.query)}" placeholder="회의명, 안건, 장소 검색" /><button type="submit" class="sr-only">검색</button></form>
    <select aria-label="참석자 필터" onchange="setMeetingFilter('participant', this.value)"><option value="">전체 참석자</option>${participants.map((item) => `<option value="${item.id}" ${state.meetingFilters.participant === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select>
    <select aria-label="상태 필터" onchange="setMeetingFilter('status', this.value)"><option value="">전체 상태</option>${statuses.map((item) => `<option ${state.meetingFilters.status === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select>
    <input aria-label="시작일" type="date" value="${escapeAttr(state.meetingFilters.from)}" onchange="setMeetingFilter('from', this.value)" />
    <input aria-label="종료일" type="date" value="${escapeAttr(state.meetingFilters.to)}" onchange="setMeetingFilter('to', this.value)" />
    <select aria-label="정렬" onchange="setMeetingFilter('sort', this.value)"><option value="dateAsc" ${state.meetingFilters.sort === "dateAsc" ? "selected" : ""}>빠른 일정순</option><option value="dateDesc" ${state.meetingFilters.sort === "dateDesc" ? "selected" : ""}>최근 일정순</option><option value="title" ${state.meetingFilters.sort === "title" ? "selected" : ""}>회의명순</option></select>
    <button type="button" class="btn ghost small" onclick="resetMeetingFilters()">${icon("refresh")}초기화</button>
  </div>`;
}

function filteredMeetings() {
  const filters = state.meetingFilters;
  return state.meetings.filter((item) => {
    const participantIds = String(item.participant_ids || "").split(",");
    const text = [item.title, item.agenda, item.location, item.status, ...(item.participant_names || [])].join(" ").toLowerCase();
    return (!filters.query || text.includes(filters.query.toLowerCase()))
      && (!filters.participant || participantIds.includes(filters.participant))
      && (!filters.status || (item.status || "예정") === filters.status)
      && (!filters.from || item.meeting_date >= filters.from)
      && (!filters.to || item.meeting_date <= filters.to);
  }).sort((a, b) => {
    if (filters.sort === "dateDesc") return `${b.meeting_date}${b.start_time || ""}`.localeCompare(`${a.meeting_date}${a.start_time || ""}`);
    if (filters.sort === "title") return String(a.title || "").localeCompare(String(b.title || ""), "ko");
    return `${a.meeting_date}${a.start_time || ""}`.localeCompare(`${b.meeting_date}${b.start_time || ""}`);
  });
}

function renderCalendar() {
  const month = state.calendarMonth;
  const list = filteredCalendarEvents();
  return `${pageHeading("통합 캘린더", "수업, 회의, 학원 행사와 휴무를 한곳에서 확인합니다.", `<div class="month-controls"><button class="icon-button" onclick="moveCalendarMonth(-1)" aria-label="이전 달">${icon("chevron", "flip")}</button><strong>${month.replace("-", ".")}</strong><button class="icon-button" onclick="moveCalendarMonth(1)" aria-label="다음 달">${icon("chevron")}</button></div>`)}
    <div class="calendar-filters">${[["all","전체"],["lesson","레슨"],["theory","이론수업"],["meeting","회의"],["academy","학원 일정"]].map(([value,label]) => `<button class="${state.calendarFilter === value ? "active" : ""}" onclick="setCalendarFilter('${value}')">${label}</button>`).join("")}</div>
    <div class="${state.capabilities.manageCalendar ? "calendar-layout" : ""}">
      <section class="panel calendar-panel">${calendarSearchBar()}${calendarGrid(month)}<div class="calendar-result-list"><div class="panel-head compact-head"><div><h2>검색된 일정</h2><p>${list.length}건</p></div></div>${calendarEventList(list)}</div></section>
      ${state.capabilities.manageCalendar ? `<section class="panel form-panel"><div class="panel-head"><div><h2>학원 일정 추가</h2><p>휴무일·행사·전체 공지 일정</p></div></div>
        <form class="panel-body form-grid two" onsubmit="createCalendarEvent(event)">
          <label class="field wide"><span>일정명</span><input name="title" required /></label>
          <label class="field"><span>날짜</span><input name="event_date" type="date" value="${today()}" required /></label>
          <label class="field"><span>유형</span><select name="event_type"><option>행사</option><option>휴무</option><option>공지</option></select></label>
          <label class="field"><span>시작</span><input name="start_time" type="time" /></label>
          <label class="field"><span>종료</span><input name="end_time" type="time" /></label>
          <input type="hidden" name="audience" value="전체" />
          <label class="field wide"><span>설명</span><textarea name="description"></textarea></label>
          <div class="form-actions wide"><button class="btn">${icon("plus")}일정 추가</button></div>
        </form></section>` : ""}
    </div>`;
}

function calendarSearchBar() {
  return `<div class="filter-bar">
    <form class="search-box" onsubmit="applyCalendarSearch(event)">${icon("search")}<input name="query" value="${escapeAttr(state.calendarSearch)}" placeholder="일정명, 수강생, 강사, 장소 검색" /><button type="submit" class="sr-only">검색</button></form>
    <select aria-label="일정 정렬" onchange="setCalendarSort(this.value)"><option value="dateAsc" ${state.calendarSort === "dateAsc" ? "selected" : ""}>빠른 날짜순</option><option value="dateDesc" ${state.calendarSort === "dateDesc" ? "selected" : ""}>최근 날짜순</option><option value="title" ${state.calendarSort === "title" ? "selected" : ""}>이름순</option></select>
    <button type="button" class="btn ghost small" onclick="resetCalendarFilters()">${icon("refresh")}초기화</button>
  </div>`;
}

function filteredCalendarEvents() {
  return state.calendar.filter((item) => {
    const text = [item.title, item.detail, item.type, item.date, item.start_time].join(" ").toLowerCase();
    return calendarFilterMatch(item) && (!state.calendarSearch || text.includes(state.calendarSearch.toLowerCase()));
  }).sort((a, b) => {
    if (state.calendarSort === "dateDesc") return `${b.date}${b.start_time || ""}`.localeCompare(`${a.date}${a.start_time || ""}`);
    if (state.calendarSort === "title") return String(a.title || "").localeCompare(String(b.title || ""), "ko");
    return `${a.date}${a.start_time || ""}`.localeCompare(`${b.date}${b.start_time || ""}`);
  });
}

function calendarEventList(items) {
  if (!items.length) return empty("조건에 맞는 일정이 없습니다.", "검색어 또는 유형 필터를 조정해 주세요.");
  return `<div class="calendar-list">${items.slice(0, 80).map((item) => `<button onclick="${["lesson","meeting"].includes(String(item.calendar_id).split(":")[0]) ? `openCalendarEvent('${escapeAttr(item.calendar_id)}')` : "navigate('calendar')"}"><time>${formatDate(item.date)} ${escapeHtml(item.start_time || "종일")}</time><span class="event-dot ${calendarTone(item.type)}"></span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail || item.type || "-")}</small></div>${icon("chevron")}</button>`).join("")}</div>`;
}

function setCalendarFilter(value) {
  state.calendarFilter = value;
  render();
}

function renderLessonLogs() {
  const canWrite = state.capabilities.writeLessonLogs;
  const filtered = filteredLessonLogs();
  const tabs = [["browse", "일지 조회", "list"]];
  if (canWrite) tabs.push(["create", "일지 작성", "plus"]);
  const heading = `${pageHeading(state.user.role === "student" ? "내 수업일지" : "수업일지", canWrite ? "조회와 작성을 분리해 한 작업에 집중합니다." : "강사가 작성한 학습 내용과 과제를 확인합니다.")}${subviewTabs(tabs)}`;
  if (state.subview === "create" && canWrite) return `${heading}<div class="single-composer">${renderLessonLogComposer()}</div>`;
  return `${heading}<section class="panel journal-list-panel"><div class="panel-head"><div><h2>수업 기록</h2><p>${filtered.length}건</p></div></div>${lessonLogFilters()}${logsTable(filtered)}</section>`;
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
    <select aria-label="정렬" onchange="setLogFilter('sort', this.value)"><option value="dateDesc" ${state.logFilters.sort === "dateDesc" ? "selected" : ""}>최근 수업순</option><option value="dateAsc" ${state.logFilters.sort === "dateAsc" ? "selected" : ""}>오래된 수업순</option><option value="student" ${state.logFilters.sort === "student" ? "selected" : ""}>수강생순</option><option value="teacher" ${state.logFilters.sort === "teacher" ? "selected" : ""}>강사순</option><option value="subject" ${state.logFilters.sort === "subject" ? "selected" : ""}>과목순</option></select>
    <button type="button" class="btn ghost small" onclick="resetLogFilters()">${icon("refresh")}초기화</button>
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
  }).sort((a, b) => {
    if (filters.sort === "dateAsc") return String(a.lesson_date).localeCompare(String(b.lesson_date));
    if (filters.sort === "student") return String(a.student_name || studentName(a.student_id) || "").localeCompare(String(b.student_name || studentName(b.student_id) || ""), "ko");
    if (filters.sort === "teacher") return String(a.teacher_name || accountName(a.teacher_id) || "").localeCompare(String(b.teacher_name || accountName(b.teacher_id) || ""), "ko");
    if (filters.sort === "subject") return String(a.subject || "").localeCompare(String(b.subject || ""), "ko");
    return String(b.lesson_date).localeCompare(String(a.lesson_date));
  });
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
      <div class="absence-detail" data-absence-detail ${["결석", "취소"].includes(attendance) ? "" : "hidden"}>
        <label class="field"><span>결석·취소 사유</span><input name="absence_reason" value="${escapeAttr(draft.absence_reason || "")}" placeholder="사유를 기록하세요" /></label>
        <label class="field"><span>보강 예정일</span><input name="makeup_date" type="date" value="${escapeAttr(draft.makeup_date || "")}" /></label>
      </div>
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
  return `<div class="table-wrap"><table class="journal-table"><thead><tr><th>날짜·회차</th><th>수강생</th><th>강사</th><th>과목</th><th>출결</th><th>수업 내용 요약</th><th>보기</th></tr></thead><tbody>${logs.map((item) => `<tr><td>${escapeHtml(formatDate(item.lesson_date))}<br /><small>${item.lesson_number ? `${item.lesson_number}회차` : "-"}</small></td><td>${entityLink("student", item.student_id, item.student_name || studentName(item.student_id) || "-")}</td><td>${entityLink("account", item.teacher_id, item.teacher_name || accountName(item.teacher_id) || "-")}</td><td>${escapeHtml(item.subject || "-")}</td><td>${statusBadge(item.attendance_status, item.attendance_status === "출석" ? "success" : item.attendance_status === "지각" ? "warning" : "danger")}</td><td class="wrap summary-cell">${escapeHtml(item.lesson_content || "-")}</td><td><button class="icon-button" onclick="viewLog('${item.log_id}')" aria-label="수업일지 보기">${icon("eye")}</button></td></tr>`).join("")}</tbody></table></div>`;
}

function renderLogModal() {
  const log = state.lessonLogs.find((item) => item.log_id === state.selectedLogId);
  if (!log) return "";
  return `<div class="modal-backdrop" onclick="closeLog()"><article class="modal" onclick="event.stopPropagation()"><header><div><span>${formatDate(log.lesson_date)} · ${escapeHtml(log.subject)}${log.lesson_number ? ` · ${log.lesson_number}회차` : ""}</span><h2>${escapeHtml(log.student_name || studentName(log.student_id))} 수업일지</h2></div><button class="icon-button" onclick="closeLog()" aria-label="닫기">${icon("close")}</button></header><div class="modal-meta"><span>${statusBadge(log.attendance_status, log.attendance_status === "출석" ? "success" : "warning")}</span><span>강사 ${escapeHtml(log.teacher_name || accountName(log.teacher_id) || "-")}</span></div><div class="log-detail-grid">${detailBlock("수업 내용", log.lesson_content)}${detailBlock("과제", log.homework)}${detailBlock("다음 수업 목표", log.next_goal)}${detailBlock("연습 요청", log.practice_request)}${log.absence_reason ? detailBlock("결석·취소 사유", log.absence_reason) : ""}${log.makeup_date ? detailBlock("보강 예정일", formatDate(log.makeup_date)) : ""}${log.internal_memo ? detailBlock("내부 메모", log.internal_memo, "private") : ""}</div></article></div>`;
}

function detailBlock(label, value, className = "") {
  return `<section class="log-detail ${className}"><h3>${label}</h3><p>${escapeHtml(value || "기록 없음").replace(/\n/g, "<br />")}</p></section>`;
}

function canOpenProfiles() {
  return state.accountType === "admin" || ["owner", "manager"].includes(state.employeePosition);
}

function entityLink(type, id, label) {
  if (!id || (["account", "student"].includes(type) && !canOpenProfiles())) return `<strong>${escapeHtml(label)}</strong>`;
  return `<button class="entity-link" onclick="event.stopPropagation();openEntity('${type}','${id}')">${escapeHtml(label)}</button>`;
}

function renderEntityDetail(entity) {
  const back = `<button class="btn secondary small" onclick="closeEntity()">${icon("arrowLeft")}이전 화면</button>`;
  if (entity.type === "room") {
    const room = state.rooms.find((item) => item.room_id === entity.id);
    if (!room) return empty("공간을 찾을 수 없습니다.");
    const reservations = state.reservations.filter((item) => item.room_id === room.room_id && item.reservation_date >= today()).sort((a, b) => `${a.reservation_date}${a.start_time}`.localeCompare(`${b.reservation_date}${b.start_time}`));
    return `${pageHeading(room.name, `${room.room_type === "lesson" ? "레슨실" : "연습실"} 예정 사용 일정`, back)}${roomZoneMap(state.reservations.filter((item) => item.status === "예약"))}<section class="panel"><div class="panel-head"><div><h2>예정 스케줄</h2><p>${reservations.length}건</p></div></div>${reservationsTable(reservations)}</section>`;
  }
  if (entity.type === "lesson") {
    const lesson = state.lessons.find((item) => item.lesson_id === entity.id);
    if (!lesson) return empty("수업 정보를 찾을 수 없습니다.");
    const canEdit = !String(lesson.lesson_id).startsWith("recurring-") && (state.capabilities.manageOperations || (state.user.role === "teacher" && lesson.teacher_id === state.user.account_id));
    return `${pageHeading(`${lesson.subject} · ${lesson.lesson_number || "-"}회차`, `${formatDate(lesson.lesson_date)} ${lesson.start_time}`, back)}<section class="detail-sheet">${detailRow("수강생", entityLink("student", lesson.student_id, lesson.student_name || studentName(lesson.student_id)))}${detailRow("강사", entityLink("account", lesson.teacher_id, lesson.teacher_name || accountName(lesson.teacher_id)))}${detailRow("공간", escapeHtml(lesson.room || "미정"))}${detailRow("상태", statusBadge(lesson.status || "예정", lesson.status === "결석" || lesson.status === "취소" ? "danger" : "info"))}${lesson.absence_reason ? detailRow("결석·취소 사유", escapeHtml(lesson.absence_reason)) : ""}${lesson.makeup_date ? detailRow("보강 일정", escapeHtml(formatDate(lesson.makeup_date))) : ""}${detailRow("내부 메모", escapeHtml(lesson.memo || "없음"))}</section>${canEdit ? lessonStatusForm(lesson) : ""}`;
  }
  if (entity.type === "reservation") {
    const reservation = state.reservations.find((item) => item.reservation_id === entity.id);
    if (!reservation) return empty("예약 정보를 찾을 수 없습니다.");
    return `${pageHeading(`${reservation.room_name} 예약`, `${formatDate(reservation.reservation_date)} ${reservation.start_time} - ${reservation.end_time}`, back)}<section class="detail-sheet">${detailRow("예약자", entityLink("account", reservation.reserved_by, reservation.reserved_by_name || "-"))}${detailRow("목적", escapeHtml(reservation.purpose))}${detailRow("상태", statusBadge(reservation.status, reservation.status === "예약" ? "info" : "muted"))}${detailRow("메모", escapeHtml(reservation.memo || "없음"))}</section>`;
  }
  if (entity.type === "meeting") {
    const meeting = state.meetings.find((item) => item.meeting_id === entity.id);
    if (!meeting) return empty("회의 정보를 찾을 수 없습니다.");
    return `${pageHeading(meeting.title, `${formatDate(meeting.meeting_date)} ${meeting.start_time} - ${meeting.end_time}`, back)}<section class="detail-sheet">${detailRow("장소", escapeHtml(meeting.location || "미정"))}${detailRow("안건", escapeHtml(meeting.agenda || "없음"))}${detailRow("참석자", escapeHtml((meeting.participant_names || []).join(", ") || "없음"))}</section>`;
  }
  if (entity.type === "student") return renderStudentProfile(entity.id, back);
  if (entity.type === "account-admin") return renderAccountEditor(entity.id, back);
  if (entity.type === "account") return renderAccountProfile(entity.id, back);
  return empty("상세 정보를 찾을 수 없습니다.");
}

function lessonStatusForm(lesson) {
  return `<section class="panel form-panel detail-edit"><div class="panel-head"><div><h2>출결·보강 기록</h2><p>결석 또는 취소 시 사유와 보강일을 함께 기록합니다.</p></div></div><form class="panel-body form-grid two" onsubmit="updateLesson(event)"><input type="hidden" name="lesson_id" value="${lesson.lesson_id}" /><label class="field"><span>수업 상태</span><select name="status">${["예정","완료","결석","보강예정","취소"].map((item) => `<option ${lesson.status === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label class="field"><span>보강 예정일</span><input name="makeup_date" type="date" value="${escapeAttr(lesson.makeup_date || "")}" /></label><label class="field wide"><span>결석·취소 사유</span><input name="absence_reason" value="${escapeAttr(lesson.absence_reason || "")}" /></label><label class="field wide"><span>내부 메모</span><textarea name="memo">${escapeHtml(lesson.memo || "")}</textarea></label><div class="form-actions wide"><button class="btn">${icon("save")}저장</button></div></form></section>`;
}

function renderAccountEditor(accountId, back) {
  const account = state.accounts.find((item) => item.account_id === accountId);
  if (!account) return empty("계정을 찾을 수 없습니다.");
  const canAssignAdmin = state.accountType === "admin";
  return `${pageHeading(`${account.name} 계정 편집`, "계정 구분 변경 시 기본 권한이 자동으로 다시 적용됩니다.", back)}
    <section class="panel form-panel focused-panel"><form class="panel-body form-grid two" onsubmit="updateAccountDetails(event)">
      <input type="hidden" name="account_id" value="${account.account_id}" />
      <label class="field"><span>이름</span><input name="name" value="${escapeAttr(account.name)}" required /></label>
      <label class="field"><span>계정 구분</span><select name="role">${canAssignAdmin ? `<option value="admin" ${account.role === "admin" ? "selected" : ""}>시스템 관리자</option>` : ""}<option value="staff" ${account.role === "staff" ? "selected" : ""}>직원</option><option value="teacher" ${account.role === "teacher" ? "selected" : ""}>강사</option><option value="student" ${account.role === "student" ? "selected" : ""}>수강생</option></select></label>
      <label class="field"><span>직원 직급</span><select name="employee_position"><option value="">해당 없음</option>${Object.entries(POSITION_LABELS).map(([value, label]) => `<option value="${value}" ${account.employee_position === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span>연결 수강생</span><select name="linked_student_id"><option value="">해당 없음</option>${state.students.map((item) => `<option value="${item.student_id}" ${account.linked_student_id === item.student_id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
      <label class="field"><span>이메일</span><input name="email" type="email" value="${escapeAttr(account.email || "")}" /></label>
      <label class="field"><span>연락처</span><input name="phone" value="${escapeAttr(account.phone || "")}" /></label>
      <div class="form-actions wide"><button class="btn">${icon("save")}계정 정보 저장</button></div>
    </form></section>
    <section class="panel"><div class="panel-head"><div><h2>로그인 이력</h2><p>최근 ${account.recent_logins?.length || 0}건</p></div></div><div class="login-history">${(account.recent_logins || []).map((date) => `<div><span>${icon("clock")}</span><strong>${escapeHtml(formatDateTime(date))}</strong></div>`).join("") || emptyInline("로그인 기록이 없습니다.")}</div></section>`;
}

function detailRow(label, value) {
  return `<div><span>${label}</span><div>${value || "-"}</div></div>`;
}

function renderStudentProfile(studentId, back) {
  const student = state.students.find((item) => item.student_id === studentId);
  if (!student) return empty("수강생 프로필을 찾을 수 없습니다.");
  const enrollments = state.enrollments.filter((item) => item.student_id === studentId);
  const lessons = state.lessons.filter((item) => item.student_id === studentId).sort(compareLessons);
  const logs = state.lessonLogs.filter((item) => item.student_id === studentId);
  return `${pageHeading(student.name, `${student.major || "보컬"} · ${student.status}`, back)}
    <section class="profile-hero"><span class="avatar large">${escapeHtml(student.name.slice(0, 1))}</span><div><h2>${escapeHtml(student.name)}</h2><p>${escapeHtml(student.goal || "목표 미등록")}</p></div></section>
    <div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2>예정 수업</h2><p>${lessons.filter((item) => item.lesson_date >= today()).length}건</p></div></div>${lessonsTable(lessons.filter((item) => item.lesson_date >= today()))}</section><section class="panel"><div class="panel-head"><div><h2>수강 이력</h2><p>${enrollments.length}건</p></div></div>${enrollmentsTable(enrollments)}</section><section class="panel full-span"><div class="panel-head"><div><h2>수업일지</h2><p>${logs.length}건</p></div></div>${logsTable(logs)}</section></div>`;
}

function renderAccountProfile(accountId, back) {
  const account = state.accounts.find((item) => item.account_id === accountId);
  if (!account) return empty("계정 프로필을 찾을 수 없습니다.");
  if (account.account_type === "admin") return `${pageHeading("시스템 관리 계정", "사람이 아닌 시스템 관리 전용 계정입니다.", back)}<section class="detail-sheet">${detailRow("로그인 ID", escapeHtml(account.login_id))}${detailRow("최근 로그인", escapeHtml(formatDateTime(account.last_login_at) || "기록 없음"))}</section>`;
  if (account.role === "teacher" || account.employee_position === "teacher") {
    const lessons = state.lessons.filter((item) => item.teacher_id === accountId && item.lesson_date >= today()).sort(compareLessons);
    const enrollments = state.enrollments.filter((item) => item.teacher_id === accountId);
    const logs = state.lessonLogs.filter((item) => item.teacher_id === accountId);
    const studentIds = unique(enrollments.map((item) => item.student_id));
    return `${pageHeading(account.name, `${accountLabel(account)} · 강사 프로필`, back)}${profileIdentity(account)}
      <div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2>예정 수업</h2><p>${lessons.length}건</p></div></div>${lessonsTable(lessons)}</section><section class="panel"><div class="panel-head"><div><h2>담당 수강생</h2><p>${studentIds.length}명</p></div></div><div class="staff-list">${studentIds.map((id) => { const student = state.students.find((item) => item.student_id === id); return student ? `<div><span class="avatar">${escapeHtml(student.name.slice(0, 1))}</span><div>${entityLink("student", id, student.name)}<p>${escapeHtml(student.major || "-")}</p></div></div>` : ""; }).join("")}</div></section><section class="panel full-span"><div class="panel-head"><div><h2>작성한 수업일지</h2><p>${logs.length}건</p></div></div>${lessonLogProfileFilter(logs)}</section></div>`;
  }
  const meetings = state.meetings.filter((item) => String(item.participant_ids || "").split(",").includes(accountId));
  return `${pageHeading(account.name, accountLabel(account), back)}${profileIdentity(account)}
    <div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2>참석 예정 회의</h2><p>${meetings.length}건</p></div></div>${meetingsList(meetings)}</section><section class="panel"><div class="panel-head"><div><h2>업무 목록</h2><p>${state.tasks.length}건</p></div></div>${tasksList(state.tasks)}</section>${accountId === state.user.account_id ? `<section class="panel full-span form-panel"><div class="panel-head"><div><h2>내 업무 추가</h2></div></div>${taskForm(accountId)}</section>` : ""}</div>`;
}

function profileIdentity(account) {
  return `<section class="profile-hero"><span class="avatar large">${escapeHtml(account.name.slice(0, 1))}</span><div><h2>${escapeHtml(account.name)}</h2><p>${escapeHtml(account.profile_intro || account.email || "소개 미등록")}</p></div></section>`;
}

function lessonLogProfileFilter(logs) {
  const students = uniqueBy(logs.map((item) => ({ id: item.student_id, name: item.student_name || studentName(item.student_id) })), "id");
  const selected = state.logFilters.student;
  return `<div class="filter-bar"><select onchange="setLogFilter('student',this.value)"><option value="">전체 수강생</option>${students.map((item) => `<option value="${item.id}" ${selected === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></div>${logsTable(logs.filter((item) => !selected || item.student_id === selected))}`;
}

function tasksList(items) {
  if (!items.length) return empty("등록된 업무가 없습니다.");
  return `<div class="task-list">${items.map((item) => `<article><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.memo || "메모 없음")}</p></div><span>${escapeHtml(item.due_date ? formatDate(item.due_date) : "기한 없음")}</span>${statusBadge(item.status || "할일", item.status === "완료" ? "success" : "info")}</article>`).join("")}</div>`;
}

function taskForm(accountId) {
  return `<form class="panel-body form-grid two" onsubmit="createTask(event)"><input type="hidden" name="assignee_id" value="${accountId}" /><label class="field wide"><span>업무명</span><input name="title" required /></label><label class="field"><span>마감일</span><input name="due_date" type="date" /></label><label class="field"><span>우선순위</span><select name="priority"><option>보통</option><option>높음</option><option>낮음</option></select></label><input type="hidden" name="status" value="할일" /><label class="field wide"><span>메모</span><textarea name="memo"></textarea></label><div class="form-actions wide"><button class="btn">${icon("plus")}업무 추가</button></div></form>`;
}

function renderProfile() {
  const availableMenus = menusFor(state.user.role).filter(([key]) => !["profile", "usage", "system-settings", "accounts"].includes(key));
  const defaultPageValue = state.user.default_page || defaultPage(state.user.role);
  return `
    ${pageHeading("환경 설정", "개인 프로필, 화면 모드와 로그인 비밀번호를 관리합니다.")}
    <div class="profile-grid">
      <section class="profile-summary">
        <span class="avatar large">${escapeHtml(state.user.name.slice(0, 1))}</span>
        <div><h2>${escapeHtml(state.user.name)}</h2><p>${escapeHtml(accountLabel(state.user))} · ${escapeHtml(state.user.login_id)}</p></div>
      </section>
      <section class="panel profile-panel">
        <div class="panel-head"><div><h2>프로필과 화면 설정</h2><p>강사 프로필과 개인 환경에 반영됩니다.</p></div></div>
        <form class="panel-body form-grid" onsubmit="updateProfile(event)">
          ${state.accountType === "admin" ? `<label class="field"><span>관리자 표시 이름</span><input name="name" value="${escapeAttr(state.user.name || "admin")}" maxlength="60" required /></label>` : ""}
          <label class="field"><span>이메일</span><input name="email" type="email" value="${escapeAttr(state.user.email || "")}" autocomplete="email" /></label>
          <label class="field"><span>연락처</span><input name="phone" value="${escapeAttr(state.user.phone || "")}" autocomplete="tel" /></label>
          ${state.user.role === "teacher" ? `<label class="field"><span>강사 소개</span><textarea name="profile_intro" rows="4" placeholder="전공, 지도 분야와 간단한 소개">${escapeHtml(state.user.profile_intro || "")}</textarea></label>` : `<input type="hidden" name="profile_intro" value="${escapeAttr(state.user.profile_intro || "")}" />`}
          <div class="field"><span>화면 모드</span><div class="theme-options">${["system", "light", "dark"].map((value) => `<label><input type="radio" name="theme" value="${value}" ${state.theme === value ? "checked" : ""} onchange="setTheme('${value}')"/><span>${value === "system" ? "기기 설정" : value === "light" ? "라이트" : "다크"}</span></label>`).join("")}</div></div>
          <label class="field"><span>로그인 후 시작 화면</span><select name="default_page">${availableMenus.map(([key, label]) => `<option value="${key}" ${defaultPageValue === key ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>
          <div class="field"><span>화면 밀도</span><div class="theme-options">${[["comfortable","기본"],["compact","촘촘하게"]].map(([value, label]) => `<label><input type="radio" name="ui_density" value="${value}" ${state.density === value ? "checked" : ""} onchange="setDensity('${value}')"/><span>${label}</span></label>`).join("")}</div></div>
          ${dashboardWidgetOptions()}
          <div class="form-actions"><button class="btn">${icon("save")}설정 저장</button></div>
        </form>
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
  return `<div class="timeline">${items.map((item) => `<button class="timeline-item" onclick="openEntity('lesson','${item.lesson_id}')"><time>${escapeHtml(item.start_time || "--:--")}</time><span class="timeline-dot"></span><div><strong>${escapeHtml(item.student_name || studentName(item.student_id) || "-")}</strong><p>${escapeHtml(item.subject || "-")} · ${escapeHtml(item.teacher_name || accountName(item.teacher_id) || state.user.name)}</p><small>${escapeHtml(item.room || "강의실 미정")} · ${item.lesson_number ? `${item.lesson_number}회차 · ` : ""}${escapeHtml(item.duration_minutes || 50)}분</small></div>${statusBadge(item.status || "예정", item.status === "완료" ? "success" : "info")}</button>`).join("")}</div>`;
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
  return `<div class="table-wrap"><table><thead><tr><th>강사</th><th>담당 수강생</th><th>7일 내 수업</th><th>이번 달 일지</th></tr></thead><tbody>${items.map((item) => `<tr><td>${entityLink("account", item.teacher_id, item.teacher_name)}</td><td>${item.active_students}명</td><td>${item.next_7_days}회</td><td>${item.month_logs}건</td></tr>`).join("")}</tbody></table></div>`;
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
  return `<div class="table-wrap"><table><thead><tr><th>수강생</th><th>등록 기준</th><th>강사</th><th>기간</th><th>반복 일정</th><th>상태</th></tr></thead><tbody>${items.map((item) => `<tr><td>${entityLink("student", item.student_id, item.student_name || studentName(item.student_id))}</td><td>${escapeHtml(item.subject)}</td><td>${entityLink("account", item.teacher_id, item.teacher_name || accountName(item.teacher_id))}</td><td>${escapeHtml(formatDate(item.start_date))} ~ ${item.end_date ? escapeHtml(formatDate(item.end_date)) : "계속"}</td><td>${DAY_LABELS[Number(item.weekly_day)] || "-"} ${escapeHtml(item.start_time || "")}</td><td>${statusBadge(ENROLLMENT_STATUS_LABELS[item.status] || item.status, item.status === "active" ? "success" : "muted")}</td></tr>`).join("")}</tbody></table></div>`;
}

function lessonsTable(items) {
  if (!items.length) return empty("예정된 개별 수업이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>일시·회차</th><th>수강생</th><th>강사</th><th>과목</th><th>강의실</th><th>상태·보강</th></tr></thead><tbody>${items.map((item) => `<tr onclick="openEntity('lesson','${item.lesson_id}')" class="clickable-row"><td>${escapeHtml(formatDate(item.lesson_date))} ${escapeHtml(item.start_time || "")}<br /><small>${item.lesson_number ? `${item.lesson_number}회차` : "-"}</small></td><td>${entityLink("student", item.student_id, item.student_name || studentName(item.student_id))}</td><td>${entityLink("account", item.teacher_id, item.teacher_name || accountName(item.teacher_id))}</td><td>${escapeHtml(item.subject)}</td><td>${escapeHtml(item.room || "-")}</td><td>${statusBadge(item.status || "예정", ["결석","취소"].includes(item.status) ? "danger" : item.status === "완료" ? "success" : "info")}${item.makeup_date ? `<br /><small>보강 ${escapeHtml(formatDate(item.makeup_date))}</small>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}

function registrationsTable(items) {
  if (!items.length) return empty("등록 이력이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>수강생</th><th>등록 기준</th><th>구분</th><th>등록 기간</th><th>금액</th><th>납부 상태</th><th>다음 결제 예정</th></tr></thead><tbody>${items.map((item) => `<tr><td><strong>${escapeHtml(item.student_name || studentName(item.student_id) || state.user.name)}</strong></td><td>${escapeHtml(item.program_name || "-")}</td><td>${escapeHtml(item.registration_type || "-")}</td><td>${escapeHtml(formatDate(item.period_start))} ~ ${item.period_end ? escapeHtml(formatDate(item.period_end)) : "계속"}</td><td>${formatMoney(item.amount)}</td><td>${statusBadge(item.payment_status || "-", item.payment_status === "납부완료" ? "success" : ["미납", "청구예정"].includes(item.payment_status) ? "warning" : "muted")}</td><td><strong>${escapeHtml(formatDate(item.next_due_date))}</strong></td></tr>`).join("")}</tbody></table></div>`;
}

function registrationDueSoon() {
  return state.registrations.filter((item) => {
    const days = rawDateDiff(today(), item.next_due_date);
    return item.next_due_date && days >= 0 && days <= 14 && !["취소", "환불"].includes(item.payment_status);
  }).sort((a, b) => String(a.next_due_date).localeCompare(String(b.next_due_date)));
}

function registrationDueList(items) {
  if (!items.length) return empty("14일 이내 재등록 예정자가 없습니다.", "예정일이 가까워지면 이곳에 먼저 표시됩니다.");
  return `<div class="due-list">${items.map((item) => `<button onclick="navigate('registrations')"><span class="due-date">D-${rawDateDiff(today(), item.next_due_date)}</span><div><strong>${escapeHtml(item.student_name || studentName(item.student_id) || "-")}</strong><p>${escapeHtml(formatDate(item.next_due_date))} · ${escapeHtml(item.payment_status || "확인 필요")}</p></div>${icon("chevron")}</button>`).join("")}</div>`;
}

function reservationsTable(items) {
  if (!items.length) return empty("등록된 공간 예약이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>일시</th><th>공간</th><th>예약자</th><th>목적</th><th>상태</th><th>관리</th></tr></thead><tbody>${items.map((item) => {
    const canEdit = state.capabilities.manageReservations || item.reserved_by === state.user.account_id;
    return `<tr><td>${escapeHtml(formatDate(item.reservation_date))}<br /><small>${escapeHtml(item.start_time)} ~ ${escapeHtml(item.end_time)}</small></td><td>${entityLink("room", item.room_id, item.room_name)}<br /><small>${item.room_type === "lesson" ? "레슨실" : "연습실"}</small></td><td>${entityLink("account", item.reserved_by, item.reserved_by_name || "-")}</td><td><button class="entity-link" onclick="openEntity('reservation','${item.reservation_id}')">${escapeHtml(item.purpose || "-")}</button></td><td>${statusBadge(item.status, item.status === "예약" ? "info" : item.status === "사용완료" ? "success" : item.status === "노쇼" ? "danger" : "muted")}</td><td>${canEdit && item.status === "예약" ? `<div class="row-actions"><button class="btn ghost small" onclick="updateReservationStatus('${item.reservation_id}','취소')">취소</button>${state.capabilities.manageReservations ? `<button class="btn secondary small" onclick="updateReservationStatus('${item.reservation_id}','사용완료')">완료</button>` : ""}</div>` : "-"}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function workLogsTable(items) {
  if (!items.length) return empty("근태 기록이 없습니다.");
  return `<div class="table-wrap"><table><thead><tr><th>날짜</th><th>직원</th><th>출근</th><th>퇴근</th><th>근무 시간</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(formatDate(item.work_date))}</td><td><strong>${escapeHtml(item.account_name || state.user.name)}</strong></td><td>${escapeHtml(formatTime(item.clock_in_at))}</td><td>${item.clock_out_at ? escapeHtml(formatTime(item.clock_out_at)) : statusBadge("근무 중", "success")}</td><td>${item.clock_out_at ? durationBetween(item.clock_in_at, item.clock_out_at) : "-"}</td></tr>`).join("")}</tbody></table></div>`;
}

function meetingsList(items) {
  if (!items.length) return empty("예정된 회의가 없습니다.");
  return `<div class="meeting-list">${items.map((item) => `<article onclick="openEntity('meeting','${item.meeting_id}')" class="clickable-card"><time><strong>${formatShortDate(item.meeting_date)}</strong><span>${escapeHtml(item.start_time)}-${escapeHtml(item.end_time)}</span></time><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.agenda || "등록된 안건 없음")}</p><small>${escapeHtml(item.location || "장소 미정")} · ${escapeHtml((item.participant_names || []).join(", "))}</small></div>${statusBadge(item.status || "예정", "info")}</article>`).join("")}</div>`;
}

function calendarSummary() {
  const upcoming = state.calendar.filter((item) => item.date >= today()).slice(0, 5);
  return `<section class="calendar-summary"><div class="calendar-summary-head"><div><h2>다가오는 일정</h2><p>수업·회의·학원 일정</p></div><button class="text-action" onclick="navigate('calendar')">캘린더 보기 ${icon("chevron")}</button></div><div class="calendar-summary-list">${upcoming.length ? upcoming.map((item) => `<button onclick="${["lesson","meeting"].includes(String(item.calendar_id).split(":")[0]) ? `openCalendarEvent('${escapeAttr(item.calendar_id)}')` : "navigate('calendar')"}"><time>${formatShortDate(item.date)}</time><span class="event-dot ${calendarTone(item.type)}"></span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.start_time || "종일")} ${item.detail ? `· ${escapeHtml(item.detail)}` : ""}</small></div></button>`).join("") : emptyInline("예정된 일정이 없습니다.")}</div></section>`;
}

function calendarGrid(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const days = new Date(year, monthNumber, 0).getDate();
  const cells = [];
  for (let index = 0; index < first.getDay(); index++) cells.push(`<div class="calendar-day outside"></div>`);
  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = state.calendar.filter((item) => item.date === date && calendarFilterMatch(item));
    cells.push(`<div class="calendar-day ${date === today() ? "today" : ""}"><span class="day-number">${day}</span><div>${events.slice(0, 4).map((item) => `<button class="calendar-event ${calendarTone(item.type)}" title="${escapeAttr(item.title)}" onclick="openCalendarEvent('${escapeAttr(item.calendar_id)}')"><span>${escapeHtml(item.start_time || "종일")}</span>${escapeHtml(item.title)}</button>`).join("")}${events.length > 4 ? `<small>+${events.length - 4}개</small>` : ""}</div></div>`);
  }
  return `<div class="calendar-weekdays">${DAY_LABELS.map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div>`;
}

function calendarFilterMatch(item) {
  if (state.calendarFilter === "all") return true;
  if (state.calendarFilter === "academy") return !["lesson", "theory", "meeting"].includes(item.type);
  return item.type === state.calendarFilter;
}

function openCalendarEvent(calendarId) {
  const [type, id] = String(calendarId).split(":");
  if (type === "lesson") return openEntity("lesson", id);
  if (type === "meeting") return openEntity("meeting", id);
}

function moveCalendarMonth(offset) {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  state.calendarMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  render();
}

function calendarTone(type) {
  if (type === "lesson" || type === "theory") return type;
  if (type === "meeting") return "meeting";
  if (type === "휴무") return "holiday";
  return "academy";
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

function accountLabel(account) {
  const type = account.account_type || (account.role === "admin" ? "admin" : account.role === "student" ? "student" : "staff");
  if (type === "admin") return "관리자";
  if (type === "student") return "수강생";
  const position = account.employee_position || (account.role === "teacher" ? "teacher" : "employee");
  return POSITION_LABELS[position] || "직원";
}

function roleLabel(role) {
  return ROLE_LABELS[role] || role || "-";
}

function multiline(value) {
  return escapeHtml(value || "").replace(/\r?\n/g, "<br />");
}

function rawDateDiff(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  return Math.round((new Date(`${toDate}T12:00:00+09:00`) - new Date(`${fromDate}T12:00:00+09:00`)) / 86400000);
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function formatTime(value) {
  if (!value) return "-";
  if (/^\d{2}:\d{2}/.test(value)) return String(value).slice(0, 5);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(date);
}

function durationBetween(start, end) {
  const minutes = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

function addMinutesClient(time, minutes) {
  if (!time) return "";
  const [hour, minute] = String(time).split(":").map(Number);
  const total = hour * 60 + minute + Number(minutes || 0);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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
    delete_lesson_template: "수업일지 템플릿 삭제",
    create_registration: "등록·재등록 저장",
    create_reservation: "공간 예약",
    update_reservation: "예약 상태 변경",
    clock_in: "출근",
    clock_out: "퇴근",
    create_meeting: "회의 예약",
    create_calendar_event: "학원 일정 등록",
    update_profile: "프로필 수정",
    update_permissions: "권한 변경",
    update_room: "공간 이름 변경",
    request_account: "신규 계정 요청",
    approve_account_request: "계정 요청 승인",
    reject_account_request: "계정 요청 반려",
    update_public_settings: "로그인 화면 설정 변경"
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
  const labels = { account: "계정", account_request: "계정 요청", settings: "설정", student: "수강생", enrollment: "수강", lesson: "수업", lesson_log: "수업일지", lesson_template: "템플릿", registration: "등록", reservation: "예약", work_log: "근태", meeting: "회의", calendar_event: "학원 일정", room: "공간", page: "화면" };
  return `${labels[type] || type}${id ? ` · ${id}` : ""}`;
}

window.login = login;
window.openAuthDialog = openAuthDialog;
window.closeAuthDialog = closeAuthDialog;
window.submitAccountRequest = submitAccountRequest;
window.logout = logout;
window.retryConnection = retryConnection;
window.startDemo = startDemo;
window.navigate = navigate;
window.toggleMobileMenu = toggleMobileMenu;
window.refreshData = refreshData;
window.createAccount = createAccount;
window.reviewAccountRequest = reviewAccountRequest;
window.updatePublicSettings = updatePublicSettings;
window.createStudent = createStudent;
window.updateStudent = updateStudent;
window.createEnrollment = createEnrollment;
window.createLesson = createLesson;
window.createRegistration = createRegistration;
window.createReservation = createReservation;
window.returnReservationSchedule = returnReservationSchedule;
window.updateReservationStatus = updateReservationStatus;
window.clockWork = clockWork;
window.createMeeting = createMeeting;
window.createCalendarEvent = createCalendarEvent;
window.updateRoom = updateRoom;
window.updateProfile = updateProfile;
window.updatePermissions = updatePermissions;
window.setTheme = setTheme;
window.setDensity = setDensity;
window.moveCalendarMonth = moveCalendarMonth;
window.switchTestAccount = switchTestAccount;
window.resetTestData = resetTestData;
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
window.setStudentFilter = setStudentFilter;
window.applyStudentSearch = applyStudentSearch;
window.resetStudentFilters = resetStudentFilters;
window.setLogFilter = setLogFilter;
window.applyLogSearch = applyLogSearch;
window.resetLogFilters = resetLogFilters;
window.setMeetingFilter = setMeetingFilter;
window.applyMeetingSearch = applyMeetingSearch;
window.resetMeetingFilters = resetMeetingFilters;
window.applyCalendarSearch = applyCalendarSearch;
window.setCalendarSort = setCalendarSort;
window.resetCalendarFilters = resetCalendarFilters;
window.viewLog = viewLog;
window.closeLog = closeLog;

initializeApp();
