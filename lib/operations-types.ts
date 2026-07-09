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

export function byId<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id);
}
