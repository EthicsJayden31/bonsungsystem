"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  APPS_SCRIPT_SESSION_TOKEN_KEY,
  APPS_SCRIPT_USER_KEY,
  type AppsScriptUser
} from "@/lib/apps-script-client";
import { normalizeRole, users, type CurrentUser } from "@/lib/auth-shared";
import { PREVIEW_ROLE_KEY, SESSION_CHANGE_EVENT } from "@/lib/client-session";
import { VERSION3_SERVER_SESSION_TOKEN_KEY, VERSION3_SERVER_USER_KEY, type Version3ServerUser } from "@/lib/version3-server-client";
import { ENABLE_APPS_SCRIPT_TRANSITION, ENABLE_PREVIEW_LOGIN } from "@/lib/version3-runtime-flags";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  const role = normalizeRole(window.localStorage.getItem(PREVIEW_ROLE_KEY));
  const serverToken = window.localStorage.getItem(VERSION3_SERVER_SESSION_TOKEN_KEY);
  const serverUser = serverToken ? window.localStorage.getItem(VERSION3_SERVER_USER_KEY) || "" : "";
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
  return liveUser ?? (ENABLE_PREVIEW_LOGIN ? users[role] : null);
}

function liveSessionUser(role: CurrentUser["role"], value: string): CurrentUser | null {
  try {
    const user = JSON.parse(value || "null") as (AppsScriptUser & Version3ServerUser) | null;
    const normalizedRole = normalizeRole(user?.role);
    if (!user || normalizedRole !== role || !(user.accountId || user.account_id || user.id) || !user.name) return null;
    return {
      id: String(user.accountId || user.account_id || user.id),
      name: user.name,
      email: user.email || "",
      role: normalizedRole,
      linkedStudentId: user.linkedStudentId || user.linked_student_id || "",
      mustChangePassword: Boolean(user.mustChangePassword || user.must_change_password),
      sessionExpiresAt: user.sessionExpiresAt || user.session_expires_at || "",
      permissions: user.permissions || {}
    };
  } catch {
    return null;
  }
}
