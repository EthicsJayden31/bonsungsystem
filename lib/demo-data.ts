import type { Role } from "@/lib/auth-shared";

export type Teacher = {
  id: string;
  name: string;
  major: string;
};

export type Student = {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  major: string;
  goal: string;
  status: "상담중" | "등록대기" | "재원" | "휴원" | "퇴원";
  enrolledAt: string;
  memo: string;
  teacherId: string;
  teacherName?: string;
};

export type Guardian = {
  id: string;
  studentId: string;
  name: string;
  relation: string;
  phone: string;
  payer: boolean;
  emergency: boolean;
  memo: string;
};

export type Consultation = {
  id: string;
  studentId?: string;
  studentName: string;
  guardianName: string;
  phone: string;
  channel: string;
  major: string;
  goal: string;
  date: string;
  followUpDate: string;
  status: string;
  priority: string;
  memo: string;
  assignedTo?: string;
  assignedToName?: string;
  statusUpdatedAt?: string;
  unreadForAccountIds?: string[];
};

export type ConsultationHistory = {
  id: string;
  consultationId: string;
  actorId: string;
  actorName: string;
  action: string;
  status: string;
  assignedTo: string;
  assignedToName: string;
  occurredAt: string;
};

export type Course = {
  id: string;
  name: string;
  major: string;
  teacherId: string;
  status: string;
};

export type Enrollment = {
  id: string;
  studentId: string;
  courseId: string;
  teacherId: string;
  startDate: string;
  status: string;
  memo: string;
  studentName?: string;
  teacherName?: string;
};

export type Lesson = {
  id: string;
  studentId: string;
  teacherId: string;
  courseId: string;
  startsAt: string;
  duration: number;
  status: string;
  memo: string;
  studentName?: string;
  teacherName?: string;
  subject?: string;
};

export type Attendance = {
  id: string;
  lessonId: string;
  studentId: string;
  status: string;
  makeupNeeded: boolean;
  memo: string;
};

export type LessonNote = {
  id: string;
  lessonId: string;
  studentId: string;
  teacherId: string;
  date: string;
  content: string;
  homework: string;
  nextGoal: string;
  practiceRequest: string;
  internalMemo: string;
  studentName?: string;
  teacherName?: string;
};

export type Room = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: string;
};

export type Reservation = {
  id: string;
  roomId: string;
  studentId: string;
  requester: string;
  startsAt: string;
  endsAt: string;
  status: string;
  memo: string;
  studentName?: string;
  roomName?: string;
};

export type Payment = {
  id: string;
  studentId: string;
  title: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string;
  memo: string;
  studentName?: string;
};

export type Task = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: string;
  priority: string;
  memo: string;
};

export type WorkLog = {
  id: string;
  accountId: string;
  accountName: string;
  workDate: string;
  clockInAt: string;
  clockOutAt: string;
  memo: string;
};

export type Meeting = {
  id: string;
  title: string;
  startsAt: string;
  participantNames: string[];
  status: string;
  memo: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  targetRoles: Role[];
  memo: string;
};

export type AccountRequest = {
  id: string;
  loginId: string;
  name: string;
  requestedRole: Role;
  email: string;
  phone: string;
  linkedStudentId: string;
  message: string;
  status: string;
  reviewedByName: string;
  reviewedAt: string;
  reviewMemo: string;
  createdAccountId: string;
  createdAt: string;
};

export type PublicSettings = {
  loginNotice: string;
  academyPhone: string;
  reservationGuide: string;
  updatedAt: string;
  updatedBy: string;
};

export type Notice = {
  id: string;
  title: string;
  category: string;
  author: string;
  updatedAt: string;
  body: string;
  targetRoles: Role[];
  pinned: boolean;
};

const importedAt = "2026-07-02";

