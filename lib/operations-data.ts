"use client";

import { useEffect, useMemo, useState } from "react";
import {
  attendance,
  consultations,
  consultationHistory,
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
  accountRequests,
  calendarEvents,
  meetings,
  publicSettings,
  reservations,
  rooms,
  students,
  tasks,
  teachers,
  workLogs,
  type AccountRequest,
  type Attendance,
  type CalendarEvent,
  type Consultation,
  type ConsultationHistory,
  type Course,
  type Enrollment,
  type Guardian,
  type Lesson,
  type LessonNote,
  type Notice,
  type Payment,
  type PublicSettings,
  type Reservation,
  type Room,
  type Student,
  type Task,
  type Teacher,
  type Meeting,
  type WorkLog
} from "@/lib/demo-data";
import { normalizeRole, type Role } from "@/lib/auth-shared";
import { canAccessVersion3Area, hasVersion3Permission, type AccessUser } from "@/lib/access-policy";
import { APPS_SCRIPT_ENDPOINT, APPS_SCRIPT_SESSION_TOKEN_KEY } from "@/lib/apps-script-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { VERSION3_TEST_DATA_CHANGE_EVENT, hasVersion3TestSession, readVersion3TestData, runVersion3TestAction } from "@/lib/version3-test-mode";
import { normalizeConsultationStatus, type Version3AuditLog, type Version3DashboardWorkItem, type Version3DashboardWorkPriority, type Version3DashboardWorkTone } from "@/lib/version3-server-contract";
import { callVersion3Server, hasVersion3ServerSession, version3ServerEndpoint } from "@/lib/version3-server-client";
import { ENABLE_APPS_SCRIPT_TRANSITION, ENABLE_PREVIEW_LOGIN } from "@/lib/version3-runtime-flags";

const SESSION_TOKEN_KEY = APPS_SCRIPT_SESSION_TOKEN_KEY;

export type DataSource = "loading" | "server" | "live" | "test" | "preview" | "fallback";

export type DataQualityIssue = {
  severity: "blocking" | "warning" | "info";
  area: string;
  recordId: string;
  title: string;
  detail: string;
};

export type DataQualityCheck = {
  id: string;
  label: string;
  status: "good" | "warn" | "danger" | "info";
  count: number;
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
    accounts?: number;
    students?: number;
    auditLogs?: number;
    brokenReferences?: number;
    openConsultations?: number;
    studentsWithoutAccounts?: number;
    backupEnabled?: boolean;
  };
  checks: DataQualityCheck[];
  issues: DataQualityIssue[];
};

