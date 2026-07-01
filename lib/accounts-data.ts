"use client";

import { useEffect, useMemo, useState } from "react";
import { students } from "@/lib/demo-data";
import { APPS_SCRIPT_ENDPOINT, APPS_SCRIPT_SESSION_TOKEN_KEY, APPS_SCRIPT_USER_KEY } from "@/lib/apps-script-client";
import { normalizeRole, type Role } from "@/lib/auth-shared";
import { PREVIEW_ACCOUNT_DRAFTS_KEY, PREVIEW_ACCOUNT_HISTORY_KEY } from "@/lib/client-session";
import { callVersion3Server, hasVersion3ServerSession } from "@/lib/version3-server-client";
import { ENABLE_APPS_SCRIPT_TRANSITION, ENABLE_PREVIEW_LOGIN } from "@/lib/version3-runtime-flags";
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

type AccountSource = "loading" | "server" | "live" | "preview" | "fallback";

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

const previewAccounts: Version3Account[] = [
  {
    id: "owner-1",
    loginId: "owner",
    name: "대표 계정",
    role: "owner",
    email: "owner@bonsung.test",
    phone: "",
    linkedStudentId: "",
    status: "active",
    mustChangePassword: false,
    permissions: {},
    lastLoginAt: "",
    createdAt: "2026-07-01"
  },
  {
    id: "manager-1",
    loginId: "manager",
    name: "매니저 계정",
    role: "manager",
    email: "manager@bonsung.test",
    phone: "",
    linkedStudentId: "",
    status: "active",
    mustChangePassword: false,
    permissions: {},
    lastLoginAt: "",
    createdAt: "2026-07-01"
  },
  {
    id: "teacher-1",
    loginId: "teacher",
    name: "강사 계정",
    role: "teacher",
    email: "teacher@bonsung.test",
    phone: "",
    linkedStudentId: "",
    status: "active",
    mustChangePassword: false,
    permissions: {},
    lastLoginAt: "",
    createdAt: "2026-07-01"
  },
  {
    id: "student-1-account",
    loginId: "student",
    name: "수강생 계정",
    role: "student",
    email: "student@bonsung.test",
    phone: "",
    linkedStudentId: "student-1",
    linkedStudentName: students.find((student) => student.id === "student-1")?.name,
    status: "active",
    mustChangePassword: true,
    permissions: {},
    lastLoginAt: "",
    createdAt: "2026-07-01"
  }
];

const previewAccountIds: Record<Role, string> = {
  owner: "owner-1",
  manager: "manager-1",
  teacher: "teacher-1",
  student: "student-1-account"
};

const previewAccountHistory: Version3AccountHistory[] = [
  {
    id: "account-history-1",
    accountId: "manager-1",
    accountName: "매니저 계정",
    actorId: "owner-1",
    actorName: "대표 계정",
    action: "create_account",
    role: "manager",
    occurredAt: "2026-07-01T09:10:00+09:00"
  },
  {
    id: "account-history-2",
    accountId: "student-1-account",
    accountName: "수강생 계정",
    actorId: "owner-1",
    actorName: "대표 계정",
    action: "reset_password",
    role: "student",
    occurredAt: "2026-07-01T09:35:00+09:00"
  }
];

