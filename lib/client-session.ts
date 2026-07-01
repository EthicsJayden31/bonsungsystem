"use client";

import { assetPath } from "@/lib/assets";
import { APPS_SCRIPT_SESSION_TOKEN_KEY, APPS_SCRIPT_USER_KEY, type AppsScriptUser } from "@/lib/apps-script-client";
import { normalizeRole, type Role } from "@/lib/auth-shared";
import { VERSION3_SERVER_SESSION_TOKEN_KEY, VERSION3_SERVER_USER_KEY, type Version3ServerUser } from "@/lib/version3-server-client";

export const PREVIEW_ROLE_KEY = "bonsung_role";
export const SESSION_CHANGE_EVENT = "bonsung-session-change";
export const PREVIEW_ACCOUNT_DRAFTS_KEY = "bonsung_preview_account_drafts_v1";
export const PREVIEW_ACCOUNT_HISTORY_KEY = "bonsung_preview_account_history_v1";

export function isNextRole(role: string | undefined): role is Role {
  return Boolean(normalizeRole(role));
}

export function clearClientSession() {
  window.localStorage.removeItem(PREVIEW_ROLE_KEY);
  window.localStorage.removeItem(APPS_SCRIPT_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(APPS_SCRIPT_USER_KEY);
  window.localStorage.removeItem(VERSION3_SERVER_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(VERSION3_SERVER_USER_KEY);
  window.sessionStorage.removeItem(PREVIEW_ROLE_KEY);
  window.sessionStorage.removeItem(APPS_SCRIPT_SESSION_TOKEN_KEY);
  window.sessionStorage.removeItem(APPS_SCRIPT_USER_KEY);
  window.localStorage.removeItem(PREVIEW_ACCOUNT_DRAFTS_KEY);
  window.localStorage.removeItem(PREVIEW_ACCOUNT_HISTORY_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setPreviewSession(role: Role) {
  clearClientSession();
  window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setLiveSession(token: string, user: AppsScriptUser) {
  clearClientSession();
  const role = normalizeRole(user.role);
  const normalizedUser = role ? { ...user, role } : user;
  window.localStorage.setItem(APPS_SCRIPT_SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(APPS_SCRIPT_USER_KEY, JSON.stringify(normalizedUser));
  if (role) {
    window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function setServerSession(token: string, user: Version3ServerUser) {
  clearClientSession();
  const role = normalizeRole(user.role);
  const normalizedUser = role ? { ...user, role } : user;
  window.localStorage.setItem(VERSION3_SERVER_SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(VERSION3_SERVER_USER_KEY, JSON.stringify(normalizedUser));
  if (role) {
    window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function updateServerSessionUser(user: Version3ServerUser) {
  const role = normalizeRole(user.role);
  const normalizedUser = role ? { ...user, role } : user;
  window.localStorage.setItem(VERSION3_SERVER_USER_KEY, JSON.stringify(normalizedUser));
  if (role) {
    window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function redirectToAppPath(path: string) {
  window.location.assign(assetPath(path));
}
