"use client";

import { useEffect, useMemo, useState } from "react";
import {
  attendance,
  consultations,
  courses,
  enrollments,
  getCourseName,
  getStudentName,
  getTeacherName,
  guardians,
  lessonNotes,
  lessons,
  notices,
  payments,
  reservations,
  rooms,
  students,
  tasks,
  teachers,
  type Attendance,
  type Consultation,
  type Course,
  type Enrollment,
  type Guardian,
  type Lesson,
  type LessonNote,
  type Notice,
  type Payment,
  type Reservation,
  type Room,
  type Student,
  type Task,
  type Teacher
} from "@/lib/demo-data";
import type { Role } from "@/lib/auth-shared";

const APPS_SCRIPT_ENDPOINT =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT ||
  "https://script.google.com/macros/s/AKfycbzHS-pShTZaY32eZ7X6muatT6Hv0hXUf89dUaQtCaH4gQNcxmdsfZ1X30izje9siAHWVQ/exec";

const SESSION_TOKEN_KEY = "bonsung_session_token";

export type DataSource = "loading" | "live" | "preview" | "fallback";

export type DataQualityIssue = {
  severity: "blocking" | "warning" | "info";
  area: string;
  recordId: string;
  title: string;
  detail: string;
};

export type DataQualityReport = {
  generatedAt: string;
  summary: {
    totalIssues: number;
    blocking: number;
    warning: number;
    info: number;
    checkedSheets: string[];
    checkedRecords: number;
  };
  issues: DataQualityIssue[];
};

export type OperationsData = {
  teachers: Teacher[];
  students: Student[];
  guardians: Guardian[];
  consultations: Consultation[];
  courses: Course[];
  enrollments: Enrollment[];
  lessons: Lesson[];
  attendance: Attendance[];
  lessonNotes: LessonNote[];
  rooms: Room[];
  reservations: Reservation[];
  payments: Payment[];
  tasks: Task[];
  notices: Notice[];
  overview?: LiveOverview;
};

type LiveOverview = {
  stats?: Record<string, number>;
  todayLessons?: LiveRecord[];
  recentLogs?: LiveRecord[];
  workload?: LiveRecord[];
};

type LiveRecord = Record<string, unknown>;

type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type BootstrapPayload = {
  user?: LiveRecord;
  students?: LiveRecord[];
  enrollments?: LiveRecord[];
  lessons?: LiveRecord[];
  overview?: LiveOverview;
  registrations?: LiveRecord[];
  rooms?: LiveRecord[];
  reservations?: LiveRecord[];
  tasks?: LiveRecord[];
  consultations?: LiveRecord[];
  notices?: LiveRecord[];
  calendar?: LiveRecord[];
  classTypes?: LiveRecord[];
  capabilities?: Record<string, boolean>;
};

export type OperationsState = {
  source: DataSource;
  data: OperationsData;
  error: string;
  hasLiveSession: boolean;
  endpoint: string;
};

export type DataQualityState = {
  source: DataSource;
  report: DataQualityReport | null;
  error: string;
  hasLiveSession: boolean;
  endpoint: string;
};

export type OperationActionState = {
  pending: boolean;
  error: string;
  hasLiveSession: boolean;
  endpoint: string;
  run: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
};

export function useOperationAction(): OperationActionState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run<T>(action: string, payload: Record<string, unknown> = {}) {
    const token = window.localStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      const message = "실사용 저장은 Apps Script 로그인 세션이 필요합니다. 현재 화면은 기능 점검용 preview 모드입니다.";
      setError(message);
      throw new Error(message);
    }

    setPending(true);
    setError("");
    try {
      return await callAppsScript<T>(action, token, payload);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      throw new Error(message);
    } finally {
      setPending(false);
    }
  }

  return {
    pending,
    error,
    hasLiveSession: typeof window !== "undefined" && Boolean(window.localStorage.getItem(SESSION_TOKEN_KEY)),
    endpoint: APPS_SCRIPT_ENDPOINT,
    run
  };
}