export type OperationsData = {
  teachers: Teacher[];
  students: Student[];
  guardians: Guardian[];
  consultations: Consultation[];
  consultationHistory: ConsultationHistory[];
  courses: Course[];
  enrollments: Enrollment[];
  lessons: Lesson[];
  attendance: Attendance[];
  lessonNotes: LessonNote[];
  rooms: Room[];
  reservations: Reservation[];
  payments: Payment[];
  tasks: Task[];
  workLogs: WorkLog[];
  meetings: Meeting[];
  calendarEvents: CalendarEvent[];
  accountRequests: AccountRequest[];
  publicSettings: PublicSettings;
  notices: Notice[];
  dashboardWorkQueue?: Version3DashboardWorkItem[];
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
  teachers?: LiveRecord[];
  students?: LiveRecord[];
  guardians?: LiveRecord[];
  courses?: LiveRecord[];
  enrollments?: LiveRecord[];
  lessons?: LiveRecord[];
  attendance?: LiveRecord[];
  lessonNotes?: LiveRecord[];
  overview?: LiveOverview;
  registrations?: LiveRecord[];
  rooms?: LiveRecord[];
  reservations?: LiveRecord[];
  tasks?: LiveRecord[];
  workLogs?: LiveRecord[];
  meetings?: LiveRecord[];
  calendarEvents?: LiveRecord[];
  accountRequests?: LiveRecord[];
  publicSettings?: LiveRecord;
  consultations?: LiveRecord[];
  consultationHistory?: LiveRecord[];
  dashboardWorkQueue?: LiveRecord[];
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

const emptyOperationsData: OperationsData = {
  teachers: [],
  students: [],
  guardians: [],
  consultations: [],
  consultationHistory: [],
  courses: [],
  enrollments: [],
  lessons: [],
  attendance: [],
  lessonNotes: [],
  rooms: [],
  reservations: [],
  payments: [],
  tasks: [],
  workLogs: [],
  meetings: [],
  calendarEvents: [],
  accountRequests: [],
  publicSettings: {
    loginNotice: "",
    academyPhone: "",
    reservationGuide: "",
    updatedAt: "",
    updatedBy: ""
  },
  notices: []
};

export type AuditLogsState = {
  source: DataSource;
  logs: Version3AuditLog[];
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
    if (hasVersion3TestSession()) {
      setPending(true);
      setError("");
      try {
        return await runVersion3TestAction<T>(action, payload);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(message);
        throw new Error(message);
      } finally {
        setPending(false);
      }
    }

    if (hasVersion3ServerSession()) {
      setPending(true);
      setError("");
      try {
        return await callVersion3Server<T>(`/actions/${encodeURIComponent(action)}`, { method: "POST", body: payload });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(message);
        throw new Error(message);
      } finally {
        setPending(false);
      }
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(SESSION_TOKEN_KEY) : "";
    if (!token) {
      const message = "실사용 저장은 Version.3 서버 로그인 세션이 필요합니다.";
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
    hasLiveSession: typeof window !== "undefined" && (hasVersion3TestSession() || hasVersion3ServerSession() || (ENABLE_APPS_SCRIPT_TRANSITION && Boolean(window.localStorage.getItem(SESSION_TOKEN_KEY)))),
    endpoint: hasVersion3TestSession() ? "localStorage:version3-test" : hasVersion3ServerSession() ? version3ServerEndpoint() : APPS_SCRIPT_ENDPOINT,
    run
  };
}

export function useOperationsData(role: Role | null): OperationsState {
  const currentUser = useCurrentUser();
  const accessUser = currentUser ?? role;
  const previewData = useMemo(() => filterOperationsData(buildPreviewData(role), accessUser), [accessUser, role]);
  const fallbackData = ENABLE_PREVIEW_LOGIN ? previewData : emptyOperationsData;
  const [state, setState] = useState<OperationsState>({
    source: "loading",
    data: fallbackData,
    error: "",
    hasLiveSession: false,
    endpoint: APPS_SCRIPT_ENDPOINT
  });

  useEffect(() => {
    let active = true;
    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(SESSION_TOKEN_KEY) : "";
    if (hasVersion3TestSession()) {
      const setTestState = () => {
        if (!active) return;
        setState({
          source: "test",
          data: filterOperationsData(readVersion3TestData(), accessUser),
          error: "",
          hasLiveSession: true,
          endpoint: "localStorage:version3-test"
        });
      };
      queueMicrotask(setTestState);
      window.addEventListener(VERSION3_TEST_DATA_CHANGE_EVENT, setTestState);
      return () => {
        active = false;
        window.removeEventListener(VERSION3_TEST_DATA_CHANGE_EVENT, setTestState);
      };
    }

    if (hasVersion3ServerSession()) {
      queueMicrotask(() => {
        if (!active) return;
        setState((current) => ({
          ...current,
          source: "loading",
          data: fallbackData,
          error: "",
          hasLiveSession: true,
          endpoint: version3ServerEndpoint()
        }));
      });

      callVersion3Server<BootstrapPayload>("/bootstrap")
        .then((payload) => {
          if (!active) return;
          setState({
            source: "server",
            data: filterOperationsData(normalizeBootstrap(payload, role), accessUser),
            error: "",
            hasLiveSession: true,
            endpoint: version3ServerEndpoint()
          });
        })
        .catch((error: unknown) => {
          if (!active) return;
          setState({
            source: "fallback",
            data: fallbackData,
            error: error instanceof Error ? error.message : String(error),
            hasLiveSession: true,
            endpoint: version3ServerEndpoint()
          });
        });

      return () => {
        active = false;
      };
    }

    if (!token) {
      queueMicrotask(() => {
        if (!active) return;
        setState({
          source: ENABLE_PREVIEW_LOGIN ? "preview" : "fallback",
          data: fallbackData,
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
        data: fallbackData,
        error: "",
        hasLiveSession: true
      }));
    });

    callAppsScript<BootstrapPayload>("bootstrap", token)
      .then((payload) => {
        if (!active) return;
        setState({
          source: "live",
          data: filterOperationsData(normalizeBootstrap(payload, role), accessUser),
          error: "",
          hasLiveSession: true,
          endpoint: APPS_SCRIPT_ENDPOINT
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          source: "fallback",
          data: fallbackData,
          error: error instanceof Error ? error.message : String(error),
          hasLiveSession: true,
          endpoint: APPS_SCRIPT_ENDPOINT
        });
      });

    return () => {
      active = false;
    };
  }, [accessUser, fallbackData, previewData, role]);

  return state;
}


export function useDataQualityReport(): DataQualityState {
  const [state, setState] = useState<DataQualityState>({ source: "loading", report: null, error: "", hasLiveSession: false, endpoint: APPS_SCRIPT_ENDPOINT });

  useEffect(() => {
    let active = true;
    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(SESSION_TOKEN_KEY) : "";
    if (hasVersion3TestSession()) {
      queueMicrotask(() => {
        if (!active) return;
        const data = readVersion3TestData();
        setState({
          source: "test",
          report: {
            generatedAt: new Date().toISOString(),
            summary: {
              totalIssues: 0,
              blocking: 0,
              warning: 0,
              info: 0,
              checkedSheets: ["localStorage"],
              checkedRecords: data.students.length + data.accounts.length + data.auditLogs.length,
              accounts: data.accounts.length,
              students: data.students.length,
              auditLogs: data.auditLogs.length,
              backupEnabled: true
            },
            checks: [],
            issues: []
          },
          error: "",
          hasLiveSession: true,
          endpoint: "localStorage:version3-test"
        });
      });
      return () => { active = false; };
    }

    if (hasVersion3ServerSession()) {
      callVersion3Server<DataQualityReport>("/data-quality")
        .then((report) => {
          if (!active) return;
          setState({ source: "server", report: normalizeDataQualityReport(report), error: "", hasLiveSession: true, endpoint: version3ServerEndpoint() });
        })
        .catch((error: unknown) => {
          if (!active) return;
          setState({ source: "fallback", report: null, error: error instanceof Error ? error.message : String(error), hasLiveSession: true, endpoint: version3ServerEndpoint() });
        });

      return () => { active = false; };
    }

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
        setState({ source: "live", report: normalizeDataQualityReport(report), error: "", hasLiveSession: true, endpoint: APPS_SCRIPT_ENDPOINT });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ source: "fallback", report: null, error: error instanceof Error ? error.message : String(error), hasLiveSession: true, endpoint: APPS_SCRIPT_ENDPOINT });
      });

    return () => { active = false; };
  }, []);

  return state;
}

