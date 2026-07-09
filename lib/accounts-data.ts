"use client";

import { useEffect, useMemo, useState } from "react";
import { APPS_SCRIPT_ENDPOINT, APPS_SCRIPT_REQUEST_TIMEOUT_MS, APPS_SCRIPT_SESSION_TOKEN_KEY, APPS_SCRIPT_USER_KEY } from "@/lib/apps-script-client";
import { showUiToast } from "@/lib/ui-feedback";
import { callVersion3Server, hasVersion3ServerSession } from "@/lib/version3-server-client";
import { ENABLE_APPS_SCRIPT_TRANSITION } from "@/lib/version3-runtime-flags";
import {
  accountRoleToAppsScript,
  normalizeAccountRole,
  normalizeAccountStatus,
  version3PermissionKeys,
  version3RoleLabels,
  type Version3Account,
  type Version3AccountHistory,
  type Version3AccountInput,
  type Version3Permissions
} from "@/lib/version3-server-contract";

type AccountSource = "loading" | "server" | "live" | "fallback";
type AccountRecord = Record<string, unknown>;

type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type AccountsState = {
  source: AccountSource;
  accounts: Version3Account[];
  accountHistory: Version3AccountHistory[];
  currentAccountId: string;
  error: string;
  hasLiveSession: boolean;
  createAccount: (input: Version3AccountInput) => Promise<void>;
  resetAccountPassword: (accountId: string, password: string) => Promise<void>;
  updateAccountPermissions: (accountId: string, permissions: Version3Permissions) => Promise<void>;
  updateAccountStatus: (accountId: string, active: boolean) => Promise<void>;
};

type AccountsDataOptions = {
  enabled?: boolean;
};

