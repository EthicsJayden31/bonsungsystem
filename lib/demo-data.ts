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

export const teachers: Teacher[] = [
  { id: "teacher-1", name: "강사 계정", major: "보컬" },
  { id: "teacher-2", name: "김건반", major: "피아노" },
  { id: "teacher-3", name: "박드럼", major: "드럼" }
];

export const students: Student[] = [
  {
    id: "student-1",
    name: "이도윤",
    birthDate: "2007-04-12",
    phone: "010-1111-2222",
    major: "보컬",
    goal: "입시 보컬 기초 완성",
    status: "재원",
    enrolledAt: "2026-06-01",
    memo: "피치 안정화와 리듬 훈련 필요",
    teacherId: "teacher-1"
  },
  {
    id: "student-2",
    name: "최서연",
    birthDate: "2009-09-21",
    phone: "010-3333-4444",
    major: "피아노",
    goal: "재즈 화성 기초",
    status: "등록대기",
    enrolledAt: "",
    memo: "보호자와 시간 조율 중",
    teacherId: "teacher-2"
  },
  {
    id: "student-3",
    name: "문하준",
    birthDate: "2006-12-02",
    phone: "010-5555-6666",
    major: "드럼",
    goal: "실용음악과 정시 대비",
    status: "상담중",
    enrolledAt: "",
    memo: "주 2회 가능 여부 확인",
    teacherId: "teacher-3"
  }
];

export const guardians: Guardian[] = [
  { id: "guardian-1", studentId: "student-1", name: "이도윤 모", relation: "모", phone: "010-7777-1111", payer: true, emergency: true, memo: "납부 안내 문자 선호" },
  { id: "guardian-2", studentId: "student-2", name: "최서연 부", relation: "부", phone: "010-7777-2222", payer: true, emergency: false, memo: "평일 오후 통화 가능" },
  { id: "guardian-3", studentId: "student-3", name: "문하준 모", relation: "모", phone: "010-7777-3333", payer: false, emergency: true, memo: "상담 후 등록 결정" }
];

export const consultations: Consultation[] = [
  { id: "consult-0", studentId: "student-1", studentName: "이도윤", guardianName: "", phone: "", channel: "시스템", major: "보컬", goal: "상담요청", date: "2026-06-07", followUpDate: "", status: "접수됨", priority: "보통", memo: "다음 달 레슨 시간 변경 가능 여부를 확인하고 싶습니다.", assignedTo: "manager-1", assignedToName: "매니저 계정", statusUpdatedAt: "2026-06-07" },
  { id: "consult-1", studentId: "student-3", studentName: "문하준", guardianName: "문하준 모", phone: "010-7777-3333", channel: "네이버", major: "드럼", goal: "입시", date: "2026-06-07", followUpDate: "2026-06-09", status: "전달 필요", priority: "높음", memo: "정시반 커리큘럼 안내 필요", assignedTo: "teacher-3", assignedToName: "박드럼", statusUpdatedAt: "2026-06-07" },
  { id: "consult-2", studentId: "student-2", studentName: "최서연", guardianName: "최서연 부", phone: "010-7777-2222", channel: "지인추천", major: "피아노", goal: "취미/전공 탐색", date: "2026-06-05", followUpDate: "2026-06-08", status: "종결", priority: "보통", memo: "첫 레슨 19시 후보", assignedTo: "manager-1", assignedToName: "매니저 계정", statusUpdatedAt: "2026-06-08" }
];

export const consultationHistory: ConsultationHistory[] = [
  { id: "consult-history-1", consultationId: "consult-0", actorId: "manager-1", actorName: "매니저 계정", action: "create_consultation", status: "접수됨", assignedTo: "manager-1", assignedToName: "매니저 계정", occurredAt: "2026-06-07T09:30:00+09:00" },
  { id: "consult-history-2", consultationId: "consult-1", actorId: "manager-1", actorName: "매니저 계정", action: "update_consultation_status", status: "전달 필요", assignedTo: "teacher-3", assignedToName: "박드럼", occurredAt: "2026-06-07T11:10:00+09:00" },
  { id: "consult-history-3", consultationId: "consult-2", actorId: "owner-1", actorName: "대표 계정", action: "update_consultation_status", status: "종결", assignedTo: "manager-1", assignedToName: "매니저 계정", occurredAt: "2026-06-08T18:20:00+09:00" }
];

export const courses: Course[] = [
  { id: "course-1", name: "보컬 개인레슨", major: "보컬", teacherId: "teacher-1", status: "운영중" },
  { id: "course-2", name: "재즈피아노", major: "피아노", teacherId: "teacher-2", status: "운영중" },
  { id: "course-3", name: "드럼 입시반", major: "드럼", teacherId: "teacher-3", status: "모집중" }
];