export function useAuditLogs(): AuditLogsState {
  const [state, setState] = useState<AuditLogsState>({ source: "loading", logs: [], error: "", hasLiveSession: false, endpoint: APPS_SCRIPT_ENDPOINT });

  useEffect(() => {
    let active = true;
    if (hasVersion3TestSession()) {
      const setTestLogs = () => {
        if (!active) return;
        setState({ source: "test", logs: readVersion3TestData().auditLogs, error: "", hasLiveSession: true, endpoint: "localStorage:version3-test" });
      };
      queueMicrotask(setTestLogs);
      window.addEventListener(VERSION3_TEST_DATA_CHANGE_EVENT, setTestLogs);
      return () => {
        active = false;
        window.removeEventListener(VERSION3_TEST_DATA_CHANGE_EVENT, setTestLogs);
      };
    }

    if (hasVersion3ServerSession()) {
      callVersion3Server<Version3AuditLog[]>("/audit-logs")
        .then((logs) => {
          if (!active) return;
          setState({ source: "server", logs, error: "", hasLiveSession: true, endpoint: version3ServerEndpoint() });
        })
        .catch((error: unknown) => {
          if (!active) return;
          setState({ source: "fallback", logs: [], error: error instanceof Error ? error.message : String(error), hasLiveSession: true, endpoint: version3ServerEndpoint() });
        });

      return () => { active = false; };
    }

    queueMicrotask(() => {
      if (!active) return;
      const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(SESSION_TOKEN_KEY) : "";
      setState({
        source: token ? "live" : "preview",
        logs: [],
        error: token ? "감사 로그는 Version.3 별도 서버 세션에서 확인합니다." : "",
        hasLiveSession: Boolean(token),
        endpoint: token ? APPS_SCRIPT_ENDPOINT : ""
      });
    });
    return () => { active = false; };
  }, []);

  return state;
}

function normalizeDataQualityReport(report: DataQualityReport): DataQualityReport {
  const checks = Array.isArray(report.checks) ? report.checks : [];
  const generatedIssues = checks
    .filter((check) => check.count > 0 && check.status !== "good")
    .map<DataQualityIssue>((check) => ({
      severity: check.status === "danger" ? "blocking" : check.status === "warn" ? "warning" : "info",
      area: qualityCheckLabel(check.id, check.label),
      recordId: check.id,
      title: qualityCheckTitle(check.id),
      detail: `${check.count.toLocaleString("ko-KR")}건 확인 필요`
    }));
  const issues = Array.isArray(report.issues) ? report.issues : generatedIssues;
  const blocking = typeof report.summary?.blocking === "number" ? report.summary.blocking : issues.filter((issue) => issue.severity === "blocking").length;
  const warning = typeof report.summary?.warning === "number" ? report.summary.warning : issues.filter((issue) => issue.severity === "warning").length;
  const info = typeof report.summary?.info === "number" ? report.summary.info : issues.filter((issue) => issue.severity === "info").length;

  return {
    ...report,
    summary: {
      totalIssues: typeof report.summary?.totalIssues === "number" ? report.summary.totalIssues : issues.length,
      blocking,
      warning,
      info,
      checkedSheets: Array.isArray(report.summary?.checkedSheets) ? report.summary.checkedSheets : checks.map((check) => qualityCheckLabel(check.id, check.label)),
      checkedRecords: typeof report.summary?.checkedRecords === "number" ? report.summary.checkedRecords : checkedRecordCount(report.summary),
      accounts: report.summary?.accounts,
      students: report.summary?.students,
      auditLogs: report.summary?.auditLogs,
      brokenReferences: report.summary?.brokenReferences,
      openConsultations: report.summary?.openConsultations,
      studentsWithoutAccounts: report.summary?.studentsWithoutAccounts,
      backupEnabled: report.summary?.backupEnabled
    },
    checks,
    issues
  };
}

function checkedRecordCount(summary: DataQualityReport["summary"] | undefined) {
  if (!summary) return 0;
  return Object.entries(summary).reduce((total, [key, value]) => {
    if (["accounts", "students", "auditLogs", "openConsultations"].includes(key) && typeof value === "number") {
      return total + value;
    }
    return total;
  }, 0);
}

function qualityCheckLabel(id: string, fallback: string) {
  if (id === "student-account-links") return "수강생 계정 연결";
  if (id === "reference-integrity") return "참조 무결성";
  if (id === "notice-targets") return "공지 대상";
  if (id === "audit-logs") return "감사 로그";
  if (id === "open-consultations") return "상담요청";
  return fallback || id;
}

