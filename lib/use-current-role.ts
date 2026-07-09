"use client";

import { useCurrentUser } from "@/lib/use-current-user";

export function useCurrentRole() {
  return useCurrentUser()?.role ?? null;
}