const rawStudents: Array<[string, string, "등록 확정" | "확인 필요"]> = [
  ["jang-yunho", "장윤호", "등록 확정"], ["moon-hongjae", "문홍재", "등록 확정"], ["shin-dongwoo", "신동우", "등록 확정"],
  ["moon-jihwan", "문지환", "등록 확정"], ["choi-hoon", "최훈", "등록 확정"], ["jung-youngjin", "정영진", "등록 확정"],
  ["shin-hogeun", "신호근", "등록 확정"], ["lee-minjin", "이민진", "등록 확정"], ["lim-seunghyun", "임승현", "등록 확정"],
  ["kim-taeji-new", "(신) 김태지", "확인 필요"], ["seo-minyeop", "서민엽", "등록 확정"], ["cho-youngjin-new", "(신) 조영진", "확인 필요"],
  ["moon-insu", "문인수", "등록 확정"], ["kim-youngseok", "김영석", "등록 확정"], ["park-soyoung", "박소영", "등록 확정"],
  ["lee-seonje", "이선제", "등록 확정"], ["oh-sanghoon", "오상훈", "등록 확정"], ["lee-jisu-new", "(신) 이지수", "확인 필요"],
  ["moon-daeseong", "문대성", "등록 확정"], ["choi-junmyeong", "최준명", "등록 확정"], ["hwang-donggyu", "황동규", "등록 확정"],
  ["park-jaedong", "박재동", "등록 확정"], ["kim-taehyeong", "김태형(?)", "등록 확정"], ["jang-sejin", "장세진", "등록 확정"],
  ["ha-hyeyoung-new", "(신) 하혜영", "확인 필요"], ["kim-mijin", "김미진", "등록 확정"], ["lee-seonghyeon-new", "(신) 이성현", "확인 필요"],
  ["ji-dasom", "지다솜", "등록 확정"]
];

const pendingStudentRows = rawStudents.filter(([, , registrationStatus]) => registrationStatus === "확인 필요");

export const teachers: Teacher[] = [
  { id: "teacher-kang-eunmi", name: "강은미", major: "Director" },
  { id: "teacher-1", name: "황휘현", major: "Head Coach" },
  { id: "teacher-choi-hyeryeong", name: "최혜령", major: "Head Coach" },
  { id: "teacher-lee-seonghyeon", name: "이성현", major: "Coach" },
  { id: "teacher-kim-saemi", name: "김새미", major: "Coach" },
  { id: "staff-cho-youngjin", name: "조영진", major: "Student Success" },
  { id: "staff-jinho", name: "진호", major: "Operations" },
  { id: "staff-kim-jaeeun", name: "김재은", major: "Brand" },
  { id: "teacher-unassigned", name: "미정", major: "Unassigned" }
];

export const students: Student[] = rawStudents.map(([slug, name, registrationStatus]) => ({
  id: `student-${slug}`,
  name,
  birthDate: "",
  phone: "",
  major: "미정",
  goal: "Notion 수강생 DB 초기 이관",
  status: registrationStatus === "등록 확정" ? "재원" : "등록대기",
  enrolledAt: "",
  memo: "본성뮤직 초기 운영 자료 for Monster Crew > 수강생 DB에서 이관. 결제, 콘텐츠 동의, 담당 강사, 프로그램, 수업 시간, 보호자 연락처 확인 필요.",
  teacherId: "teacher-unassigned",
  teacherName: "미정"
}));

export const guardians: Guardian[] = [];

export const consultations: Consultation[] = pendingStudentRows.map(([slug, name], index) => ({
  id: `consult-initial-${index + 1}`,
  studentId: `student-${slug}`,
  studentName: name,
  guardianName: "",
  phone: "",
  channel: "Notion 초기 운영 자료",
  major: "미정",
  goal: "신규 사전등록 상태 확인",
  date: importedAt,
  followUpDate: "",
  status: "접수됨",
  priority: "높음",
  memo: "수강생 DB에서 등록 상태가 '확인 필요'로 표시되어 상담/등록 확정 여부 확인 필요.",
  assignedTo: "manager-1",
  assignedToName: "조영진",
  statusUpdatedAt: importedAt,
  unreadForAccountIds: ["owner-1", "manager-1"]
}));