function qualityCheckTitle(id: string) {
  if (id === "student-account-links") return "계정 미연결 학생";
  if (id === "reference-integrity") return "끊어진 데이터 참조";
  if (id === "notice-targets") return "공지 대상 확인";
  if (id === "audit-logs") return "감사 로그 상태";
  if (id === "open-consultations") return "열린 상담요청";
  return "데이터 점검";
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
  const studentId = "student-1";
  const teacherId = "teacher-1";
  const visibleStudents = role === "teacher"
    ? students.filter((student) => student.teacherId === teacherId)
    : role === "student"
      ? students.filter((student) => student.id === studentId)
      : students;
  const visibleLessons = role === "teacher"
    ? lessons.filter((lesson) => lesson.teacherId === teacherId)
    : role === "student"
      ? lessons.filter((lesson) => lesson.studentId === studentId)
      : lessons;
  const visibleEnrollments = role === "teacher"
    ? enrollments.filter((item) => item.teacherId === teacherId)
    : role === "student"
      ? enrollments.filter((item) => item.studentId === studentId)
      : enrollments;
  const visibleNotes = role === "teacher"
    ? lessonNotes.filter((note) => note.teacherId === teacherId)
    : role === "student"
      ? lessonNotes.filter((note) => note.studentId === studentId)
      : lessonNotes;
  const visibleReservations = role === "student" ? reservations.filter((item) => item.studentId === studentId) : reservations;
  const visiblePayments = role === "teacher" ? [] : role === "student" ? payments.filter((item) => item.studentId === studentId) : payments;
  const visibleConsultations = role === "student" ? consultations.filter((item) => item.studentName === "이도윤") : consultations;
  const visibleConsultationIds = new Set(visibleConsultations.map((item) => item.id));
  const visibleConsultationHistory = consultationHistory.filter((item) => visibleConsultationIds.has(item.consultationId));
  const visibleLessonIds = new Set(visibleLessons.map((lesson) => lesson.id));
  const visibleStudentIds = new Set(visibleStudents.map((student) => student.id));
  const visibleAttendance = attendance.filter((item) => visibleLessonIds.has(item.lessonId) || visibleStudentIds.has(item.studentId));

  return {
    teachers,
    students: visibleStudents,
    guardians,
    consultations: visibleConsultations,
    consultationHistory: visibleConsultationHistory,
    courses,
    enrollments: visibleEnrollments,
    lessons: visibleLessons,
    attendance: visibleAttendance,
    lessonNotes: visibleNotes,
    rooms,
    reservations: visibleReservations,
    payments: visiblePayments,
    tasks,
    workLogs,
    meetings,
    calendarEvents,
    accountRequests,
    publicSettings,
    notices
  };
}

function filterOperationsData(data: OperationsData, user: AccessUser | Role | null): OperationsData {
  if (!user) return data;
  const role = typeof user === "string" ? user : user.role;
  const userId = typeof user === "string" ? "" : user.id;
  const linkedStudentId = typeof user === "string" ? "" : user.linkedStudentId || "";
  const studentId = role === "student" ? linkedStudentId || "student-1" : "";
  const teacherId = role === "teacher" ? userId || "teacher-1" : "";

  const roleScopedStudents = data.students.filter((student) => {
    if (role === "student") return student.id === studentId;
    if (role === "teacher") return student.teacherId === teacherId || (!userId && student.teacherId === "teacher-1");
    return true;
  });
  const roleScopedStudentIds = new Set(roleScopedStudents.map((student) => student.id));

  const roleScopedLessons = data.lessons.filter((lesson) => {
    if (role === "student") return lesson.studentId === studentId;
    if (role === "teacher") return lesson.teacherId === teacherId || (!userId && lesson.teacherId === "teacher-1");
    return true;
  });
  const roleScopedLessonIds = new Set(roleScopedLessons.map((lesson) => lesson.id));

  const visibleStudents = hasVersion3Permission(user, "viewStudents") ? roleScopedStudents : [];
  const visibleStudentIds = new Set(visibleStudents.map((student) => student.id));
  const canViewLessonLogs = hasVersion3Permission(user, "viewLessonLogs");
  const canViewReservations = hasVersion3Permission(user, "viewReservations");
  const canViewPayments = hasVersion3Permission(user, "viewPayments");

  const visibleConsultations = data.consultations.filter((item) => {
    if (role === "student") return item.studentId === studentId || item.studentName === getStudentName(studentId);
    if (role === "teacher") return item.assignedTo === teacherId || roleScopedStudentIds.has(item.studentId || "");
    return true;
  });
  const visibleConsultationIds = new Set(visibleConsultations.map((item) => item.id));
  const visibleDashboardWorkQueue = data.dashboardWorkQueue?.filter((item) => canAccessVersion3Area(user, areaFromHref(item.href)));

  return {
    ...data,
    teachers: hasVersion3Permission(user, "viewTeam") ? data.teachers : [],
    students: visibleStudents,
    guardians: data.guardians.filter((guardian) => visibleStudentIds.has(guardian.studentId)),
    consultations: visibleConsultations,
    consultationHistory: data.consultationHistory.filter((item) => visibleConsultationIds.has(item.consultationId)),
    enrollments: data.enrollments.filter((item) => {
      if (!hasVersion3Permission(user, "manageOperations") && role !== "teacher" && role !== "student") return false;
      if (role === "student") return item.studentId === studentId;
      if (role === "teacher") return item.teacherId === teacherId || roleScopedStudentIds.has(item.studentId);
      return true;
    }),
    lessons: roleScopedLessons,
    attendance: canViewLessonLogs
      ? data.attendance.filter((item) => roleScopedLessonIds.has(item.lessonId) || roleScopedStudentIds.has(item.studentId))
      : [],
    lessonNotes: canViewLessonLogs
      ? data.lessonNotes.filter((note) => {
          if (role === "student") return note.studentId === studentId;
          if (role === "teacher") return note.teacherId === teacherId || roleScopedStudentIds.has(note.studentId);
          return true;
        })
      : [],
    rooms: canViewReservations ? data.rooms : [],
    reservations: canViewReservations
      ? data.reservations.filter((item) => (role === "student" ? item.studentId === studentId : true))
      : [],
    payments: canViewPayments
      ? data.payments.filter((item) => {
          if (role === "student") return item.studentId === studentId;
          if (role === "teacher") return false;
          return true;
        })
      : [],
    tasks: hasVersion3Permission(user, "manageOperations") ? data.tasks : [],
    workLogs: hasVersion3Permission(user, "viewTeam")
      ? data.workLogs.filter((item) => hasVersion3Permission(user, "manageOperations") || item.accountId === userId)
      : [],
    meetings: hasVersion3Permission(user, "viewMeetings") ? data.meetings : [],
    calendarEvents: hasVersion3Permission(user, "viewCalendar")
      ? data.calendarEvents.filter((item) => !item.targetRoles.length || item.targetRoles.includes(role))
      : [],
    accountRequests: hasVersion3Permission(user, "reviewAccountRequests") ? data.accountRequests : [],
    publicSettings: data.publicSettings,
    notices: data.notices.filter((notice) => canViewNotice(role, notice.targetRoles)),
    dashboardWorkQueue: visibleDashboardWorkQueue
  };
}

