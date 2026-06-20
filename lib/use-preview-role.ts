"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "@/lib/auth-shared";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return window.localStorage.getItem("bonsung_role") as Role | null;
}

function getServerSnapshot() {
  return null;
}

export function usePreviewRole() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
