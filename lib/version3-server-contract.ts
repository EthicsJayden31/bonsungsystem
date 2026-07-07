import { normalizeRole, type Role } from "@/lib/auth-shared";

export type Version3AccountStatus = "active" | "paused" | "invited";
export type Version3PermissionKey =
  | "manageAccounts"
  | "viewAccounts"
  | "manageOperations"
  | "manageNotices"
  | "managePermissions"
  | "manageMeetings"
  | "manageCalendar"
  | "viewPayments"
  | "clockWork"
  | "viewStudents"
  | "manageStudents"
  | "viewLessonLogs"
  | "writeLessonLogs"
  | "viewReservations"
  | "manageReservations"
  | "reserveLessonRoom"
  | "reservePracticeRoom"
  | "viewTeam"
  | "viewMeetings"
  | "viewCalendar"
  | "reviewAccountRequests"
  | "managePublicSettings";

export type Version3Permissions = Partial<Record<Version3PermissionKey, boolean>>;

export type Version3Account = {
  id: string;
  loginId: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  linkedStudentId: string;
  linkedStudentName?: string;
  status: Version3AccountStatus;
  mustChangePassword: boolean;
  permissions: Version3Permissions;
  lastLoginAt: string;
  createdAt: string;
};

export type Version3AccountInput = {
  loginId: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  linkedStudentId: string;
  initialPassword: string;
};

export type Version3AccountHistory = {
  id: string;
  accountId: string;
  accountName: string;
  actorId: string;
  actorName: string;
  action: string;
  role: string;
  beforePermissions?: Version3Permissions;
  afterPermissions?: Version3Permissions;
  occurredAt: string;
};

export type Version3AuditLog = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: "account" | "consultationRequest" | "notice" | string;
  targetId: string;
  targetName: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type Version3DashboardWorkPriority = "urgent" | "high" | "normal";
export type Version3DashboardWorkTone = "default" | "good" | "warn" | "danger";
export type Version3DashboardWorkKind = "상담요청" | "출결" | "보강" | "수납" | "계정" | "업무";

export type Version3DashboardWorkItem = {
  id: string;
  kind: Version3DashboardWorkKind;
  sourceType: "consultationRequests" | "attendance" | "payments" | "accounts" | "tasks";
  sourceId: string;
  title: string;
  ownerName: string;
  href: string;
  priority: Version3DashboardWorkPriority;
  tone: Version3DashboardWorkTone;
  status: string;
  dueAt?: string;
};