function normalizeBootstrap(payload: BootstrapPayload, role: Role | null): OperationsData {
  const previewFallback = ENABLE_PREVIEW_LOGIN ? buildPreviewData(role) : emptyOperationsData;
  const liveTeachersFromPayload = (payload.teachers ?? []).map(mapTeacher);
  const liveStudents = (payload.students ?? []).map(mapStudent);
  const liveGuardians = (payload.guardians ?? []).map(mapGuardian);
  const liveCourses = (payload.courses ?? payload.classTypes ?? []).map(mapCourse);
  const liveEnrollments = (payload.enrollments ?? []).map(mapEnrollment);
  const liveLessons = (payload.lessons ?? payload.overview?.todayLessons ?? []).map(mapLesson);
  const livePayments = role === "teacher" ? [] : (payload.registrations ?? []).map(mapPayment);
  const liveRooms = (payload.rooms ?? []).map(mapRoom);
  const liveReservations = (payload.reservations ?? []).map(mapReservation);
  const liveTasks = (payload.tasks ?? []).map(mapTask);
  const liveWorkLogs = (payload.workLogs ?? []).map(mapWorkLog);
  const liveMeetings = (payload.meetings ?? []).map(mapMeeting);
  const liveCalendarEvents = (payload.calendarEvents ?? payload.calendar ?? []).map(mapCalendarEvent);
  const liveAccountRequests = (payload.accountRequests ?? []).map(mapAccountRequest);
  const livePublicSettings = mapPublicSettings(payload.publicSettings ?? {});
  const liveDashboardWorkQueue = (payload.dashboardWorkQueue ?? []).map(mapDashboardWorkItem);
  const liveConsultations = (payload.consultations ?? []).map(mapConsultation);
  const liveConsultationHistory = (payload.consultationHistory ?? []).map(mapConsultationHistory);
  const liveNotices = (payload.notices ?? []).map(mapNotice);
  const liveLessonNotes = (payload.lessonNotes ?? payload.overview?.recentLogs ?? []).map(mapLessonNote);
  const liveAttendance = (payload.attendance ?? []).map(mapAttendance);
  const derivedAttendance = buildLiveAttendance(liveLessons, liveLessonNotes);
  const liveTeachers = liveTeachersFromPayload.length ? liveTeachersFromPayload : uniqueTeachers(liveEnrollments, liveLessons, liveLessonNotes);

  return {
    teachers: liveTeachers.length ? liveTeachers : previewFallback.teachers,
    students: liveStudents.length ? liveStudents : previewFallback.students,
    guardians: liveGuardians.length ? liveGuardians : previewFallback.guardians,
    consultations: liveConsultations.length ? liveConsultations : previewFallback.consultations,
    consultationHistory: liveConsultationHistory.length ? liveConsultationHistory : previewFallback.consultationHistory,
    courses: liveCourses.length ? liveCourses : previewFallback.courses,
    enrollments: liveEnrollments.length ? liveEnrollments : previewFallback.enrollments,
    lessons: liveLessons.length ? liveLessons : previewFallback.lessons,
    attendance: liveAttendance.length ? liveAttendance : derivedAttendance.length ? derivedAttendance : previewFallback.attendance,
    lessonNotes: liveLessonNotes.length ? liveLessonNotes : previewFallback.lessonNotes,
    rooms: liveRooms.length ? liveRooms : previewFallback.rooms,
    reservations: liveReservations.length ? liveReservations : previewFallback.reservations,
    payments: livePayments.length ? livePayments : previewFallback.payments,
    tasks: liveTasks.length ? liveTasks : previewFallback.tasks,
    workLogs: liveWorkLogs.length ? liveWorkLogs : previewFallback.workLogs,
    meetings: liveMeetings.length ? liveMeetings : previewFallback.meetings,
    calendarEvents: liveCalendarEvents.length ? liveCalendarEvents : previewFallback.calendarEvents,
    accountRequests: liveAccountRequests.length ? liveAccountRequests : previewFallback.accountRequests,
    publicSettings: Object.values(livePublicSettings).some(Boolean) ? livePublicSettings : previewFallback.publicSettings,
    notices: liveNotices.length ? liveNotices : previewFallback.notices,
    dashboardWorkQueue: liveDashboardWorkQueue.length ? liveDashboardWorkQueue : undefined,
    overview: payload.overview
  };
}

