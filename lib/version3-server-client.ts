"use client";

export const VERSION3_SERVER_BASE_URL = process.env.NEXT_PUBLIC_VERSION3_API_BASE_URL || "";
export const VERSION3_SERVER_SESSION_TOKEN_KEY = "bonsung_server_session_token";
export const VERSION3_SERVER_USER_KEY = "bonsung_server_current_user";

type ServerResult<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

type ServerRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export type Version3ServerUser = {
  accountId?: string;
  account_id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  linkedStudentId?: string;
  linked_student_id?: string;
  mustChangePassword?: boolean;
  must_change_password?: boolean;
  sessionExpiresAt?: string;
  session_expires_at?: string;
  permissions?: Record<string, boolean>;
};

export type Version3ServerLoginResult = {
  token: string;
  expiresAt?: string;
  user: Version3ServerUser;
};

export type Version3ServerPasswordChangeResult = {
  user: Version3ServerUser;
};

export function isVersion3ServerConfigured() {
  return Boolean(VERSION3_SERVER_BASE_URL.trim());
}

export function readVersion3ServerToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(VERSION3_SERVER_SESSION_TOKEN_KEY) || "";
}

export function hasVersion3ServerSession() {
  return isVersion3ServerConfigured() && Boolean(readVersion3ServerToken());
}

export function version3ServerEndpoint(path = "") {
  const base = VERSION3_SERVER_BASE_URL.replace(/\/+$/, "");
  if (!path) return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
}

export async function loginWithVersion3Server(loginId: string, password: string): Promise<Version3ServerLoginResult> {
  if (!isVersion3ServerConfigured()) throw new Error("Version.3 server URL is not configured.");

  const result = await requestVersion3Server<Version3ServerLoginResult>("/auth/login", {
    method: "POST",
    body: { loginId, password }
  });

  if (!result.token || !result.user) throw new Error("Version.3 server login response is missing a token or user.");
  return result;
}

export async function callVersion3Server<T>(path: string, options: ServerRequestOptions = {}): Promise<T> {
  const token = readVersion3ServerToken();
  if (!isVersion3ServerConfigured()) throw new Error("Version.3 server URL is not configured.");
  if (!token) throw new Error("Version.3 server login session is required.");

  return requestVersion3Server<T>(path, options, token);
}

export async function changeVersion3ServerPassword(currentPassword: string, newPassword: string) {
  return callVersion3Server<Version3ServerPasswordChangeResult>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword }
  });
}

export async function logoutVersion3Server() {
  if (!hasVersion3ServerSession()) return;
  await callVersion3Server<boolean>("/auth/logout", { method: "POST" });
}

async function requestVersion3Server<T>(path: string, options: ServerRequestOptions = {}, token = ""): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(version3ServerEndpoint(path), {
      method: options.method || (options.body == null ? "GET" : "POST"),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json"
      },
      body: options.body == null ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`Version.3 server response error (${response.status})`);

    const parsed = (await response.json()) as ServerResult<T> | T;
    if (isServerResult<T>(parsed)) {
      if (parsed.ok === false) throw new Error(parsed.error || "Version.3 server request failed.");
      return parsed.data as T;
    }
    return parsed as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function isServerResult<T>(value: ServerResult<T> | T): value is ServerResult<T> {
  return Boolean(value && typeof value === "object" && ("ok" in value || "data" in value || "error" in value));
}