export const consultationHistory: ConsultationHistory[] = consultations.map((item, index) => ({
  id: `consult-history-initial-${index + 1}`,
  consultationId: item.id,
  actorId: "manager-1",
  actorName: "조영진",
  action: "create_consultation",
  status: item.status,
  assignedTo: item.assignedTo || "manager-1",
  assignedToName: item.assignedToName || "조영진",
  occurredAt: `${importedAt}T09:${String(10 + index).padStart(2, "0")}:00+09:00`
}));

export const courses: Course[] = [
  { id: "course-precollege", name: "본성 프리컬리지", major: "입시 및 예비 음악가 과정", teacherId: "teacher-kang-eunmi", status: "준비중" },
  { id: "course-artist", name: "본성 아티스트", major: "성인 전문과정, 작품 제작형 교육", teacherId: "teacher-kang-eunmi", status: "운영 예정" },
  { id: "course-vocal-redesign", name: "보컬 리디자인", major: "목소리·호흡·자기표현 회복형 보컬 교육", teacherId: "teacher-kang-eunmi", status: "준비중" },
  { id: "course-project", name: "프로젝트 수업", major: "공연, 녹음, 촬영, 커버 콘텐츠 등 결과물 중심 교육", teacherId: "teacher-kang-eunmi", status: "준비중" },
  { id: "course-liberal-arts", name: "교양교육", major: "생각하는 음악가 양성", teacherId: "teacher-kang-eunmi", status: "준비중" },
  { id: "course-short-goal", name: "단기 목적형 수업", major: "단기 목표 달성을 위한 맞춤 수업", teacherId: "staff-cho-youngjin", status: "준비중" },
  { id: "course-happy-hour", name: "해피아워 클래스", major: "오전 시간대 유휴 공간 활용, 커뮤니티 형성", teacherId: "staff-cho-youngjin", status: "준비중" }
];

export const enrollments: Enrollment[] = [
  { id: "enroll-1", studentId: "student-jang-yunho", courseId: "course-precollege", teacherId: "teacher-unassigned", startDate: "", status: "등록 확정", memo: "Notion 수강생 DB 기준 등록 확정. 실제 프로그램/담당 강사 배정 필요. 화면 기능 확인용 임시 연결값입니다." }
];

export const lessons: Lesson[] = [
  { id: "lesson-1", studentId: "student-jang-yunho", teacherId: "teacher-unassigned", courseId: "course-precollege", startsAt: "2026-08-18T14:00:00+09:00", duration: 60, status: "배정필요", memo: "초기 이관 데이터 점검용 수업. 실제 시간표 확정 전까지 임시값입니다." }
];

export const attendance: Attendance[] = [
  { id: "att-1", lessonId: "lesson-1", studentId: "student-jang-yunho", status: "미처리", makeupNeeded: false, memo: "초기 이관 데이터 점검" }
];

export const lessonNotes: LessonNote[] = [
  { id: "note-1", lessonId: "lesson-1", studentId: "student-jang-yunho", teacherId: "teacher-unassigned", date: "2026-08-18", content: "초기 이관 데이터 확인", homework: "프로그램과 담당 강사 배정 확인", nextGoal: "실제 수업 시작일 입력", practiceRequest: "", internalMemo: "Notion 수강생 DB 기반" }
];

export const rooms: Room[] = [
  { id: "room-1", name: "A Vocal Room", location: "2F", capacity: 2, status: "사용가능" },
  { id: "room-2", name: "B Piano Room", location: "2F", capacity: 2, status: "사용가능" },
  { id: "room-3", name: "C Ensemble Room", location: "B1", capacity: 6, status: "점검중" }
];

export const reservations: Reservation[] = [
  { id: "reserve-1", roomId: "room-1", studentId: "student-jang-yunho", requester: "조영진", startsAt: "2026-08-18T18:00:00+09:00", endsAt: "2026-08-18T19:00:00+09:00", status: "예약", memo: "초기 점검용 예약" }
];

export const payments: Payment[] = rawStudents.map(([slug, name], index) => ({
  id: `payment-initial-${index + 1}`,
  studentId: `student-${slug}`,
  title: "초기 등록 수납 확인",
  amount: 0,
  status: "확인 필요",
  dueDate: "",
  paidAt: "",
  memo: `${name} - Notion 수강생 DB 결제 상태: 확인 필요`
}));