function mapTeacher(item: LiveRecord): Teacher {
  return {
    id: stringValue(item.teacher_id || item.id),
    name: stringValue(item.name, "강사명 없음"),
    major: stringValue(item.major)
  };
}

function mapStudent(item: LiveRecord): Student {
  return {
    id: stringValue(item.student_id || item.id),
    name: stringValue(item.name, "이름 없음"),
    birthDate: stringValue(item.birth_date || item.birthDate),
    phone: stringValue(item.phone),
    major: stringValue(item.major),
    goal: stringValue(item.goal),
    status: normalizeStudentStatus(stringValue(item.status)),
    enrolledAt: stringValue(item.enrolled_at || item.enrolledAt || item.created_at || item.createdAt),
    memo: stringValue(item.memo),
    teacherId: stringValue(item.teacher_id || item.teacherId),
    teacherName: stringValue(item.teacher_name || item.teacherName)
  };
}

function mapGuardian(item: LiveRecord): Guardian {
  return {
    id: stringValue(item.guardian_id || item.id),
    studentId: stringValue(item.student_id || item.studentId),
    name: stringValue(item.name, "보호자명 없음"),
    relation: stringValue(item.relation),
    phone: stringValue(item.phone),
    payer: truthyValue(item.payer),
    emergency: truthyValue(item.emergency),
    memo: stringValue(item.memo)
  };
}

function mapCourse(item: LiveRecord): Course {
  return {
    id: stringValue(item.course_id || item.class_type_id || item.id),
    name: stringValue(item.name || item.subject, "과목명 없음"),
    major: stringValue(item.major || item.category),
    teacherId: stringValue(item.teacher_id || item.teacherId),
    status: stringValue(item.status, "운영중")
  };
}

function mapEnrollment(item: LiveRecord): Enrollment {
  return {
    id: stringValue(item.enrollment_id || item.id),
    studentId: stringValue(item.student_id || item.studentId),
    courseId: stringValue(item.class_type_id || item.course_id || item.courseId || item.subject),
    teacherId: stringValue(item.teacher_id || item.teacherId),
    startDate: stringValue(item.start_date || item.startDate),
    status: enrollmentStatus(stringValue(item.status)),
    memo: stringValue(item.memo) || [item.weekly_day, item.start_time, item.room].filter(Boolean).join(" · "),
    studentName: stringValue(item.student_name || item.studentName),
    teacherName: stringValue(item.teacher_name || item.teacherName)
  };
}

function mapLesson(item: LiveRecord): Lesson {
  const lessonDate = stringValue(item.lesson_date || item.lessonDate || item.date);
  const startTime = stringValue(item.start_time || item.startTime);
  return {
    id: stringValue(item.lesson_id || item.id),
    studentId: stringValue(item.student_id || item.studentId),
    teacherId: stringValue(item.teacher_id || item.teacherId),
    courseId: stringValue(item.course_id || item.courseId || item.subject),
    startsAt: stringValue(item.startsAt) || (lessonDate && startTime ? `${lessonDate}T${startTime}:00+09:00` : lessonDate),
    duration: numberValue(item.duration_minutes || item.duration, 60),
    status: stringValue(item.status, "예정"),
    memo: stringValue(item.memo || item.room),
    studentName: stringValue(item.student_name || item.studentName),
    teacherName: stringValue(item.teacher_name || item.teacherName),
    subject: stringValue(item.subject)
  };
}

function mapLessonNote(item: LiveRecord): LessonNote {
  return {
    id: stringValue(item.log_id || item.id),
    lessonId: stringValue(item.lesson_id || item.lessonId),
    studentId: stringValue(item.student_id || item.studentId),
    teacherId: stringValue(item.teacher_id || item.teacherId),
    date: stringValue(item.lesson_date || item.date || item.created_at),
    content: stringValue(item.content || item.lesson_content),
    homework: stringValue(item.homework),
    nextGoal: stringValue(item.next_goal || item.nextGoal),
    practiceRequest: stringValue(item.practice_request || item.practiceRequest),
    internalMemo: stringValue(item.internal_memo || item.internalMemo),
    studentName: stringValue(item.student_name || item.studentName),
    teacherName: stringValue(item.teacher_name || item.teacherName)
  };
}

function mapAttendance(item: LiveRecord): Attendance {
  return {
    id: stringValue(item.attendance_id || item.id),
    lessonId: stringValue(item.lesson_id || item.lessonId),
    studentId: stringValue(item.student_id || item.studentId),
    status: stringValue(item.status, "미처리"),
    makeupNeeded: truthyValue(item.makeup_needed || item.makeupNeeded),
    memo: stringValue(item.memo)
  };
}

