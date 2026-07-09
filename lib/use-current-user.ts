"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  APPS_SCRIPT_SESSION_TOKEN_KEY,
  APPS_SCRIPT_USER_KEY,
  type AppsScriptUser
} from "@/lib/apps-script-client";
import { normalizeRole, type CurrentUser } from "@/lib/auth-shared";
import { CLIENT_ROLE_KEY, SESSION_CHANGE_EVENT } from "@/lib/client-session";
import { BONSUNG_SERVER_SESSION_TOKEN_KEY, BONSUNG_SERVER_USER_KEY, type StageServerUser } from "@/lib/stage-server-client";
import { ENABLE_APPS_SCRIPT_TRANSITION } from "@/lib/stage-runtime-flags";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  const role = normalizeRole(window.localStorage.getItem(CLIENT_ROLE_KEY));
  const serverToken = window.localStorage.getItem(BONSUNG_SERVER_SESSION_TOKEN_KEY);
  const serverUser = serverToken ? window.localStorage.getItem(BONSUNG_SERVER_USER_KEY) || "" : "";
  const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
  const liveUser = serverUser || (token ? window.localStorage.getItem(APPS_SCRIPT_USER_KEY) || "" : "");
  return JSON.stringify({ role, liveUser });
}

function getServerSnapshot() {
  return JSON.stringify({ role: null, liveUser: "" });
}

export function useCurrentUser() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => userFromSnapshot(snapshot), [snapshot]);
}

function userFromSnapshot(snapshot: string): CurrentUser | null {
  const parsed = JSON.parse(snapshot) as { role: string | null; liveUser: string };
  const role = normalizeRole(parsed.role);
  if (!role) return null;
  const liveUser = parsed.liveUser ? liveSessionUser(role, parsed.liveUser) : null;
  return liveUser;
}

function liveSessionUser(role: CurrentUser["role"], value: string): CurrentUser | null {
  try {
    const user = JSON.parse(value || "null") as (AppsScriptUser & StageServerUser) | null;
    const normalizedRole = normalizeRole(user?.role);
    if (!user || normalizedRole !== role || !(user.accountId || user.account_id || user.id) || !user.name) return null;
    return {
      id: String(user.accountId || user.account_id || user.id),
      name: user.name,
      email: user.email || "",
      role: normalizedRole,
      linkedStudentId: user.linkedStudentId || user.linked_student_id || "",
      mustChangePassword: truthySessionFlag(user.mustChangePassword ?? user.must_change_password),
      sessionExpiresAt: user.sessionExpiresAt || user.session_expires_at || "",
      permissions: user.permissions || {}
    };
  } catch {
    return null;
  }
}

function truthySessionFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
  return false;
}
