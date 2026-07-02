export type Role = "owner" | "manager" | "teacher" | "student";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  linkedStudentId?: string;
  mustChangePassword?: boolean;
  sessionExpiresAt?: string;
  permissions?: Record<string, boolean>;
};

export const users: Record<Role, CurrentUser> = {
  owner: { id: "owner-1", name: "강은미", email: "owner@bonsung.test", role: "owner" },
  manager: { id: "manager-1", name: "조영진", email: "manager@bonsung.test", role: "manager" },
  teacher: { id: "teacher-1", name: "황휘현", email: "teacher@bonsung.test", role: "teacher" },
  student: { id: "student-1-account", name: "장윤호", email: "student@bonsung.test", role: "student", linkedStudentId: "student-jang-yunho" }
};

const roleAliases: Record<string, Role> = {
  owner: "owner",
  admin: "owner",
  manager: "manager",
  staff: "manager",
  teacher: "teacher",
  student: "student"
};

export function normalizeRole(role: string | undefined | null): Role | null {
  if (!role) return null;
  return roleAliases[role] ?? null;
}

export function isRole(role: string | undefined | null): role is Role {
  return normalizeRole(role) === role;
}

export function canAccess(role: Role, area: string) {
  if (role === "owner") return true;
  if (role === "manager") {
    return [
      "dashboard",
      "accounts",
      "students",
      "teachers",
      "guardians",
      "consultations",
      "enrollments",
      "lessons",
      "attendance",
      "lesson-notes",
      "practice-rooms",
      "payments",
      "tasks",
      "notices",
      "profile-settings"
    ].includes(area);
  }
  if (role === "teacher") {
    return ["dashboard", "students", "lessons", "attendance", "lesson-notes", "practice-rooms", "notices", "consultations", "profile-settings"].includes(area);
  }
  return ["dashboard", "lessons", "lesson-notes", "practice-rooms", "notices", "consultations", "profile-settings"].includes(area);
}