function mapRoom(item: LiveRecord): Room {
  return {
    id: stringValue(item.room_id || item.id),
    name: stringValue(item.name, "공간 이름 없음"),
    location: stringValue(item.location) || roomTypeLabel(stringValue(item.room_type)),
    capacity: numberValue(item.capacity, 1),
    status: stringValue(item.status) || (truthyValue(item.active) ? "사용 가능" : "비활성")
  };
}

function mapReservation(item: LiveRecord): Reservation {
  const reservationDate = stringValue(item.reservation_date || item.reservationDate);
  const startTime = stringValue(item.start_time || item.startTime);
  const endTime = stringValue(item.end_time || item.endTime);
  return {
    id: stringValue(item.reservation_id || item.id),
    roomId: stringValue(item.room_id || item.roomId),
    studentId: stringValue(item.reserved_by || item.studentId),
    requester: stringValue(item.requester || item.reserved_by_name || item.reserved_by),
    startsAt: stringValue(item.startsAt) || (reservationDate && startTime ? `${reservationDate}T${startTime}:00+09:00` : reservationDate),
    endsAt: stringValue(item.endsAt) || (reservationDate && endTime ? `${reservationDate}T${endTime}:00+09:00` : reservationDate),
    status: stringValue(item.status, "확인 필요"),
    memo: [item.purpose, item.memo].filter(Boolean).join(" · "),
    studentName: stringValue(item.reserved_by_name || item.studentName),
    roomName: stringValue(item.room_name || item.roomName)
  };
}
function mapPayment(item: LiveRecord): Payment {
  return {
    id: stringValue(item.registration_id || item.id),
    studentId: stringValue(item.student_id || item.studentId),
    title: stringValue(item.program_name || item.title || item.subject || "등록·결제"),
    amount: numberValue(item.amount, 0),
    status: stringValue(item.payment_status || item.status, "확인 필요"),
    dueDate: stringValue(item.next_due_date || item.dueDate || item.period_start),
    paidAt: stringValue(item.paid_at || item.paidAt),
    memo: stringValue(item.memo),
    studentName: stringValue(item.student_name || item.studentName)
  };
}

function mapTask(item: LiveRecord): Task {
  return {
    id: stringValue(item.task_id || item.id),
    title: stringValue(item.title, "업무명 없음"),
    assignee: stringValue(item.assignee_name || item.assigneeName || item.assignee || item.assignee_id),
    dueDate: stringValue(item.due_date || item.dueDate),
    status: stringValue(item.status, "할일"),
    priority: stringValue(item.priority, "보통"),
    memo: stringValue(item.memo)
  };
}

function mapWorkLog(item: LiveRecord): WorkLog {
  return {
    id: stringValue(item.work_log_id || item.id),
    accountId: stringValue(item.account_id || item.accountId),
    accountName: stringValue(item.account_name || item.accountName),
    workDate: stringValue(item.work_date || item.workDate),
    clockInAt: stringValue(item.clock_in_at || item.clockInAt),
    clockOutAt: stringValue(item.clock_out_at || item.clockOutAt),
    memo: stringValue(item.memo)
  };
}

function mapMeeting(item: LiveRecord): Meeting {
  return {
    id: stringValue(item.meeting_id || item.id),
    title: stringValue(item.title, "회의명 없음"),
    startsAt: stringValue(item.starts_at || item.startsAt),
    participantNames: stringListValue(item.participant_names || item.participantNames),
    status: stringValue(item.status, "예정"),
    memo: stringValue(item.memo)
  };
}

function mapCalendarEvent(item: LiveRecord): CalendarEvent {
  const startsAt = stringValue(item.starts_at || item.startsAt);
  return {
    id: stringValue(item.calendar_event_id || item.id),
    title: stringValue(item.title, "일정명 없음"),
    date: stringValue(item.date) || startsAt.slice(0, 10),
    startTime: stringValue(item.start_time || item.startTime) || startsAt.slice(11, 16),
    targetRoles: noticeTargetRoles(item.target_roles || item.targetRoles),
    memo: stringValue(item.memo)
  };
}

function mapAccountRequest(item: LiveRecord): AccountRequest {
  return {
    id: stringValue(item.account_request_id || item.id),
    loginId: stringValue(item.login_id || item.loginId),
    name: stringValue(item.name, "이름 없음"),
    requestedRole: normalizeRole(stringValue(item.requested_role || item.requestedRole)) ?? "student",
    email: stringValue(item.email),
    phone: stringValue(item.phone),
    linkedStudentId: stringValue(item.linked_student_id || item.linkedStudentId),
    message: stringValue(item.message),
    status: stringValue(item.status, "대기"),
    reviewedByName: stringValue(item.reviewed_by_name || item.reviewedByName),
    reviewedAt: stringValue(item.reviewed_at || item.reviewedAt),
    reviewMemo: stringValue(item.review_memo || item.reviewMemo),
    createdAccountId: stringValue(item.created_account_id || item.createdAccountId),
    createdAt: stringValue(item.created_at || item.createdAt)
  };
}

function mapPublicSettings(item: LiveRecord): PublicSettings {
  return {
    loginNotice: stringValue(item.loginNotice || item.login_notice),
    academyPhone: stringValue(item.academyPhone || item.academy_phone),
    reservationGuide: stringValue(item.reservationGuide || item.reservation_guide),
    updatedAt: stringValue(item.updatedAt || item.updated_at),
    updatedBy: stringValue(item.updatedBy || item.updated_by)
  };
}