const operatingDocumentRows: Array<[string, string, string, string, number]> = [
  ["opening-checklist", "개원 준비 체크리스트", "개원 준비", "공사, 장비, 강의실, 상담 공간, 홈페이지/SNS 오픈 확인", 1],
  ["student-registration-sheet", "수강생 등록 현황표", "학생 관리", "사전등록생, 기존 수강생, 신규 상담자 통합 관리", 2],
  ["consulting-manual", "상담 프로세스 매뉴얼", "상담/등록", "문의 접수부터 등록까지 표준 절차 정리", 3],
  ["class-room-schedule", "수업 시간표 및 강의실 배정표", "수업 운영", "8월 18일 이후 실제 수업 운영 기준", 4],
  ["teacher-student-assignment", "강사별 담당 학생표", "학생 관리", "담당 강사, 학생 상태, 수업 시작일 정리", 5],
  ["lesson-record-template", "수업 기록 템플릿", "수업 운영", "강사용 피드백 및 과제 기록 양식", 6],
  ["sns-content-calendar", "SNS 콘텐츠 캘린더", "콘텐츠", "초기 30개 콘텐츠 업로드 일정 관리", 7],
  ["homepage-materials", "홈페이지 자료 준비표", "콘텐츠", "강사 소개, 프로그램 설명, FAQ, 상담 신청 자료 정리", 8],
  ["performance-project-sheet", "공연/프로젝트 운영표", "공연/프로젝트", "쇼케이스, 버스킹, 녹음, 촬영 일정 관리", 9],
  ["privacy-content-consent", "개인정보 및 콘텐츠 동의서", "동의/보안", "학생 사진, 영상, 음성 활용 동의 관리", 10]
];

export const tasks: Task[] = [
  {
    id: "task-initial-student-assignment",
    title: "초기 수강생 프로그램·담당 강사 배정",
    assignee: "조영진",
    dueDate: "2026-08-01",
    status: "진행중",
    priority: "높음",
    memo: "수강생 DB에 프로그램, 담당 강사, 요일/시간이 비어 있어 등록 확정자부터 실제 배정 필요."
  },
  ...operatingDocumentRows.map(([slug, title, category, purpose, rank]) => ({
    id: `task-doc-${slug}`,
    title: `운영 문서 작성: ${title}`,
    assignee: "조영진",
    dueDate: "",
    status: "할일",
    priority: rank <= 3 ? "높음" : rank <= 7 ? "보통" : "낮음",
    memo: `[${category}] ${purpose}`
  }))
];

export const workLogs: WorkLog[] = [
  { id: "work-log-1", accountId: "manager-1", accountName: "조영진", workDate: importedAt, clockInAt: `${importedAt}T09:05:00+09:00`, clockOutAt: "", memo: "Notion 초기 운영 자료 선별 반영과 후속 확인 항목 정리" }
];

export const meetings: Meeting[] = [
  { id: "meeting-1", title: "초기 운영 데이터 점검 회의", startsAt: "2026-08-01T10:00:00+09:00", participantNames: ["강은미", "조영진", "황휘현"], status: "예정", memo: "수강생 배정, 상담 흐름, 결제 확인 항목 점검" }
];