export function useOperationsData(role: Role | null): OperationsState {
  const previewData = useMemo(() => buildPreviewData(role), [role]);
  const [state, setState] = useState<OperationsState>({
    source: "loading",
    data: previewData,
    error: "",
    hasLiveSession: false,
    endpoint: APPS_SCRIPT_ENDPOINT
  });

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem(SESSION_TOKEN_KEY);

    if (!token) {
      queueMicrotask(() => {
        if (!active) return;
        setState({
          source: "preview",
          data: previewData,
          error: "",
          hasLiveSession: false,
          endpoint: APPS_SCRIPT_ENDPOINT
        });
      });
      return () => {
        active = false;
      };
    }

    queueMicrotask(() => {
      if (!active) return;
      setState((current) => ({
        ...current,
        source: "loading",
        data: previewData,
        error: "",
        hasLiveSession: true
      }));
    });

    callAppsScript<BootstrapPayload>("bootstrap", token)
      .then((payload) => {
        if (!active) return;
        setState({
          source: "live",
          data: normalizeBootstrap(payload, role),
          error: "",
          hasLiveSession: true,
          endpoint: APPS_SCRIPT_ENDPOINT
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          source: "fallback",
          data: previewData,
          error: error instanceof Error ? error.message : String(error),
          hasLiveSession: true,
          endpoint: APPS_SCRIPT_ENDPOINT
        });
      });

    return () => {
      active = false;
    };
  }, [previewData, role]);

  return state;
}


export function useDataQualityReport(): DataQualityState {
  const [state, setState] = useState<DataQualityState>({ source: "loading", report: null, error: "", hasLiveSession: false, endpoint: APPS_SCRIPT_ENDPOINT });

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem(SESSION_TOKEN_KEY);

    if (!token) {
      queueMicrotask(() => {
        if (!active) return;
        setState({ source: "preview", report: null, error: "", hasLiveSession: false, endpoint: APPS_SCRIPT_ENDPOINT });
      });
      return () => { active = false; };
    }

    callAppsScript<DataQualityReport>("getDataQualityReport", token)
      .then((report) => {
        if (!active) return;
        setState({ source: "live", report, error: "", hasLiveSession: true, endpoint: APPS_SCRIPT_ENDPOINT });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ source: "fallback", report: null, error: error instanceof Error ? error.message : String(error), hasLiveSession: true, endpoint: APPS_SCRIPT_ENDPOINT });
      });

    return () => { active = false; };
  }, []);

  return state;
}

