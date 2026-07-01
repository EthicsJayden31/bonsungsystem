"use client";

import { useSyncExternalStore } from "react";
import { normalizeRole } from "@/lib/auth-shared";
import { PREVIEW_ROLE_KEY, SESSION_CHANGE_EVENT } from "@/lib/client-session";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  return normalizeRole(window.localStorage.getItem(PREVIEW_ROLE_KEY));
}

function getServerSnapshot() {
  return null;
}

export function usePreviewRole() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