const openingScheduleRows: Array<[string, string, string, string[], string]> = [
  ["calendar-opening-interior-complete", "인테리어 공사 종료", "2026-07-28", ["대표", "운영"], "공사 완료 여부, 수업 가능 상태 확인"],
  ["calendar-opening-homepage-complete", "홈페이지 제작 완료", "2026-08-01", ["대표", "콘텐츠"], "주요 페이지 오픈 여부 확인"],
  ["calendar-opening-sns-start", "SNS 업로드 시작", "2026-08-01", ["대표", "콘텐츠"], "초기 콘텐츠 업로드 일정 공유"],
  ["calendar-opening-consulting-start", "신규 수강상담 및 사전등록 시작", "2026-08-01", ["대표", "운영", "강사", "재무"], "상담 프로세스와 등록 양식 준비"],
  ["calendar-opening-academy-ready", "수업 가능 컨디션 원내 정리 완료", "2026-08-15", ["대표", "운영", "강사"], "강의실, 대기공간, 장비 점검"],
  ["calendar-opening-classroom-simulation", "강의실 수업 시뮬레이션", "2026-08-15", ["대표", "운영", "강사"], "동선, 소음, 장비, 시간표 테스트"],
  ["calendar-opening-founding-vocal-start", "파운딩멤버 보컬 수업 시작", "2026-08-18", ["대표", "운영", "강사"], "첫 수업 안내, 출결, 피드백 기록"],
  ["calendar-opening-new-student-class-start", "신규 등록자 수업 시작", "2026-09-01", ["대표", "운영", "강사", "재무"], "신규생 시간표, 담당 강사, 결제 상태 확인"],
  ["calendar-opening-precollege-promotion-start", "프리컬리지 과정 홍보 시작", "2026-09-01", ["대표", "콘텐츠", "강사"], "프로그램 소개 자료와 상담 기준 정리"]
];

export const calendarEvents: CalendarEvent[] = openingScheduleRows.map(([id, title, date, teams, memo]) => ({
  id,
  title,
  date,
  startTime: "",
  targetRoles: teamsToRoles(teams),
  memo: `${memo} / 담당팀: ${teams.join(", ")}`
}));

export const accountRequests: AccountRequest[] = [
  { id: "account-request-1", loginId: "kimtaeji", name: "(신) 김태지", requestedRole: "student", email: "", phone: "", linkedStudentId: "student-kim-taeji-new", message: "Notion 수강생 DB에서 등록 상태가 확인 필요인 신규 수강생입니다. 계정 생성 전 상담/등록 확정 여부 확인이 필요합니다.", status: "대기", reviewedByName: "", reviewedAt: "", reviewMemo: "", createdAccountId: "", createdAt: "2026-07-02T10:10:00+09:00" }
];

export const publicSettings: PublicSettings = {
  loginNotice: "계정 요청 및 패스워드 초기화는 매니저에게 문의 바랍니다.",
  academyPhone: "",
  reservationGuide: "공간 예약은 정각부터 1시간 단위로 신청합니다.",
  updatedAt: "2026-07-02T00:00:00+09:00",
  updatedBy: "owner-1"
};

export const notices: Notice[] = [
  { id: "notice-initial-data", title: "본성 스테이지 초기 운영 데이터 반영", category: "운영공지", author: "강은미", updatedAt: importedAt, body: "직원, 수강생, 프로그램, 개원 일정, 운영 문서 초기 데이터는 Notion '본성뮤직 초기 운영 자료 for Monster Crew'에서 필요한 항목만 선별해 반영했습니다.", targetRoles: ["owner", "manager", "teacher", "student"], pinned: true },
  { id: "notice-student-data-followup", title: "수강생 배정 정보 추가 확인 필요", category: "학생관리", author: "조영진", updatedAt: importedAt, body: "현재 수강생 DB에는 담당 강사, 프로그램, 수업 요일/시간, 보호자 연락처가 비어 있습니다. 실제 운영 전 등록 확정자부터 배정을 완료해야 합니다.", targetRoles: ["owner", "manager", "teacher"], pinned: true }
];

export function byId<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id);
}

export function getTeacherName(id: string) {
  return byId(teachers, id)?.name ?? "미배정";
}

export function getStudentName(id: string) {
  return byId(students, id)?.name ?? "미등록 학생";
}

export function getCourseName(id: string) {
  return byId(courses, id)?.name ?? "미등록 과목";
}

function teamsToRoles(teams: string[]): Role[] {
  const roles = new Set<Role>();
  if (teams.includes("대표")) roles.add("owner");
  if (teams.some((team) => ["운영", "재무", "콘텐츠", "공연"].includes(team))) roles.add("manager");
  if (teams.includes("강사")) roles.add("teacher");
  return Array.from(roles.size ? roles : new Set<Role>(["owner", "manager"]));
}
