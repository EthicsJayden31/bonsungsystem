import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { users, type Role } from "@/lib/auth-shared";
export type { CurrentUser, Role } from "@/lib/auth-shared";

export async function getCurrentUser() {
  const store = await cookies();
  const role = store.get("bonsung_role")?.value as Role | undefined;
  if (!role || !users[role]) {
    return null;
  }
  return users[role];
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export { canAccess } from "@/lib/auth-shared";
