"use client";

export const BONSUNG_SERVER_BASE_URL = process.env.NEXT_PUBLIC_BONSUNG_API_BASE_URL || "/api/stage";
export const BONSUNG_SERVER_SESSION_TOKEN_KEY = "bonsung_server_session_token";
export const BONSUNG_SERVER_USER_KEY = "bonsung_server_current_user";

type ServerResult<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type ServerRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export type StageServerUser = {
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

export type StageServerLoginResult = {
  token: string;
  expiresAt?: string;
  user: StageServerUser;
};

export type StageServerPasswordChangeResult = {
  user: StageServerUser;
};

export function isStageServerConfigured() {
  return Boolean(BONSUNG_SERVER_BASE_URL.trim());
}

export function readStageServerToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(BONSUNG_SERVER_SESSION_TOKEN_KEY) || "";
}

export function hasStageServerSession() {
  return isStageServerConfigured() && Boolean(readStageServerToken());
}

export function stageServerEndpoint(path = "") {
  const base = BONSUNG_SERVER_BASE_URL.replace(/\/+$/, "");
  if (!path) return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
}

export async function loginWithStageServer(loginId: string, password: string): Promise<StageServerLoginResult> {
  if (!isStageServerConfigured()) throw new Error("본성 스테이지 서버 주소가 설정되어 있지 않습니다.");

  const result = await requestStageServer<StageServerLoginResult>("/auth/login", {
    method: "POST",
    body: { loginId, password }
  });

  if (!result.token || !result.user) throw new Error("본성 스테이지 server login response is missing a token or user.");
  return result;
}

export async function callStageServer<T>(path: string, options: ServerRequestOptions = {}): Promise<T> {
  const token = readStageServerToken();
  if (!isStageServerConfigured()) throw new Error("본성 스테이지 서버 주소가 설정되어 있지 않습니다.");
  if (!token) throw new Error("본성 스테이지 서버 로그인 세션이 필요합니다.");

  return requestStageServer<T>(path, options, token);
}

export async function changeStageServerPassword(currentPassword: string, newPassword: string) {
  return callStageServer<StageServerPasswordChangeResult>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword }
  });
}

export async function logoutStageServer() {
  if (!hasStageServerSession()) return;
  await callStageServer<boolean>("/auth/logout", { method: "POST" });
}

async function requestStageServer<T>(path: string, options: ServerRequestOptions = {}, token = ""): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(stageServerEndpoint(path), {
      method: options.method || (options.body == null ? "GET" : "POST"),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json"
      },
      body: options.body == null ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });

    const parsed = (await response.json()) as ServerResult<T> | T;
    if (!response.ok) {
      const message = friendlyStageServerError(parsed, response.status);
      throw new Error(message);
    }
    if (isServerResult<T>(parsed)) {
      if (parsed.ok === false) throw new Error(parsed.message || parsed.error || "본성 스테이지 서버 요청을 처리하지 못했습니다.");
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

function friendlyStageServerError<T>(parsed: ServerResult<T> | T, status: number) {
  if (isServerResult<T>(parsed) && parsed.error === "stage_api_setup_required") {
    return "운영 데이터 저장소 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.";
  }
  return isServerResult<T>(parsed)
    ? parsed.message || parsed.error || `본성 스테이지 서버 응답 오류 (${status})`
    : `본성 스테이지 서버 응답 오류 (${status})`;
}
