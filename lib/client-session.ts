"use client";

import { assetPath } from "@/lib/assets";
import { APPS_SCRIPT_SESSION_TOKEN_KEY, APPS_SCRIPT_USER_KEY, type AppsScriptUser } from "@/lib/apps-script-client";
import type { Role } from "@/lib/auth-shared";

export const PREVIEW_ROLE_KEY = "bonsung_role";
export const SESSION_CHANGE_EVENT = "bonsung-session-change";

export function isNextRole(role: string | undefined): role is Role {
  return role === "admin" || role === "staff" || role === "teacher";
}

export function clearClientSession() {
  window.localStorage.removeItem(PREVIEW_ROLE_KEY);
  window.localStorage.removeItem(APPS_SCRIPT_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(APPS_SCRIPT_USER_KEY);
  window.sessionStorage.removeItem(PREVIEW_ROLE_KEY);
  window.sessionStorage.removeItem(APPS_SCRIPT_SESSION_TOKEN_KEY);
  window.sessionStorage.removeItem(APPS_SCRIPT_USER_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setPreviewSession(role: Role) {
  clearClientSession();
  window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setLiveSession(token: string, user: AppsScriptUser) {
  clearClientSession();
  window.localStorage.setItem(APPS_SCRIPT_SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(APPS_SCRIPT_USER_KEY, JSON.stringify(user));
  if (isNextRole(user.role)) {
    window.localStorage.setItem(PREVIEW_ROLE_KEY, user.role);
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function redirectToAppPath(path: string) {
  window.location.assign(assetPath(path));
}
