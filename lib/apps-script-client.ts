export const APPS_SCRIPT_ENDPOINT = process.env.NEXT_PUBLIC_APPS_SCRIPT_ENDPOINT || "";
export const APPS_SCRIPT_REQUEST_TIMEOUT_MS = 45000;

export const APPS_SCRIPT_SESSION_TOKEN_KEY = "bonsung_session_token";
export const APPS_SCRIPT_USER_KEY = "bonsung_current_user";

type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type AppsScriptUser = {
  account_id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  linked_student_id?: string;
  mustChangePassword?: boolean;
  must_change_password?: boolean;
  permissions?: Record<string, boolean>;
};

export type AppsScriptLoginResult = {
  token: string;
  user: AppsScriptUser;
};

export type AppsScriptPasswordChangeResult = {
  user?: AppsScriptUser;
};

export async function loginWithAppsScript(loginId: string, password: string): Promise<AppsScriptLoginResult> {
  return callAppsScript<AppsScriptLoginResult>("login", { loginId, password });
}

export async function changeAppsScriptPassword(token: string, currentPassword: string, newPassword: string): Promise<AppsScriptPasswordChangeResult> {
  return callAppsScript<AppsScriptPasswordChangeResult>("changePassword", { token, currentPassword, newPassword });
}

export async function callAppsScript<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!APPS_SCRIPT_ENDPOINT.trim()) {
    throw new Error("Apps Script Web App URL이 설정되어 있지 않습니다.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), APPS_SCRIPT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(APPS_SCRIPT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Apps Script 응답 오류 (${response.status})`);
    }

    const result = (await response.json()) as ApiResult<T>;
    if (!result.ok) {
      throw new Error(result.error || "Apps Script 요청을 처리하지 못했습니다.");
    }

    return result.data as T;
  } finally {
    window.clearTimeout(timeout);
  }
}