function mapConsultation(item: LiveRecord): Consultation {
  return {
    id: stringValue(item.consultation_id),
    studentId: stringValue(item.student_id),
    studentName: stringValue(item.student_name),
    guardianName: stringValue(item.guardian_name),
    phone: stringValue(item.phone),
    channel: stringValue(item.channel, "전화"),
    major: stringValue(item.major, "보컬"),
    goal: stringValue(item.goal),
    date: stringValue(item.consultation_date || item.created_at),
    followUpDate: stringValue(item.follow_up_date),
    status: normalizeConsultationStatus(item.status),
    priority: stringValue(item.priority, "보통"),
    memo: stringValue(item.memo),
    assignedTo: stringValue(item.assigned_to || item.assignedTo),
    assignedToName: stringValue(item.assigned_to_name || item.assignedToName),
    statusUpdatedAt: stringValue(item.status_updated_at || item.statusUpdatedAt || item.updated_at),
    unreadForAccountIds: stringListValue(item.unreadForAccountIds || item.unread_for_account_ids)
  };
}

function mapDashboardWorkItem(item: LiveRecord): Version3DashboardWorkItem {
  const sourceType = stringValue(item.source_type || item.sourceType);
  const sourceId = stringValue(item.source_id || item.sourceId);
  return {
    id: stringValue(item.work_item_id || item.id, `${sourceType || "work"}-${sourceId || "unknown"}`),
    kind: dashboardWorkKind(stringValue(item.kind)),
    sourceType: dashboardSourceType(sourceType),
    sourceId,
    title: stringValue(item.title, "확인할 항목"),
    ownerName: stringValue(item.owner_name || item.ownerName, "미배정"),
    href: stringValue(item.href, "/dashboard"),
    priority: dashboardPriority(item.priority),
    tone: dashboardTone(item.tone),
    status: stringValue(item.status),
    dueAt: stringValue(item.due_at || item.dueAt)
  };
}

function mapConsultationHistory(item: LiveRecord): ConsultationHistory {
  return {
    id: stringValue(item.history_id || item.event_id),
    consultationId: stringValue(item.consultation_id || item.target_id),
    actorId: stringValue(item.actor_id || item.account_id),
    actorName: stringValue(item.actor_name || item.account_name),
    action: stringValue(item.action),
    status: normalizeConsultationStatus(item.status),
    assignedTo: stringValue(item.assigned_to),
    assignedToName: stringValue(item.assigned_to_name),
    occurredAt: stringValue(item.occurred_at)
  };
}

function mapNotice(item: LiveRecord): Notice {
  return {
    id: stringValue(item.notice_id || item.id),
    title: stringValue(item.title, "제목 없음"),
    category: stringValue(item.category, "공지"),
    author: stringValue(item.author_name || item.author || item.author_id),
    updatedAt: stringValue(item.updated_at || item.updatedAt || item.created_at),
    body: stringValue(item.body),
    targetRoles: noticeTargetRoles(item.target_roles || item.targetRoles),
    pinned: truthyValue(item.pinned)
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

function stringListValue(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => stringValue(item)).filter(Boolean);
  const text = stringValue(value);
  return text ? text.split(/[,|]/).map((item) => item.trim()).filter(Boolean) : [];
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function truthyValue(value: unknown) {
  return value === true || value === "true" || value === "TRUE" || value === "1" || value === 1;
}

function noticeTargetRoles(value: unknown): Role[] {
  const text = Array.isArray(value) ? value.join(",") : stringValue(value);
  if (!text || text === "전체" || text === "all") return ["owner", "manager", "teacher", "student"];
  const normalized = text
    .split(/[,/|]+/)
    .map((item) => item.trim())
    .flatMap((item) => {
      if (item === "대표/매니저" || item === "운영진") return ["owner", "manager"] as Role[];
      if (item === "대표") return ["owner"] as Role[];
      if (item === "매니저") return ["manager"] as Role[];
      if (item === "강사") return ["teacher"] as Role[];
      if (item === "수강생" || item === "학생") return ["student"] as Role[];
      const role = normalizeRole(item);
      return role ? [role] : [];
    });
  return normalized.length ? Array.from(new Set(normalized)) : ["owner", "manager", "teacher", "student"];
}

function canViewNotice(role: Role, targetRoles: Role[]) {
  return targetRoles.length === 0 || targetRoles.includes(role);
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

function dashboardWorkKind(value: string): Version3DashboardWorkItem["kind"] {
  if (value === "상담요청" || value === "출결" || value === "보강" || value === "수납" || value === "계정" || value === "업무") return value;
  return "업무";
}

function dashboardSourceType(value: string): Version3DashboardWorkItem["sourceType"] {
  if (value === "consultationRequests" || value === "attendance" || value === "payments" || value === "accounts" || value === "tasks") return value;
  return "tasks";
}

function dashboardPriority(value: unknown): Version3DashboardWorkPriority {
  if (value === "urgent" || value === "high" || value === "normal") return value;
  return "normal";
}

function dashboardTone(value: unknown): Version3DashboardWorkTone {
  if (value === "default" || value === "good" || value === "warn" || value === "danger") return value;
  return "default";
}

function areaFromHref(href: string) {
  const [path] = href.split("?");
  return path.replace(/^\//, "") || "dashboard";
}
