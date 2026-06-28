"use client";

import { useSyncExternalStore } from "react";

export type Preferences = {
  startPage: string;
  density: "comfortable" | "compact";
  mobileMenu: "grouped" | "expanded";
  dashboardFocus: "operations" | "lessons" | "students";
};

export const PREFERENCES_STORAGE_KEY = "bonsung_preferences";

export const defaultPreferences: Preferences = {
  startPage: "/dashboard",
  density: "comfortable",
  mobileMenu: "grouped",
  dashboardFocus: "operations"
};

export const startPages = [
  { value: "/dashboard", label: "대시보드" },
  { value: "/students", label: "학생 관리" },
  { value: "/teachers", label: "강사별 조회" },
  { value: "/lessons", label: "수업/시간표" },
  { value: "/practice-rooms", label: "강의실/연습실 예약" },
  { value: "/lesson-notes", label: "레슨노트" }
];

export function savePreferences(preferences: Preferences) {
  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event("bonsung-preferences-change"));
}

export function readPreferences(): Preferences {
  if (typeof window === "undefined") return defaultPreferences;

  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return normalizePreferences(stored ? JSON.parse(stored) : {});
  } catch {
    return defaultPreferences;
  }
}

export function usePreferences() {
  return useSyncExternalStore(subscribe, readPreferences, () => defaultPreferences);
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("bonsung-preferences-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("bonsung-preferences-change", callback);
  };
}

function normalizePreferences(value: Partial<Preferences>): Preferences {
  const startPage = typeof value.startPage === "string" && startPages.some((item) => item.value === value.startPage) ? value.startPage : defaultPreferences.startPage;
  return {
    startPage,
    density: value.density === "compact" ? "compact" : defaultPreferences.density,
    mobileMenu: value.mobileMenu === "expanded" ? "expanded" : defaultPreferences.mobileMenu,
    dashboardFocus: value.dashboardFocus === "lessons" || value.dashboardFocus === "students" ? value.dashboardFocus : defaultPreferences.dashboardFocus
  };
}