export const enrollments: Enrollment[] = [
  { id: "enroll-1", studentId: "student-1", courseId: "course-1", teacherId: "teacher-1", startDate: "2026-06-01", status: "수강중", memo: "주 1회 60분" },
  { id: "enroll-2", studentId: "student-2", courseId: "course-2", teacherId: "teacher-2", startDate: "2026-06-10", status: "등록대기", memo: "첫 수업 전 교재 안내" }
];

export const lessons: Lesson[] = [
  { id: "lesson-1", studentId: "student-1", teacherId: "teacher-1", courseId: "course-1", startsAt: "2026-06-07T14:00:00+09:00", duration: 60, status: "예정", memo: "피치/발성 체크" },
  { id: "lesson-2", studentId: "student-2", teacherId: "teacher-2", courseId: "course-2", startsAt: "2026-06-07T17:00:00+09:00", duration: 50, status: "예정", memo: "레벨 테스트" },
  { id: "lesson-3", studentId: "student-1", teacherId: "teacher-1", courseId: "course-1", startsAt: "2026-06-05T14:00:00+09:00", duration: 60, status: "완료", memo: "출석 처리 완료" }
];

export const attendance: Attendance[] = [
  { id: "att-1", lessonId: "lesson-3", studentId: "student-1", status: "출석", makeupNeeded: false, memo: "정상 출석" },
  { id: "att-2", lessonId: "lesson-2", studentId: "student-2", status: "미처리", makeupNeeded: false, memo: "오늘 처리 필요" }
];

export const lessonNotes: LessonNote[] = [
  { id: "note-1", lessonId: "lesson-3", studentId: "student-1", teacherId: "teacher-1", date: "2026-06-05", content: "복식호흡과 기본 스케일 진행", homework: "메트로놈 70bpm 스케일", nextGoal: "고음 연결 안정화", practiceRequest: "매일 20분 녹음", internalMemo: "긴장 시 박자 빨라짐" }
];

export const rooms: Room[] = [
  { id: "room-1", name: "A 보컬룸", location: "2층", capacity: 2, status: "사용가능" },
  { id: "room-2", name: "B 피아노룸", location: "2층", capacity: 2, status: "사용가능" },
  { id: "room-3", name: "C 합주실", location: "지하", capacity: 6, status: "점검중" }
];

export const reservations: Reservation[] = [
  { id: "reserve-1", roomId: "room-1", studentId: "student-1", requester: "매니저 계정", startsAt: "2026-06-07T18:00:00+09:00", endsAt: "2026-06-07T19:00:00+09:00", status: "예약", memo: "수업 후 연습" },
  { id: "reserve-2", roomId: "room-2", studentId: "student-2", requester: "최서연 부", startsAt: "2026-06-08T16:00:00+09:00", endsAt: "2026-06-08T17:00:00+09:00", status: "예약", memo: "" }
];

export const payments: Payment[] = [
  { id: "payment-1", studentId: "student-1", title: "6월 보컬 개인레슨", amount: 280000, status: "청구완료", dueDate: "2026-06-10", paidAt: "", memo: "보호자 확인 필요" },
  { id: "payment-2", studentId: "student-2", title: "입회비", amount: 50000, status: "미납", dueDate: "2026-06-08", paidAt: "", memo: "등록 확정 후 납부" }
];

export const tasks: Task[] = [
  { id: "task-1", title: "개원 상담 명단 정리", assignee: "매니저 계정", dueDate: "2026-06-08", status: "진행중", priority: "높음", memo: "문의 경로별 분류" },
  { id: "task-2", title: "강사 매뉴얼 초안 검토", assignee: "대표 계정", dueDate: "2026-06-12", status: "할일", priority: "보통", memo: "출석/보강 기준 포함" }
];

export const notices: Notice[] = [
  { id: "notice-1", title: "개원 초기 상담 응대 기준", category: "운영규정", author: "대표 계정", updatedAt: "2026-06-06", body: "상담요청은 매니저가 먼저 확인한 뒤 필요한 담당자에게 공유합니다.", targetRoles: ["owner", "manager", "teacher", "student"], pinned: true },
  { id: "notice-2", title: "강사 레슨노트 작성 기준", category: "강사매뉴얼", author: "매니저 계정", updatedAt: "2026-06-05", body: "수업 당일 수업 내용, 과제, 다음 목표를 기록합니다.", targetRoles: ["owner", "manager", "teacher"], pinned: false }
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