export function useAccountsData(options: AccountsDataOptions = {}): AccountsState {
  const enabled = options.enabled ?? true;
  const [source, setSource] = useState<AccountSource>("loading");
  const [accounts, setAccounts] = useState<Version3Account[]>(() => (ENABLE_PREVIEW_LOGIN ? previewAccounts : []));
  const [accountHistory, setAccountHistory] = useState<Version3AccountHistory[]>(() => (ENABLE_PREVIEW_LOGIN ? readPreviewAccountHistory() : []));
  const [drafts, setDrafts] = useState<Version3Account[]>(() => (ENABLE_PREVIEW_LOGIN ? readPreviewAccountDrafts() : []));
  const [error, setError] = useState("");
  const mergedAccounts = useMemo(() => [...drafts, ...accounts], [accounts, drafts]);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      queueMicrotask(() => {
        if (!active) return;
        setAccounts([]);
        setDrafts([]);
        setAccountHistory([]);
        setSource("preview");
        setError("");
      });
      return () => {
        active = false;
      };
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (hasVersion3ServerSession()) {
      queueMicrotask(() => {
        if (!active) return;
        setSource("loading");
      });
      Promise.all([
        callVersion3Server<AccountRecord[]>("/accounts"),
        callVersion3Server<AccountRecord[]>("/account-history")
      ])
        .then(([records, historyRecords]) => {
          if (!active) return;
          setAccounts(records.map(mapServerAccount));
          setAccountHistory(historyRecords.map(mapServerAccountHistory));
          setDrafts([]);
          setSource("server");
          setError("");
        })
        .catch((caught: unknown) => {
          if (!active) return;
          if (!ENABLE_PREVIEW_LOGIN) {
            setAccounts([]);
            setAccountHistory([]);
            setDrafts([]);
          }
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
        setSource(ENABLE_PREVIEW_LOGIN ? "preview" : "fallback");
        setAccounts(ENABLE_PREVIEW_LOGIN ? previewAccounts : []);
        setDrafts(ENABLE_PREVIEW_LOGIN ? readPreviewAccountDrafts() : []);
        setAccountHistory(ENABLE_PREVIEW_LOGIN ? readPreviewAccountHistory() : []);
        setError(ENABLE_PREVIEW_LOGIN ? "" : "Version.3 서버 로그인 세션이 필요합니다.");
      });
      return () => {
        active = false;
      };
    }

    queueMicrotask(() => {
      if (!active) return;
      setSource("loading");
    });
    Promise.all([
      callAppsScript<AccountRecord[]>("listAccounts", token),
      callAppsScript<AccountRecord[]>("listAccountHistory", token)
    ])
      .then(([records, historyRecords]) => {
        if (!active) return;
        setAccounts(records.map(mapAccount));
        setAccountHistory(historyRecords.map(mapAccountHistory));
        setDrafts([]);
        setSource("live");
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (!ENABLE_PREVIEW_LOGIN) {
          setAccounts([]);
          setAccountHistory([]);
          setDrafts([]);
        }
        setSource("fallback");
        setError(caught instanceof Error ? caught.message : String(caught));
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  async function createAccount(input: Version3AccountInput) {
    if (input.role === "student" && !input.linkedStudentId) {
      throw new Error("수강생 계정은 연결할 학생을 선택해야 합니다.");
    }
    if (input.role === "student" && mergedAccounts.some((account) => account.role === "student" && account.linkedStudentId === input.linkedStudentId)) {
      throw new Error("이미 수강생 계정과 연결된 학생입니다.");
    }
    if (hasVersion3ServerSession()) {
      const created = await callVersion3Server<AccountRecord>("/accounts", { method: "POST", body: { account: input } });
      setAccounts((current) => [mapServerAccount(created), ...current]);
      await refreshServerAccountHistory();
      setDrafts([]);
      setSource("server");
      setError("");
      return;
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (!token) {
      if (!ENABLE_PREVIEW_LOGIN) throw new Error("계정 생성은 Version.3 서버 로그인 세션이 필요합니다.");
      const draft = inputToDraft(input);
      setDrafts((current) => {
        const next = [draft, ...current];
        writePreviewAccountDrafts(next);
        return next;
      });
      prependAccountHistory(draft, "create_account");
      setSource("preview");
      return;
    }

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
        linked_student_id: input.role === "student" ? input.linkedStudentId : ""
      }
    });
    setAccounts((current) => [mapAccount(created), ...current]);
    await refreshAccountHistory(token);
    setDrafts([]);
    setSource("live");
    setError("");
  }

  async function updateAccountStatus(accountId: string, active: boolean) {
    if (hasVersion3ServerSession()) {
      await callVersion3Server<boolean>(`/accounts/${encodeURIComponent(accountId)}/status`, { method: "PATCH", body: { active } });
      patchAccount(accountId, { status: active ? "active" : "paused" });
      await refreshServerAccountHistory();
      setSource("server");
      setError("");
      return;
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (!token) {
      if (!ENABLE_PREVIEW_LOGIN) throw new Error("계정 상태 변경은 Version.3 서버 로그인 세션이 필요합니다.");
      patchAccount(accountId, { status: active ? "active" : "paused" });
      prependAccountHistory(accountId, active ? "activate_account" : "deactivate_account");
      setSource("preview");
      return;
    }

    await callAppsScript<boolean>("updateAccountStatus", token, { accountId, active });
    patchAccount(accountId, { status: active ? "active" : "paused" });
    await refreshAccountHistory(token);
    setSource("live");
    setError("");
  }

  async function resetAccountPassword(accountId: string, password: string) {
    if (hasVersion3ServerSession()) {
      await callVersion3Server<boolean>(`/accounts/${encodeURIComponent(accountId)}/password`, { method: "PATCH", body: { password } });
      patchAccount(accountId, { mustChangePassword: true, status: "active" });
      await refreshServerAccountHistory();
      setSource("server");
      setError("");
      return;
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (!token) {
      if (!ENABLE_PREVIEW_LOGIN) throw new Error("비밀번호 초기화는 Version.3 서버 로그인 세션이 필요합니다.");
      patchAccount(accountId, { mustChangePassword: true, status: "active" });
      prependAccountHistory(accountId, "reset_password");
      setSource("preview");
      return;
    }

    await callAppsScript<boolean>("resetAccountPassword", token, { accountId, password });
    patchAccount(accountId, { mustChangePassword: true, status: "active" });
    await refreshAccountHistory(token);
    setSource("live");
    setError("");
  }

  async function updateAccountPermissions(accountId: string, permissions: Version3Permissions) {
    const nextPermissions = normalizePermissions(permissions);
    const beforePermissions = mergedAccounts.find((account) => account.id === accountId)?.permissions || {};
    if (hasVersion3ServerSession()) {
      await callVersion3Server<boolean>(`/accounts/${encodeURIComponent(accountId)}/permissions`, { method: "PATCH", body: { permissions: nextPermissions } });
      patchAccount(accountId, { permissions: nextPermissions });
      await refreshServerAccountHistory();
      setSource("server");
      setError("");
      return;
    }

    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (!token) {
      if (!ENABLE_PREVIEW_LOGIN) throw new Error("권한 변경은 Version.3 서버 로그인 세션이 필요합니다.");
      patchAccount(accountId, { permissions: nextPermissions });
      prependAccountHistory(accountId, "update_permissions", beforePermissions, nextPermissions);
      setSource("preview");
      return;
    }

    await callAppsScript<boolean>("updateAccountPermissions", token, { accountId, permissions: nextPermissions });
    patchAccount(accountId, { permissions: nextPermissions });
    await refreshAccountHistory(token);
    setSource("live");
    setError("");
  }

  function patchAccount(accountId: string, patch: Partial<Version3Account>) {
    const applyPatch = (account: Version3Account) => (account.id === accountId ? { ...account, ...patch } : account);
    setAccounts((current) => current.map(applyPatch));
    setDrafts((current) => {
      const next = current.map(applyPatch);
      writePreviewAccountDrafts(next);
      return next;
    });
  }

  async function refreshAccountHistory(token: string) {
    const historyRecords = await callAppsScript<AccountRecord[]>("listAccountHistory", token);
    setAccountHistory(historyRecords.map(mapAccountHistory));
  }

  async function refreshServerAccountHistory() {
    const historyRecords = await callVersion3Server<AccountRecord[]>("/account-history");
    setAccountHistory(historyRecords.map(mapServerAccountHistory));
  }

  function prependAccountHistory(target: Version3Account | string, action: string, beforePermissions?: Version3Permissions, afterPermissions?: Version3Permissions) {
    const targetAccount = typeof target === "string" ? mergedAccounts.find((account) => account.id === target) : target;
    const actorId = readCurrentAccountId();
    const actor = mergedAccounts.find((account) => account.id === actorId);
    setAccountHistory((current) => {
      const next = [
        {
        id: `preview-account-history-${Date.now()}`,
        accountId: targetAccount?.id || (typeof target === "string" ? target : ""),
        accountName: targetAccount?.name || "계정",
        actorId,
        actorName: actor?.name || "대표 계정",
        action,
        role: targetAccount?.role || "",
        beforePermissions,
        afterPermissions,
        occurredAt: new Date().toISOString()
        },
        ...current
      ];
      writePreviewAccountHistory(next);
      return next;
    });
  }

  return {
    source,
    accounts: mergedAccounts,
    accountHistory,
    currentAccountId: readCurrentAccountId(),
    error,
    hasLiveSession: typeof window !== "undefined" && (hasVersion3ServerSession() || (ENABLE_APPS_SCRIPT_TRANSITION && Boolean(window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY)))),
    createAccount,
    resetAccountPassword,
    updateAccountPermissions,
    updateAccountStatus
  };
}

function readPreviewAccountDrafts() {
  return readJsonArray(PREVIEW_ACCOUNT_DRAFTS_KEY)
    .map((item) => normalizeStoredAccount(item))
    .filter((item): item is Version3Account => Boolean(item));
}

function writePreviewAccountDrafts(accounts: Version3Account[]) {
  writeJsonArray(PREVIEW_ACCOUNT_DRAFTS_KEY, accounts);
}

function readPreviewAccountHistory() {
  const stored = readJsonArray(PREVIEW_ACCOUNT_HISTORY_KEY)
    .map((item) => normalizeStoredAccountHistory(item))
    .filter((item): item is Version3AccountHistory => Boolean(item));
  return stored.length ? stored : previewAccountHistory;
}

function writePreviewAccountHistory(history: Version3AccountHistory[]) {
  writeJsonArray(PREVIEW_ACCOUNT_HISTORY_KEY, history.slice(0, 30));
}

function readCurrentAccountId() {
  if (typeof window === "undefined") return "";
  try {
    const serverUser = JSON.parse(window.localStorage.getItem("bonsung_server_current_user") || "{}") as { accountId?: unknown; account_id?: unknown; id?: unknown };
    const serverAccountId = stringValue(serverUser.accountId || serverUser.account_id || serverUser.id);
    if (serverAccountId) return serverAccountId;
  } catch {
    // Ignore malformed optional server user cache and fall back only when transition paths are enabled.
  }

  if (!ENABLE_APPS_SCRIPT_TRANSITION && !ENABLE_PREVIEW_LOGIN) return "";

  const rawUser = window.localStorage.getItem(APPS_SCRIPT_USER_KEY);
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser) as { account_id?: unknown; id?: unknown };
      return stringValue(user.account_id || user.id);
    } catch {
      return "";
    }
  }
  const role = normalizeRole(window.localStorage.getItem("bonsung_role") ?? "");
  return role ? previewAccountIds[role] : "";
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
    linkedStudentName: stringValue(item.linkedStudentName || item.linked_student_name) || students.find((student) => student.id === linkedStudentId)?.name,
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
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

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
  const linkedStudentId = stringValue(item.linked_student_id);
  return {
    id: stringValue(item.account_id),
    loginId: stringValue(item.login_id),
    name: stringValue(item.name, "이름 없음"),
    role: normalizeAccountRole(item.role, item.employee_position),
    email: stringValue(item.email),
    phone: stringValue(item.phone),
    linkedStudentId,
    linkedStudentName: students.find((student) => student.id === linkedStudentId)?.name,
    status: normalizeAccountStatus(item.active),
    mustChangePassword: truthyValue(item.must_change_password),
    permissions: normalizePermissions(item.permissions),
    lastLoginAt: stringValue(item.last_login_at),
    createdAt: stringValue(item.created_at)
  };
}

