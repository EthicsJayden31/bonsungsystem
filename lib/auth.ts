import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeRole, type CurrentUser, type Role } from "@/lib/auth-shared";
export type { CurrentUser, Role } from "@/lib/auth-shared";

const fallbackUsers: Record<Role, CurrentUser> = {
  admin: { id: "admin-1", name: "시스템 관리자", email: "admin@bonsung.local", role: "admin" },
  manager: { id: "manager-1", name: "매니저", email: "manager@bonsung.local", role: "manager" },
  coach: { id: "teacher-1", name: "Coach", email: "coach@bonsung.local", role: "coach" },
  artist: { id: "student-1-account", name: "Artist", email: "artist@bonsung.local", role: "artist" }
};

export async function getCurrentUser() {
  const store = await cookies();
  const role = normalizeRole(store.get("bonsung_role")?.value);
  return role ? fallbackUsers[role] : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export { canAccess } from "@/lib/auth-shared";
