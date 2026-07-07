import type { OperationsData } from "@/lib/operations-data";
import { getStudentName } from "@/lib/demo-data";
import type { Version3Account, Version3DashboardWorkItem, Version3DashboardWorkPriority } from "@/lib/version3-server-contract";

const unpaidPaymentStatuses = new Set(["미납", "청구예정", "청구완료", "확인 필요"]);

export function buildDashboardWorkQueue(data: OperationsData, limit = 8, accounts?: Version3Account[]): Version3DashboardWorkItem[] {
  if (data.dashboardWorkQueue?.length) return data.dashboardWorkQueue.slice(0, limit);

  const activeConsultations = data.consultations.filter((item) => item.status !== "종결");
  const pendingAttendance = data.attendance.filter((item) => item.status === "미처리");
  const makeupAttendance = data.attendance.filter((item) => item.makeupNeeded);
  const unpaidPayments = data.payments.filter((item) => unpaidPaymentStatuses.has(item.status));
  const missingStudentAccounts = accounts ? studentsWithoutAccounts(data, accounts) : [];
  const openTasks = data.tasks.filter((item) => item.status !== "완료");

  return [
    ...activeConsultations.map((item): Version3DashboardWorkItem => ({
      id: `consultation-${item.id}`,
      kind: "상담요청",
      sourceType: "consultationRequests",
      sourceId: item.id,
      title: `${item.studentName || "미등록 학생"} · ${item.goal || item.status}`,
      ownerName: item.assignedToName || item.assignedTo || "매니저 접수",
      href: "/consultations",
      priority: item.status === "전달 필요" ? "urgent" : "high",
      tone: item.status === "전달 필요" ? "danger" : "warn",
      status: item.status,
      dueAt: item.followUpDate || item.date || item.statusUpdatedAt
    })),
    ...pendingAttendance.map((item): Version3DashboardWorkItem => ({
      id: `attendance-${item.id}`,
      kind: "출결",
      sourceType: "attendance",
      sourceId: item.id,
      title: `${studentLabel(data, item.studentId)} · ${item.memo || item.status}`,
      ownerName: "담당 강사",
      href: "/attendance",
      priority: "high",
      tone: "warn",
      status: item.status
    })),
    ...makeupAttendance.map((item): Version3DashboardWorkItem => ({
      id: `makeup-${item.id}`,
      kind: "보강",
      sourceType: "attendance",
      sourceId: item.id,
      title: `${studentLabel(data, item.studentId)} · ${item.memo || "보강 일정 확인"}`,
      ownerName: "운영 확인",
      href: "/attendance",
      priority: "high",
      tone: "warn",
      status: item.status
    })),
    ...unpaidPayments.map((item): Version3DashboardWorkItem => ({
      id: `payment-${item.id}`,
      kind: "수납",
      sourceType: "payments",
      sourceId: item.id,
      title: `${item.studentName || studentLabel(data, item.studentId)} · ${item.title} · ${item.status}`,
      ownerName: "매니저",
      href: "/payments",
      priority: item.status === "미납" ? "urgent" : "high",
      tone: item.status === "미납" ? "danger" : "warn",
      status: item.status,
      dueAt: item.dueDate
    })),
    ...missingStudentAccounts.map((student): Version3DashboardWorkItem => ({
      id: `student-account-${student.id}`,
      kind: "계정",
      sourceType: "accounts",
      sourceId: student.id,
      title: `${student.name} · 수강생 계정 생성 필요`,
      ownerName: "대표",
      href: `/accounts?student=${encodeURIComponent(student.id)}&returnTo=${encodeURIComponent("/dashboard")}#create-account`,
      priority: "high",
      tone: "warn",
      status: "계정 필요",
      dueAt: student.enrolledAt
    })),
    ...openTasks.map((item): Version3DashboardWorkItem => ({
      id: `task-${item.id}`,
      kind: "업무",
      sourceType: "tasks",
      sourceId: item.id,
      title: `${item.title}${item.dueDate ? ` · ${item.dueDate}` : ""}`,
      ownerName: item.assignee || "미배정",
      href: "/tasks",
      priority: taskPriority(item.dueDate),
      tone: taskPriority(item.dueDate) === "urgent" ? "danger" : item.status === "보류" ? "warn" : "default",
      status: item.status,
      dueAt: item.dueDate
    }))
  ]
    .sort(compareWorkItems)
    .slice(0, limit);
}

export function countActiveConsultations(data: OperationsData) {
  return data.consultations.filter((item) => item.status !== "종결").length;
}

export function countPendingAttendance(data: OperationsData) {
  return data.attendance.filter((item) => item.status === "미처리").length;
}

export function countOpenTasks(data: OperationsData) {
  return data.tasks.filter((item) => item.status !== "완료").length;
}

function taskPriority(dueDate: string): Version3DashboardWorkPriority {
  if (!dueDate) return "normal";
  const today = new Date().toISOString().slice(0, 10);
  return dueDate <= today ? "urgent" : "normal";
}

function compareWorkItems(left: Version3DashboardWorkItem, right: Version3DashboardWorkItem) {
  const priorityDiff = priorityRank(left.priority) - priorityRank(right.priority);
  if (priorityDiff !== 0) return priorityDiff;
  const leftDue = left.dueAt || "9999-12-31";
  const rightDue = right.dueAt || "9999-12-31";
  if (leftDue !== rightDue) return leftDue.localeCompare(rightDue);
  return left.id.localeCompare(right.id);
}

function priorityRank(priority: Version3DashboardWorkPriority) {
  if (priority === "urgent") return 0;
  if (priority === "high") return 1;
  return 2;
}

function studentsWithoutAccounts(data: OperationsData, accounts: Version3Account[]) {
  const linkedStudentIds = new Set(
    accounts
      .filter((account) => account.role === "student" && account.linkedStudentId)
      .map((account) => account.linkedStudentId)
  );
  return data.students.filter((student) => student.status !== "퇴원" && !linkedStudentIds.has(student.id));
}

function studentLabel(data: OperationsData, studentId: string) {
  return data.students.find((student) => student.id === studentId)?.name || getStudentName(studentId) || studentId || "미등록 학생";
}
