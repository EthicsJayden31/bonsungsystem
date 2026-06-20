export type Role = "admin" | "staff" | "teacher";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export const users: Record<Role, CurrentUser> = {
  admin: { id: "admin-1", name: "원장 관리자", email: "admin@bonsung.test", role: "admin" },
  staff: { id: "staff-1", name: "운영 스태프", email: "staff@bonsung.test", role: "staff" },
  teacher: { id: "teacher-1", name: "강사 계정", email: "teacher@bonsung.test", role: "teacher" }
};

export function canAccess(role: Role, area: string) {
  if (role === "admin") return true;
  if (role === "teacher" && ["payments", "data-quality"].includes(area)) return false;
  if (role === "teacher") {
    return ["dashboard", "students", "lessons", "attendance", "lesson-notes", "notices"].includes(area);
  }
  return area !== "settings";
}
