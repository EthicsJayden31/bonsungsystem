export type Role = "admin" | "manager" | "coach" | "artist";

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

const roleAliases: Record<string, Role> = {
  owner: "admin",
  admin: "admin",
  administrator: "admin",
  system: "admin",
  "system admin": "admin",
  manager: "manager",
  staff: "manager",
  teacher: "coach",
  coach: "coach",
  student: "artist",
  artist: "artist"
};

export function normalizeRole(role: string | undefined | null): Role | null {
  if (!role) return null;
  return roleAliases[role] ?? null;
}

export function isRole(role: string | undefined | null): role is Role {
  return normalizeRole(role) === role;
}

export function canAccess(role: Role, area: string) {
  if (role === "admin") return true;
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
  if (role === "coach") {
    return ["dashboard", "students", "lessons", "attendance", "lesson-notes", "practice-rooms", "notices", "consultations", "profile-settings"].includes(area);
  }
  return ["dashboard", "lessons", "lesson-notes", "practice-rooms", "notices", "consultations", "profile-settings"].includes(area);
}
