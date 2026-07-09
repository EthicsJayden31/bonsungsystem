"use client";

import { assetPath } from "@/lib/assets";
import { APPS_SCRIPT_SESSION_TOKEN_KEY, APPS_SCRIPT_USER_KEY, type AppsScriptUser } from "@/lib/apps-script-client";
import { normalizeRole, type Role } from "@/lib/auth-shared";
import { BONSUNG_SERVER_SESSION_TOKEN_KEY, BONSUNG_SERVER_USER_KEY, type StageServerUser } from "@/lib/stage-server-client";

export const CLIENT_ROLE_KEY = "bonsung_role";
export const SESSION_CHANGE_EVENT = "bonsung-session-change";

const staleClientStorageKeys = [
  "bonsung_preview_account_drafts_v1",
  "bonsung_preview_account_history_v1",
  "bonsung_stage_test_session_v1",
  "bonsung_stage_test_data_v1"
];

export function isNextRole(role: string | undefined): role is Role {
  return Boolean(normalizeRole(role));
}

export function clearClientSession() {
  window.localStorage.removeItem(CLIENT_ROLE_KEY);
  window.localStorage.removeItem(APPS_SCRIPT_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(APPS_SCRIPT_USER_KEY);
  window.localStorage.removeItem(BONSUNG_SERVER_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(BONSUNG_SERVER_USER_KEY);
  window.sessionStorage.removeItem(CLIENT_ROLE_KEY);
  window.sessionStorage.removeItem(APPS_SCRIPT_SESSION_TOKEN_KEY);
  window.sessionStorage.removeItem(APPS_SCRIPT_USER_KEY);
  staleClientStorageKeys.forEach((key) => window.localStorage.removeItem(key));
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setLiveSession(token: string, user: AppsScriptUser) {
  clearClientSession();
  const role = normalizeRole(user.role);
  const normalizedUser = role ? { ...user, role } : user;
  window.localStorage.setItem(APPS_SCRIPT_SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(APPS_SCRIPT_USER_KEY, JSON.stringify(normalizedUser));
  if (role) {
    window.localStorage.setItem(CLIENT_ROLE_KEY, role);
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setServerSession(token: string, user: StageServerUser) {
  clearClientSession();
  const role = normalizeRole(user.role);
  const normalizedUser = role ? { ...user, role } : user;
  window.localStorage.setItem(BONSUNG_SERVER_SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(BONSUNG_SERVER_USER_KEY, JSON.stringify(normalizedUser));
  if (role) {
    window.localStorage.setItem(CLIENT_ROLE_KEY, role);
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function updateServerSessionUser(user: StageServerUser) {
  const role = normalizeRole(user.role);
  const normalizedUser = role ? { ...user, role } : user;
  window.localStorage.setItem(BONSUNG_SERVER_USER_KEY, JSON.stringify(normalizedUser));
  if (role) {
    window.localStorage.setItem(CLIENT_ROLE_KEY, role);
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function updateLiveSessionUser(user: AppsScriptUser) {
  const role = normalizeRole(user.role);
  const normalizedUser = role ? { ...user, role } : user;
  window.localStorage.setItem(APPS_SCRIPT_USER_KEY, JSON.stringify(normalizedUser));
  if (role) {
    window.localStorage.setItem(CLIENT_ROLE_KEY, role);
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function redirectToAppPath(path: string) {
  window.location.assign(assetPath(path));
}