export function useAccountsData(options: AccountsDataOptions = {}): AccountsState {
  const enabled = options.enabled ?? true;
  const [source, setSource] = useState<AccountSource>("loading");
  const [accounts, setAccounts] = useState<Version3Account[]>([]);
  const [accountHistory, setAccountHistory] = useState<Version3AccountHistory[]>([]);
  const [error, setError] = useState("");
  const hasLiveSession = typeof window !== "undefined" && (hasVersion3ServerSession() || (ENABLE_APPS_SCRIPT_TRANSITION && Boolean(window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY))));
  const sortedAccounts = useMemo(() => accounts, [accounts]);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      queueMicrotask(() => {
        if (!active) return;
        setAccounts([]);
        setAccountHistory([]);
        setSource("fallback");
        setError("");
      });
      return () => {
        active = false;
      };
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";

    if (hasVersion3ServerSession()) {
      queueMicrotask(() => {
        if (active) setSource("loading");
      });
      Promise.all([
        callVersion3Server<AccountRecord[]>("/accounts"),
        callVersion3Server<AccountRecord[]>("/account-history")
      ])
        .then(([records, historyRecords]) => {
          if (!active) return;
          setAccounts(records.map(mapServerAccount));
          setAccountHistory(historyRecords.map(mapServerAccountHistory));
          setSource("server");
          setError("");
        })
        .catch((caught: unknown) => {
          if (!active) return;
          setAccounts([]);
          setAccountHistory([]);
          setSource("fallback");
          setError(caught instanceof Error ? caught.message : String(caught));
        });

      return () => {
        active = false;
      };
    }

    if (!token) {
      queueMicrotask(() => {
        if (!active) return;
        setAccounts([]);
        setAccountHistory([]);
        setSource("fallback");
        setError("Version.3 서버 또는 Apps Script 로그인 세션이 필요합니다.");
      });
      return () => {
        active = false;
      };
    }

    queueMicrotask(() => {
      if (active) setSource("loading");
    });
    Promise.all([
      callAppsScript<AccountRecord[]>("listAccounts", token),
      callAppsScript<AccountRecord[]>("listAccountHistory", token)
    ])
      .then(([records, historyRecords]) => {
        if (!active) return;
        setAccounts(records.map(mapAccount));
        setAccountHistory(historyRecords.map(mapAccountHistory));
        setSource("live");
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setAccounts([]);
        setAccountHistory([]);
        setSource("fallback");
        setError(caught instanceof Error ? caught.message : String(caught));
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  async function createAccount(input: Version3AccountInput) {
    if (input.role === "artist" && !input.linkedStudentId) {
      throw new Error("Artist 계정은 연결할 학생을 선택해야 합니다.");
    }
    if (input.role === "artist" && sortedAccounts.some((account) => account.role === "artist" && account.linkedStudentId === input.linkedStudentId)) {
      throw new Error("이미 Artist 계정과 연결된 학생입니다.");
    }

    if (hasVersion3ServerSession()) {
      const created = await callVersion3Server<AccountRecord>("/accounts", { method: "POST", body: { account: input } });
      setAccounts((current) => [mapServerAccount(created), ...current]);
      await refreshServerAccountHistory();
      setSource("server");
      setError("");
      showUiToast("계정 저장 완료");
      return;
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (!token) throw new Error("계정 생성은 Version.3 서버 또는 Apps Script 로그인 세션이 필요합니다.");

    const role = accountRoleToAppsScript(input.role);
    const created = await callAppsScript<AccountRecord>("createAccount", token, {
      account: {
        login_id: input.loginId,
        password: input.initialPassword,
        role: role.serverValue,
        employee_position: role.employeePosition,
        name: input.name,
        email: input.email,
        phone: input.phone,
        linked_student_id: input.role === "artist" ? input.linkedStudentId : ""
      }
    });
    setAccounts((current) => [mapAccount(created), ...current]);
    await refreshAccountHistory(token);
    setSource("live");
    setError("");
    showUiToast("계정 저장 완료");
  }

  async function updateAccountStatus(accountId: string, active: boolean) {
    if (hasVersion3ServerSession()) {
      await callVersion3Server<boolean>(`/accounts/${encodeURIComponent(accountId)}/status`, { method: "PATCH", body: { active } });
      patchAccount(accountId, { status: active ? "active" : "paused" });
      await refreshServerAccountHistory();
      setSource("server");
      setError("");
      showUiToast("설정 완료");
      return;
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (!token) throw new Error("계정 상태 변경은 Version.3 서버 또는 Apps Script 로그인 세션이 필요합니다.");

    await callAppsScript<boolean>("updateAccountStatus", token, { accountId, active });
    patchAccount(accountId, { status: active ? "active" : "paused" });
    await refreshAccountHistory(token);
    setSource("live");
    setError("");
    showUiToast("설정 완료");
  }

  async function resetAccountPassword(accountId: string, password: string) {
    if (hasVersion3ServerSession()) {
      await callVersion3Server<boolean>(`/accounts/${encodeURIComponent(accountId)}/password`, { method: "PATCH", body: { password } });
      patchAccount(accountId, { mustChangePassword: true, status: "active" });
      await refreshServerAccountHistory();
      setSource("server");
      setError("");
      showUiToast("비밀번호 초기화 완료");
      return;
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (!token) throw new Error("비밀번호 초기화는 Version.3 서버 또는 Apps Script 로그인 세션이 필요합니다.");

    await callAppsScript<boolean>("resetAccountPassword", token, { accountId, password });
    patchAccount(accountId, { mustChangePassword: true, status: "active" });
    await refreshAccountHistory(token);
    setSource("live");
    setError("");
    showUiToast("비밀번호 초기화 완료");
  }

  async function updateAccountPermissions(accountId: string, permissions: Version3Permissions) {
    const nextPermissions = normalizePermissions(permissions);
    if (hasVersion3ServerSession()) {
      await callVersion3Server<boolean>(`/accounts/${encodeURIComponent(accountId)}/permissions`, { method: "PATCH", body: { permissions: nextPermissions } });
      patchAccount(accountId, { permissions: nextPermissions });
      await refreshServerAccountHistory();
      setSource("server");
      setError("");
      showUiToast("권한 저장 완료");
      return;
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (!token) throw new Error("권한 변경은 Version.3 서버 또는 Apps Script 로그인 세션이 필요합니다.");

    await callAppsScript<boolean>("updateAccountPermissions", token, { accountId, permissions: nextPermissions });
    patchAccount(accountId, { permissions: nextPermissions });
    await refreshAccountHistory(token);
    setSource("live");
    setError("");
    showUiToast("권한 저장 완료");
  }

  function patchAccount(accountId: string, patch: Partial<Version3Account>) {
    setAccounts((current) => current.map((account) => (account.id === accountId ? { ...account, ...patch } : account)));
  }

  async function refreshAccountHistory(token: string) {
    const historyRecords = await callAppsScript<AccountRecord[]>("listAccountHistory", token);
    setAccountHistory(historyRecords.map(mapAccountHistory));
  }

  async function refreshServerAccountHistory() {
    const historyRecords = await callVersion3Server<AccountRecord[]>("/account-history");
    setAccountHistory(historyRecords.map(mapServerAccountHistory));
  }

  return {
    source,
    accounts: sortedAccounts,
    accountHistory,
    currentAccountId: readCurrentAccountId(),
    error,
    hasLiveSession,
    createAccount,
    resetAccountPassword,
    updateAccountPermissions,
    updateAccountStatus
  };
}

function readCurrentAccountId() {
  if (typeof window === "undefined") return "";
  try {
    const serverUser = JSON.parse(window.localStorage.getItem("bonsung_server_current_user") || "{}") as { accountId?: unknown; account_id?: unknown; id?: unknown };
    const serverAccountId = stringValue(serverUser.accountId || serverUser.account_id || serverUser.id);
    if (serverAccountId) return serverAccountId;
  } catch {
    // Ignore malformed optional server user cache.
  }

  const rawUser = window.localStorage.getItem(APPS_SCRIPT_USER_KEY);
  if (!rawUser) return "";
  try {
    const user = JSON.parse(rawUser) as { account_id?: unknown; id?: unknown };
    return stringValue(user.account_id || user.id);
  } catch {
    return "";
  }
}

function mapServerAccount(item: AccountRecord): Version3Account {
  const linkedStudentId = stringValue(item.linkedStudentId || item.linked_student_id);
  return {
    id: stringValue(item.id || item.accountId || item.account_id),
    loginId: stringValue(item.loginId || item.login_id),
    name: stringValue(item.name, "이름 없음"),
    role: normalizeAccountRole(item.role, item.employeePosition || item.employee_position),
    email: stringValue(item.email),
    phone: stringValue(item.phone),
    linkedStudentId,
    linkedStudentName: stringValue(item.linkedStudentName || item.linked_student_name),
    status: normalizeAccountStatus(item.status || item.active),
    mustChangePassword: truthyValue(item.mustChangePassword ?? item.must_change_password),
    permissions: normalizePermissions(item.permissions),
    lastLoginAt: stringValue(item.lastLoginAt || item.last_login_at),
    createdAt: stringValue(item.createdAt || item.created_at)
  };
}

function mapServerAccountHistory(item: AccountRecord): Version3AccountHistory {
  return {
    id: stringValue(item.id || item.historyId || item.history_id || item.event_id),
    accountId: stringValue(item.accountId || item.account_id || item.target_id),
    accountName: stringValue(item.accountName || item.account_name),
    actorId: stringValue(item.actorId || item.actor_id),
    actorName: stringValue(item.actorName || item.actor_name),
    action: stringValue(item.action),
    role: stringValue(item.role),
    beforePermissions: normalizePermissions(item.beforePermissions || item.permissions_before),
    afterPermissions: normalizePermissions(item.afterPermissions || item.permissions_after),
    occurredAt: stringValue(item.occurredAt || item.occurred_at)
  };
}

async function callAppsScript<T>(action: string, token: string, payload: Record<string, unknown> = {}) {
  if (!APPS_SCRIPT_ENDPOINT.trim()) {
    throw new Error("Apps Script Web App URL이 설정되지 않았습니다.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), APPS_SCRIPT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(APPS_SCRIPT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token, ...payload }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`Apps Script 응답 오류 (${response.status})`);
    const result = (await response.json()) as ApiResult<T>;
    if (!result.ok) throw new Error(result.error || "Apps Script 요청을 처리하지 못했습니다.");
    return result.data as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function mapAccount(item: AccountRecord): Version3Account {
  const linkedStudentId = stringValue(item.linked_student_id || item.linkedStudentId);
  return {
    id: stringValue(item.account_id || item.id),
    loginId: stringValue(item.login_id || item.loginId),
    name: stringValue(item.name, "이름 없음"),
    role: normalizeAccountRole(item.role, item.employee_position),
    email: stringValue(item.email),
    phone: stringValue(item.phone),
    linkedStudentId,
    linkedStudentName: stringValue(item.linked_student_name || item.linkedStudentName),
    status: normalizeAccountStatus(item.active || item.status),
    mustChangePassword: truthyValue(item.must_change_password ?? item.mustChangePassword),
    permissions: normalizePermissions(item.permissions),
    lastLoginAt: stringValue(item.last_login_at || item.lastLoginAt),
    createdAt: stringValue(item.created_at || item.createdAt)
  };
}

function mapAccountHistory(item: AccountRecord): Version3AccountHistory {
  return {
    id: stringValue(item.history_id || item.event_id || item.id),
    accountId: stringValue(item.account_id || item.target_id || item.accountId),
    accountName: stringValue(item.account_name || item.accountName),
    actorId: stringValue(item.actor_id || item.actorId),
    actorName: stringValue(item.actor_name || item.actorName),
    action: stringValue(item.action),
    role: stringValue(item.role),
    beforePermissions: normalizePermissions(item.permissions_before || item.beforePermissions),
    afterPermissions: normalizePermissions(item.permissions_after || item.afterPermissions),
    occurredAt: stringValue(item.occurred_at || item.occurredAt)
  };
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function truthyValue(value: unknown) {
  return value === true || value === "true" || value === "TRUE" || value === "1" || value === 1;
}

function normalizePermissions(value: unknown): Version3Permissions {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  return version3PermissionKeys.reduce<Version3Permissions>((result, key) => {
    if (typeof source[key] === "boolean") result[key] = source[key];
    return result;
  }, {});
}

export function roleLabel(role: Version3Account["role"]) {
  return version3RoleLabels[role];
}
