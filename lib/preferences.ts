"use client";

import { useEffect, useState } from "react";

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
  { value: "/students", label: "Artist 관리" },
  { value: "/teachers", label: "Coach 조회" },
  { value: "/lessons", label: "수업/시간표" },
  { value: "/practice-rooms", label: "강의실/연습실 예약" },
  { value: "/lesson-notes", label: "레슨노트" }
];

let cachedRawPreferences: string | null = null;
let cachedPreferences = defaultPreferences;

export function savePreferences(preferences: Preferences) {
  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  cachedRawPreferences = null;
  window.dispatchEvent(new Event("bonsung-preferences-change"));
}

export function readPreferences(): Preferences {
  if (typeof window === "undefined") return defaultPreferences;

  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (stored === cachedRawPreferences) return cachedPreferences;

    cachedRawPreferences = stored;
    cachedPreferences = normalizePreferences(stored ? JSON.parse(stored) : {});
    return cachedPreferences;
  } catch {
    cachedRawPreferences = null;
    cachedPreferences = defaultPreferences;
    return defaultPreferences;
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const syncPreferences = () => setPreferences(readPreferences());
    syncPreferences();
    window.addEventListener("storage", syncPreferences);
    window.addEventListener("bonsung-preferences-change", syncPreferences);
    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener("bonsung-preferences-change", syncPreferences);
    };
  }, []);

  return preferences;
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