function mapAccountHistory(item: AccountRecord): Version3AccountHistory {
  return {
    id: stringValue(item.history_id || item.event_id),
    accountId: stringValue(item.account_id || item.target_id),
    accountName: stringValue(item.account_name),
    actorId: stringValue(item.actor_id),
    actorName: stringValue(item.actor_name),
    action: stringValue(item.action),
    role: stringValue(item.role),
    beforePermissions: normalizePermissions(item.permissions_before),
    afterPermissions: normalizePermissions(item.permissions_after),
    occurredAt: stringValue(item.occurred_at)
  };
}

function inputToDraft(input: Version3AccountInput): Version3Account {
  return {
    id: `draft-${Date.now()}`,
    loginId: input.loginId,
    name: input.name,
    role: input.role,
    email: input.email,
    phone: input.phone,
    linkedStudentId: input.role === "student" ? input.linkedStudentId : "",
    linkedStudentName: students.find((student) => student.id === input.linkedStudentId)?.name,
    status: "invited",
    mustChangePassword: true,
    permissions: {},
    lastLoginAt: "",
    createdAt: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date())
  };
}

function readJsonArray(key: string): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, value: unknown[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeStoredAccount(value: unknown): Version3Account | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const role = normalizeRole(stringValue(item.role));
  const status = stringValue(item.status);
  if (!role || !["active", "paused", "invited"].includes(status)) return null;
  const id = stringValue(item.id);
  const loginId = stringValue(item.loginId);
  const name = stringValue(item.name);
  if (!id || !loginId || !name) return null;
  return {
    id,
    loginId,
    name,
    role,
    email: stringValue(item.email),
    phone: stringValue(item.phone),
    linkedStudentId: role === "student" ? stringValue(item.linkedStudentId) : "",
    linkedStudentName: stringValue(item.linkedStudentName),
    status: status as Version3Account["status"],
    mustChangePassword: truthyValue(item.mustChangePassword),
    permissions: normalizePermissions(item.permissions),
    lastLoginAt: stringValue(item.lastLoginAt),
    createdAt: stringValue(item.createdAt)
  };
}

function normalizeStoredAccountHistory(value: unknown): Version3AccountHistory | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = stringValue(item.id);
  const accountId = stringValue(item.accountId);
  if (!id || !accountId) return null;
  return {
    id,
    accountId,
    accountName: stringValue(item.accountName, "계정"),
    actorId: stringValue(item.actorId),
    actorName: stringValue(item.actorName),
    action: stringValue(item.action),
    role: stringValue(item.role),
    beforePermissions: normalizePermissions(item.beforePermissions),
    afterPermissions: normalizePermissions(item.afterPermissions),
    occurredAt: stringValue(item.occurredAt)
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