async function callAppsScript<T>(action: string, token: string, payload: Record<string, unknown> = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(APPS_SCRIPT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token, ...payload }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Apps Script 응답 오류 (${response.status})`);
    }

    const result = (await response.json()) as ApiResult<T>;
    if (!result.ok) {
      throw new Error(result.error || "Apps Script 요청을 처리하지 못했습니다.");
    }

    return result.data as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function buildPreviewData(role: Role | null): OperationsData {
  const visibleStudents = role === "teacher" ? students.filter((student) => student.teacherId === "teacher-1") : students;
  const visibleLessons = role === "teacher" ? lessons.filter((lesson) => lesson.teacherId === "teacher-1") : lessons;
  const visibleEnrollments = role === "teacher" ? enrollments.filter((item) => item.teacherId === "teacher-1") : enrollments;
  const visibleNotes = role === "teacher" ? lessonNotes.filter((note) => note.teacherId === "teacher-1") : lessonNotes;

  return {
    teachers,
    students: visibleStudents,
    guardians,
    consultations,
    courses,
    enrollments: visibleEnrollments,
    lessons: visibleLessons,
    attendance,
    lessonNotes: visibleNotes,
    rooms,
    reservations,
    payments: role === "teacher" ? [] : payments,
    tasks,
    notices
  };
}

function normalizeBootstrap(payload: BootstrapPayload, role: Role | null): OperationsData {
  const liveStudents = (payload.students ?? []).map(mapStudent);
  const liveEnrollments = (payload.enrollments ?? []).map(mapEnrollment);
  const liveLessons = (payload.lessons ?? payload.overview?.todayLessons ?? []).map(mapLesson);
  const livePayments = role === "teacher" ? [] : (payload.registrations ?? []).map(mapPayment);
  const liveRooms = (payload.rooms ?? []).map(mapRoom);
  const liveReservations = (payload.reservations ?? []).map(mapReservation);
  const liveTasks = (payload.tasks ?? []).map(mapTask);
  const liveConsultations = (payload.consultations ?? []).map(mapConsultation);
  const liveNotices = (payload.notices ?? []).map(mapNotice);
  const liveLessonNotes = (payload.overview?.recentLogs ?? []).map(mapLessonNote);
  const liveAttendance = buildLiveAttendance(liveLessons, liveLessonNotes);
  const liveTeachers = uniqueTeachers(liveEnrollments, liveLessons, liveLessonNotes);

  return {
    teachers: liveTeachers.length ? liveTeachers : teachers,
    students: liveStudents.length ? liveStudents : buildPreviewData(role).students,
    guardians,
    consultations: liveConsultations.length ? liveConsultations : consultations,
    courses,
    enrollments: liveEnrollments,
    lessons: liveLessons,
    attendance: liveAttendance.length ? liveAttendance : attendance,
    lessonNotes: liveLessonNotes,
    rooms: liveRooms.length ? liveRooms : rooms,
    reservations: liveReservations,
    payments: livePayments,
    tasks: liveTasks.length ? liveTasks : tasks,
    notices: liveNotices.length ? liveNotices : notices,
    overview: payload.overview
  };
}

function mapStudent(item: LiveRecord): Student {
  return {
    id: stringValue(item.student_id),
    name: stringValue(item.name, "이름 없음"),
    birthDate: stringValue(item.birth_date),
    phone: stringValue(item.phone),
    major: stringValue(item.major),
    goal: stringValue(item.goal),
    status: normalizeStudentStatus(stringValue(item.status)),
    enrolledAt: stringValue(item.enrolled_at || item.created_at),
    memo: stringValue(item.memo),
    teacherId: stringValue(item.teacher_id),
    teacherName: stringValue(item.teacher_name)
  };
}

function mapEnrollment(item: LiveRecord): Enrollment {
  return {
    id: stringValue(item.enrollment_id),
    studentId: stringValue(item.student_id),
    courseId: stringValue(item.class_type_id || item.subject),
    teacherId: stringValue(item.teacher_id),
    startDate: stringValue(item.start_date),
    status: enrollmentStatus(stringValue(item.status)),
    memo: [item.weekly_day, item.start_time, item.room].filter(Boolean).join(" · "),
    studentName: stringValue(item.student_name),
    teacherName: stringValue(item.teacher_name)
  };
}

function mapLesson(item: LiveRecord): Lesson {
  const lessonDate = stringValue(item.lesson_date || item.date);
  const startTime = stringValue(item.start_time);
  return {
    id: stringValue(item.lesson_id),
    studentId: stringValue(item.student_id),
    teacherId: stringValue(item.teacher_id),
    courseId: stringValue(item.subject),
    startsAt: lessonDate && startTime ? `${lessonDate}T${startTime}:00+09:00` : lessonDate,
    duration: numberValue(item.duration_minutes, 60),
    status: stringValue(item.status, "예정"),
    memo: stringValue(item.room),
    studentName: stringValue(item.student_name),
    teacherName: stringValue(item.teacher_name),
    subject: stringValue(item.subject)
  };
}

function mapLessonNote(item: LiveRecord): LessonNote {
  return {
    id: stringValue(item.log_id),
    lessonId: stringValue(item.lesson_id),
    studentId: stringValue(item.student_id),
    teacherId: stringValue(item.teacher_id),
    date: stringValue(item.lesson_date || item.created_at),
    content: stringValue(item.content || item.lesson_content),
    homework: stringValue(item.homework),
    nextGoal: stringValue(item.next_goal),
    practiceRequest: stringValue(item.practice_request),
    internalMemo: stringValue(item.internal_memo),
    studentName: stringValue(item.student_name),
    teacherName: stringValue(item.teacher_name)
  };
}

function mapRoom(item: LiveRecord): Room {
  return {
    id: stringValue(item.room_id),
    name: stringValue(item.name, "공간 이름 없음"),
    location: roomTypeLabel(stringValue(item.room_type)),
    capacity: numberValue(item.capacity, 1),
    status: truthyValue(item.active) ? "사용 가능" : "비활성"
  };
}

function mapReservation(item: LiveRecord): Reservation {
  const reservationDate = stringValue(item.reservation_date);
  const startTime = stringValue(item.start_time);
  const endTime = stringValue(item.end_time);
  return {
    id: stringValue(item.reservation_id),
    roomId: stringValue(item.room_id),
    studentId: stringValue(item.reserved_by),
    requester: stringValue(item.reserved_by_name || item.reserved_by),
    startsAt: reservationDate && startTime ? `${reservationDate}T${startTime}:00+09:00` : reservationDate,
    endsAt: reservationDate && endTime ? `${reservationDate}T${endTime}:00+09:00` : reservationDate,
    status: stringValue(item.status, "확인 필요"),
    memo: [item.purpose, item.memo].filter(Boolean).join(" · "),
    studentName: stringValue(item.reserved_by_name),
    roomName: stringValue(item.room_name)
  };
}
function mapPayment(item: LiveRecord): Payment {
  return {
    id: stringValue(item.registration_id),
    studentId: stringValue(item.student_id),
    title: stringValue(item.program_name || item.subject || "등록·결제"),
    amount: numberValue(item.amount, 0),
    status: stringValue(item.payment_status, "확인 필요"),
    dueDate: stringValue(item.next_due_date || item.period_start),
    paidAt: stringValue(item.paid_at),
    memo: stringValue(item.memo),
    studentName: stringValue(item.student_name)
  };
}

function mapTask(item: LiveRecord): Task {
  return {
    id: stringValue(item.task_id),
    title: stringValue(item.title, "업무명 없음"),
    assignee: stringValue(item.assignee_name || item.assignee_id),
    dueDate: stringValue(item.due_date),
    status: stringValue(item.status, "할일"),
    priority: stringValue(item.priority, "보통"),
    memo: stringValue(item.memo)
  };
}

function mapConsultation(item: LiveRecord): Consultation {
  return {
    id: stringValue(item.consultation_id),
    studentName: stringValue(item.student_name),
    guardianName: stringValue(item.guardian_name),
    phone: stringValue(item.phone),
    channel: stringValue(item.channel, "전화"),
    major: stringValue(item.major, "보컬"),
    goal: stringValue(item.goal),
    date: stringValue(item.consultation_date || item.created_at),
    followUpDate: stringValue(item.follow_up_date),
    status: stringValue(item.status, "신규문의"),
    priority: stringValue(item.priority, "보통"),
    memo: stringValue(item.memo)
  };
}

function mapNotice(item: LiveRecord): Notice {
  return {
    id: stringValue(item.notice_id),
    title: stringValue(item.title, "제목 없음"),
    category: stringValue(item.category, "공지"),
    author: stringValue(item.author_name || item.author_id),
    updatedAt: stringValue(item.updated_at || item.created_at),
    body: stringValue(item.body)
  };
}

function buildLiveAttendance(liveLessons: Lesson[], liveNotes: LessonNote[]): Attendance[] {
  return liveLessons.map((lesson) => {
    const note = liveNotes.find((item) => item.lessonId === lesson.id || (item.studentId === lesson.studentId && item.teacherId === lesson.teacherId && item.date === lesson.startsAt.slice(0, 10)));
    const status = attendanceStatus(lesson, note);
    return {
      id: `att-${lesson.id}`,
      lessonId: lesson.id,
      studentId: lesson.studentId,
      status,
      makeupNeeded: ["결석", "취소", "보강예정"].includes(status),
      memo: note?.content || lesson.memo || "-"
    };
  });
}

function attendanceStatus(lesson: Lesson, note?: LessonNote) {
  if (note) return "출석";
  if (["완료", "출석", "지각", "결석", "취소", "보강예정"].includes(lesson.status)) return lesson.status;
  return "미처리";
}
function uniqueTeachers(...groups: Array<Array<Enrollment | Lesson | LessonNote>>) {
  const map = new Map<string, Teacher>();
  groups.flat().forEach((item) => {
    const id = "teacherId" in item ? item.teacherId : "";
    const name = "teacherName" in item ? item.teacherName : "";
    if (id && name) map.set(id, { id, name, major: "" });
  });
  return Array.from(map.values());
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function truthyValue(value: unknown) {
  return value === true || value === "true" || value === "TRUE" || value === "1" || value === 1;
}

function roomTypeLabel(value: string) {
  if (value === "lesson") return "레슨실";
  if (value === "practice") return "연습실";
  return value || "공간";
}

function normalizeStudentStatus(value: string): Student["status"] {
  if (["상담중", "등록대기", "재원", "휴원", "퇴원"].includes(value)) return value as Student["status"];
  if (value === "active") return "재원";
  if (value === "pending") return "등록대기";
  return "상담중";
}

function enrollmentStatus(value: string) {
  const labels: Record<string, string> = {
    active: "수강중",
    paused: "휴원",
    completed: "종료",
    canceled: "취소"
  };
  return labels[value] ?? value;
}

export function studentName(data: OperationsData, id: string) {
  return data.students.find((student) => student.id === id)?.name || getStudentName(id);
}

export function teacherName(data: OperationsData, id: string) {
  return data.teachers.find((teacher) => teacher.id === id)?.name || getTeacherName(id);
}

export function courseName(data: OperationsData, id: string) {
  return data.courses.find((course) => course.id === id)?.name || getCourseName(id) || id;
}

export function roomName(data: OperationsData, id: string) {
  return data.rooms.find((room) => room.id === id)?.name || id;
}