export type Version3Notice = {
  id: string;
  title: string;
  category: string;
  authorId: string;
  body: string;
  targetRoles: Role[];
  pinned: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const version3PermissionGroups: Array<{
  group: string;
  items: Array<{ key: Version3PermissionKey; label: string; description: string }>;
}> = [
  {
    group: "계정과 권한",
    items: [
      { key: "viewAccounts", label: "계정 현황 보기", description: "계정 목록과 최근 로그인 정보를 볼 수 있습니다." },
      { key: "manageAccounts", label: "계정 생성/상태 관리", description: "계정을 만들고 중지 또는 재개할 수 있습니다." },
      { key: "managePermissions", label: "권한 상세 편집", description: "다른 계정의 세부 권한을 바꿀 수 있습니다." },
      { key: "reviewAccountRequests", label: "계정 요청 승인", description: "신규 계정 요청을 검토하고 승인할 수 있습니다." }
    ]
  },
  {
    group: "운영 데이터",
    items: [
      { key: "manageOperations", label: "운영 관리", description: "학생, 수업, 상담요청 등 주요 운영 데이터를 관리합니다." },
      { key: "manageNotices", label: "공지 작성", description: "공지와 운영 문서를 작성할 수 있습니다." },
      { key: "viewStudents", label: "학생 보기", description: "학생과 연결된 수업 정보를 볼 수 있습니다." },
      { key: "manageStudents", label: "학생 관리", description: "학생 정보를 등록하고 수정할 수 있습니다." },
      { key: "viewPayments", label: "수납 보기", description: "수납 관련 화면과 정보를 볼 수 있습니다." }
    ]
  },
  {
    group: "수업과 공간",
    items: [
      { key: "viewLessonLogs", label: "레슨노트 보기", description: "수업 기록과 피드백을 볼 수 있습니다." },
      { key: "writeLessonLogs", label: "레슨노트 작성", description: "수업 기록을 작성할 수 있습니다." },
      { key: "viewReservations", label: "공간 예약 보기", description: "연습실과 레슨실 예약 현황을 볼 수 있습니다." },
      { key: "manageReservations", label: "공간 예약 관리", description: "공간 예약과 공간 상태를 관리할 수 있습니다." },
      { key: "reserveLessonRoom", label: "레슨실 예약", description: "레슨 목적의 공간 예약을 만들 수 있습니다." },
      { key: "reservePracticeRoom", label: "연습실 예약", description: "연습 목적의 공간 예약을 만들 수 있습니다." }
    ]
  },
  {
    group: "팀과 설정",
    items: [
      { key: "clockWork", label: "근태 기록", description: "출퇴근 기록을 남길 수 있습니다." },
      { key: "viewTeam", label: "팀 정보 보기", description: "강사와 운영진 관련 화면을 볼 수 있습니다." },
      { key: "viewMeetings", label: "회의 보기", description: "회의와 공유 일정 정보를 볼 수 있습니다." },
      { key: "manageMeetings", label: "회의 관리", description: "회의를 만들고 관리할 수 있습니다." },
      { key: "viewCalendar", label: "학원 일정 보기", description: "학원 공통 일정을 볼 수 있습니다." },
      { key: "manageCalendar", label: "학원 일정 관리", description: "학원 공통 일정을 등록하고 수정할 수 있습니다." },
      { key: "managePublicSettings", label: "공개 설정 관리", description: "로그인 화면과 공개 안내 설정을 관리할 수 있습니다." }
    ]
  }
];

export const version3PermissionKeys = version3PermissionGroups.flatMap((group) => group.items.map((item) => item.key));

export const version3RoleLabels: Record<Role, string> = {
  owner: "대표",
  manager: "매니저",
  teacher: "강사",
  student: "수강생"
};

export const version3AccountRoles: Array<{ role: Role; label: string; serverValue: "admin" | "staff" | "teacher" | "student"; employeePosition: "owner" | "manager" | "teacher" | "" }> = [
  { role: "owner", label: "대표", serverValue: "admin", employeePosition: "owner" },
  { role: "manager", label: "매니저", serverValue: "staff", employeePosition: "manager" },
  { role: "teacher", label: "강사", serverValue: "teacher", employeePosition: "teacher" },
  { role: "student", label: "수강생", serverValue: "student", employeePosition: "" }
];

export const version3ConsultationStatuses = ["접수됨", "확인 중", "전달 필요", "종결"] as const;
export type Version3ConsultationStatus = (typeof version3ConsultationStatuses)[number];

export const version3ServerEntities = [
  { name: "accounts", label: "계정", owner: "대표", keyFields: ["id", "loginId", "role", "linkedStudentId", "status", "mustChangePassword"] },
  { name: "accountRequests", label: "계정 요청", owner: "대표", keyFields: ["id", "loginId", "requestedRole", "status", "reviewedAt"] },
  { name: "students", label: "학생", owner: "매니저", keyFields: ["id", "name", "teacherId", "status"] },
  { name: "lessons", label: "수업", owner: "강사", keyFields: ["id", "studentId", "teacherId", "startsAt"] },
  { name: "notices", label: "공지", owner: "대표/매니저", keyFields: ["id", "title", "targetRoles", "pinned"] },
  { name: "consultationRequests", label: "상담요청", owner: "매니저", keyFields: ["id", "studentId", "status", "assignedTo", "statusUpdatedAt", "unreadForAccountIds"] },
  { name: "workLogs", label: "근태", owner: "운영진/강사", keyFields: ["id", "accountId", "workDate", "clockInAt", "clockOutAt"] },
  { name: "meetings", label: "회의", owner: "운영진", keyFields: ["id", "title", "startsAt", "participantIds", "status"] },
  { name: "calendarEvents", label: "일정", owner: "운영진", keyFields: ["id", "title", "date", "startTime", "targetRoles"] },
  { name: "publicSettings", label: "운영 환경 설정", owner: "대표", keyFields: ["loginNotice", "academyPhone", "reservationGuide", "updatedAt"] },
  { name: "dashboardWorkQueue", label: "대시보드 우선 처리 목록", owner: "서버", keyFields: ["id", "kind", "sourceType", "sourceId", "priority", "href"] },
  { name: "auditLogs", label: "감사 로그", owner: "대표", keyFields: ["id", "actorId", "action", "targetType", "targetId", "createdAt"] },
  { name: "sessions", label: "세션", owner: "서버", keyFields: ["id", "accountId", "expiresAt"] }
] as const;

export function accountRoleToAppsScript(role: Role) {
  return version3AccountRoles.find((item) => item.role === role) ?? version3AccountRoles[1];
}

export function normalizeAccountStatus(value: unknown): Version3AccountStatus {
  if (value === false || value === "false" || value === "FALSE" || value === "0") return "paused";
  if (value === "invited") return "invited";
  return "active";
}

export function normalizeAccountRole(role: unknown, employeePosition?: unknown): Role {
  const normalized = normalizeRole(typeof role === "string" ? role : "");
  if (normalized === "manager" && employeePosition === "owner") return "owner";
  if (normalized) return normalized;
  if (employeePosition === "owner") return "owner";
  if (employeePosition === "manager") return "manager";
  return "manager";
}

export function normalizeConsultationStatus(value: unknown): Version3ConsultationStatus {
  if (value === "접수됨" || value === "신규문의" || value === "상담예정") return "접수됨";
  if (value === "확인 중" || value === "확인중") return "확인 중";
  if (value === "전달 필요" || value === "전달필요") return "전달 필요";
  if (value === "종결" || value === "상담완료" || value === "답변 완료" || value === "답변완료") return "종결";
  return "접수됨";
}
