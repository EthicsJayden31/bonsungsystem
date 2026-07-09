"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { assetPath } from "@/lib/assets";
import { canAccessStageArea } from "@/lib/access-policy";
import { type CurrentUser, type Role } from "@/lib/auth-shared";
import {
  APPS_SCRIPT_ENDPOINT,
  APPS_SCRIPT_REQUEST_TIMEOUT_MS,
  APPS_SCRIPT_SESSION_TOKEN_KEY
} from "@/lib/apps-script-client";
import { clearClientSession, SESSION_CHANGE_EVENT } from "@/lib/client-session";
import { usePreferences } from "@/lib/preferences";
import { useCurrentUser } from "@/lib/use-current-user";
import { UI_LOADING_EVENT, UI_TOAST_EVENT, type UiLoadingDetail, type UiToastDetail } from "@/lib/ui-feedback";
import { callStageServer, hasStageServerSession, logoutStageServer, BONSUNG_SERVER_SESSION_TOKEN_KEY } from "@/lib/stage-server-client";
import { ENABLE_APPS_SCRIPT_TRANSITION, ENABLE_BUFFERED_APPS_SCRIPT_SYNC } from "@/lib/stage-runtime-flags";

type NavItem = {
  href: string;
  label: string;
  area: string;
  tab?: "home" | "people" | "classes" | "rooms" | "notices" | "support" | "more";
};

type NavGroup = {
  id: string;
  title: string;
  helper: string;
  items: NavItem[];
};

type DataConnectionStatus = "disconnected" | "unstable" | "connected";

type BufferedSyncStatus = {
  enabled?: boolean;
  configured?: boolean;
  status?: "disabled" | "disconnected" | "unstable" | "pending" | "connected";
  outbox?: {
    pending?: boolean;
    lastError?: string;
    failedAttempts?: number;
  };
};

const SIDEBAR_GROUP_STORAGE_KEY = "bonsung_sidebar_groups_v2";

const navGroups: NavGroup[] = [
  {
    id: "operations",
    title: "MAIN",
    helper: "오늘 먼저 확인할 일",
    items: [
      { href: "/dashboard", label: "홈", area: "dashboard", tab: "home" },
      { href: "/data-quality", label: "데이터 점검", area: "data-quality", tab: "more" },
      { href: "/tasks", label: "내부 운영", area: "tasks", tab: "more" },
      { href: "/notices", label: "공지", area: "notices", tab: "notices" }
    ]
  },
  {
    id: "roster",
    title: "ACADEMY",
    helper: "학생, 강사, 보호자, 상담",
    items: [
      { href: "/students", label: "학생", area: "students", tab: "people" },
      { href: "/teachers", label: "강사", area: "teachers", tab: "more" },
      { href: "/guardians", label: "보호자", area: "guardians", tab: "more" },
      { href: "/consultations", label: "상담요청", area: "consultations", tab: "support" }
    ]
  },
  {
    id: "classes",
    title: "CLASS",
    helper: "강의, 출결, 예약",
    items: [
      { href: "/enrollments", label: "수강", area: "enrollments", tab: "more" },
      { href: "/lessons", label: "수업", area: "lessons", tab: "classes" },
      { href: "/attendance", label: "출결", area: "attendance", tab: "more" },
      { href: "/lesson-notes", label: "레슨노트", area: "lesson-notes", tab: "more" },
      { href: "/practice-rooms", label: "공간 예약", area: "practice-rooms", tab: "rooms" }
    ]
  },
  {
    id: "administration",
    title: "SETTING",
    helper: "계정, 수납과 개인 설정",
    items: [
      { href: "/accounts", label: "계정", area: "accounts", tab: "more" },
      { href: "/payments", label: "수납", area: "payments", tab: "more" },
      { href: "/profile-settings", label: "개인화 설정", area: "profile-settings", tab: "more" }
    ]
  }
];

const _pageCopy: Record<string, { title: string; description: string; action: string }> = {
  dashboard: { title: "홈", description: "오늘의 수업, 상담, 출결, 납부 흐름을 빠르게 확인합니다.", action: "학생 등록" },
  students: { title: "학생", description: "학생 상태와 보호자, 담당 강사 정보를 한눈에 정리합니다.", action: "학생 등록" },
  teachers: { title: "강사", description: "강사별 학생, 수업, 레슨노트 흐름을 확인합니다.", action: "강사 등록" },
  guardians: { title: "보호자", description: "결제자와 비상연락 정보를 명확하게 관리합니다.", action: "보호자 등록" },
  consultations: { title: "상담요청", description: "수강생의 일방향 요청과 운영 확인 상태를 관리합니다.", action: "요청 작성" },
  enrollments: { title: "수강", description: "수강 과목, 담당 강사, 시작일과 상태를 관리합니다.", action: "수강 등록" },
  lessons: { title: "수업", description: "오늘의 수업 일정과 완료 상태를 확인합니다.", action: "수업 추가" },
  attendance: { title: "출결", description: "출석, 지각, 결석, 보강 필요 여부를 기록합니다.", action: "출결 입력" },
  "lesson-notes": { title: "레슨노트", description: "수업 내용, 과제, 다음 목표를 일관되게 남깁니다.", action: "노트 추가" },
  "practice-rooms": { title: "공간 예약", description: "강의실과 연습실의 예약 상태를 시각적으로 확인합니다.", action: "예약 추가" },
  accounts: { title: "계정 관리", description: "대표, 매니저, 강사, 수강생 계정과 학생 연결을 관리합니다.", action: "계정 입력" },
  payments: { title: "수납", description: "청구, 입금, 미납, 환불 상태를 분리해 확인합니다.", action: "결제 등록" },
  "data-quality": { title: "데이터 점검", description: "본성 스테이지 서버 운영 데이터의 누락, 중복, 참조 오류를 확인합니다.", action: "점검 새로고침" },
  tasks: { title: "내부 운영", description: "업무, 근태, 회의, 일정을 함께 관리합니다.", action: "업무 추가" },
  notices: { title: "공지/문서", description: "운영 기준과 강사 매뉴얼을 정리합니다.", action: "문서 작성" },
  "profile-settings": { title: "개인화 설정", description: "내 화면 방식, 시작 화면, 메뉴 표시 방식을 조정합니다.", action: "설정 저장" }
};

const _dashboardPageCopyByRole: Record<Role, { title: string; description: string; action: string }> = {
  admin: { title: "시스템 관리 홈", description: "계정, 권한, 데이터 점검과 시스템 로그를 확인합니다.", action: "데이터 점검" },
  manager: { title: "Manager 운영 홈", description: "상담요청, Artist·Coach·수업 관리 흐름을 확인합니다.", action: "Artist 관리" },
  coach: { title: "Coach 업무 홈", description: "담당 Artist, 수업, 출결, 레슨노트를 확인합니다.", action: "오늘 수업" },
  artist: { title: "Artist 홈", description: "공지, 수업, 레슨노트, 상담요청과 연습실 예약을 확인합니다.", action: "내 수업 확인" }
};

const _roleLabel: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  coach: "Coach",
  artist: "Artist"
};

const accountTypeLabel: Record<Role, string> = {
  admin: "admin",
  manager: "staff",
  coach: "coach",
  artist: "artist"
};

type BottomTab = { id: NonNullable<NavItem["tab"]>; label: string; icon: string; fallbackHref: string; areas: string[] };

const defaultBottomTabs: BottomTab[] = [
  { id: "home", label: "홈", icon: "H", fallbackHref: "/dashboard", areas: ["dashboard"] },
  { id: "people", label: "학생", icon: "S", fallbackHref: "/students", areas: ["students", "teachers", "guardians", "consultations"] },
  { id: "classes", label: "수업", icon: "L", fallbackHref: "/lessons", areas: ["lessons", "attendance", "lesson-notes", "enrollments"] },
  { id: "rooms", label: "예약", icon: "R", fallbackHref: "/practice-rooms", areas: ["practice-rooms"] },
  { id: "more", label: "메뉴", icon: "+", fallbackHref: "#app-menu", areas: [] }
];

const roleGroupCopy: Record<string, Partial<Record<Role, { title: string; helper: string }>>> = {
  operations: {
    artist: { title: "My Today", helper: "공지와 내 일정" },
    coach: { title: "Teaching Desk", helper: "수업과 확인할 일" }
  },
  roster: {
    artist: { title: "Support", helper: "상담요청" },
    coach: { title: "Artists", helper: "담당 Artist와 상담" },
    admin: { title: "Academy Roster", helper: "Artist, Coach, 보호자, 상담" },
    manager: { title: "Academy Roster", helper: "학생, 강사, 보호자, 상담" }
  },
  classes: {
    artist: { title: "Learning", helper: "수업, 노트, 연습실" },
    coach: { title: "Lessons & Rooms", helper: "수업, 출결, 예약" }
  },
  administration: {
    artist: { title: "My Settings", helper: "개인화 설정" },
    coach: { title: "My Settings", helper: "개인화 설정" }
  }
};

const studentBottomTabs: BottomTab[] = [
  { id: "home", label: "홈", icon: "H", fallbackHref: "/dashboard", areas: ["dashboard"] },
  { id: "notices", label: "공지", icon: "N", fallbackHref: "/notices", areas: ["notices"] },
  { id: "support", label: "상담", icon: "Q", fallbackHref: "/consultations", areas: ["consultations"] },
  { id: "classes", label: "수업", icon: "L", fallbackHref: "/lessons", areas: ["lessons", "lesson-notes"] },
  { id: "more", label: "메뉴", icon: "+", fallbackHref: "#app-menu", areas: [] }
];

const teacherBottomTabs: BottomTab[] = [
  { id: "home", label: "홈", icon: "H", fallbackHref: "/dashboard", areas: ["dashboard"] },
  { id: "people", label: "학생", icon: "S", fallbackHref: "/students", areas: ["students"] },
  { id: "classes", label: "수업", icon: "L", fallbackHref: "/lessons", areas: ["lessons", "attendance", "lesson-notes"] },
  { id: "rooms", label: "예약", icon: "R", fallbackHref: "/practice-rooms", areas: ["practice-rooms"] },
  { id: "more", label: "메뉴", icon: "+", fallbackHref: "#app-menu", areas: [] }
];

function bottomTabsFor(role: Role): BottomTab[] {
  if (role === "artist") return studentBottomTabs;
  if (role === "coach") return teacherBottomTabs;
  return defaultBottomTabs;
}

function readSidebarGroupState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SIDEBAR_GROUP_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

function saveSidebarGroupState(nextGroups: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_GROUP_STORAGE_KEY, JSON.stringify(nextGroups));
}

function useAppsScriptConnectionStatus(): DataConnectionStatus {
  const [status, setStatus] = useState<DataConnectionStatus>("disconnected");

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    async function check() {
      if (ENABLE_BUFFERED_APPS_SCRIPT_SYNC && hasStageServerSession()) {
        if (active) setStatus((current) => (current === "connected" ? "connected" : "unstable"));

        try {
          const sync = await callStageServer<BufferedSyncStatus>("/sync/status");
          const connected = Boolean(sync.enabled && sync.configured && sync.status === "connected" && !sync.outbox?.lastError);
          const unstable = Boolean(sync.enabled && sync.configured && (sync.status === "pending" || sync.status === "unstable" || sync.outbox?.pending || sync.outbox?.lastError || sync.outbox?.failedAttempts));
          if (active) setStatus(connected ? "connected" : unstable ? "unstable" : "disconnected");
        } catch {
          if (active) setStatus("unstable");
        } finally {
          if (active) timer = window.setTimeout(check, 60000);
        }
        return;
      }

      if (!ENABLE_APPS_SCRIPT_TRANSITION || !APPS_SCRIPT_ENDPOINT.trim()) {
        if (active) setStatus("disconnected");
        return;
      }

      const token = window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) || "";
      if (!token) {
        if (active) setStatus("disconnected");
        return;
      }

      if (active) setStatus((current) => (current === "connected" ? "connected" : "unstable"));

      try {
        const health = await postAppsScriptStatus<{ missingTabs?: unknown[] }>({ action: "health" });
        if (!health.ok || (Array.isArray(health.data?.missingTabs) && health.data.missingTabs.length > 0)) {
          if (active) setStatus("unstable");
          return;
        }

        const bootstrap = await postAppsScriptStatus<Record<string, unknown>>({ action: "bootstrap", token });
        const reflected = Boolean(
          bootstrap.ok &&
          bootstrap.data &&
          (Array.isArray(bootstrap.data.students) || Array.isArray(bootstrap.data.lessons) || Array.isArray(bootstrap.data.notices))
        );
        if (active) setStatus(reflected ? "connected" : "unstable");
      } catch (error) {
        const statusCode = error instanceof AppsScriptStatusError ? error.status : 0;
        if (active) setStatus(statusCode === 401 || statusCode === 403 ? "disconnected" : "unstable");
      } finally {
        if (active) timer = window.setTimeout(check, 60000);
      }
    }

    check();
    window.addEventListener(SESSION_CHANGE_EVENT, check);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(SESSION_CHANGE_EVENT, check);
    };
  }, []);

  return status;
}

type AppsScriptStatusResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

class AppsScriptStatusError extends Error {
  status: number;

  constructor(status: number) {
    super(`Apps Script status check failed (${status})`);
    this.status = status;
  }
}

async function postAppsScriptStatus<T>(body: Record<string, unknown>): Promise<AppsScriptStatusResult<T>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), APPS_SCRIPT_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(APPS_SCRIPT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) throw new AppsScriptStatusError(response.status);
    return await response.json() as AppsScriptStatusResult<T>;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function AppShell({ children, area = "dashboard" }: { children: ReactNode; area?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();
  const preferences = usePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => readSidebarGroupState());
  const connectionStatus = useAppsScriptConnectionStatus();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.mustChangePassword && area !== "profile-settings") {
      router.replace("/profile-settings?forcePasswordChange=1");
      return;
    }
    if (!canAccessStageArea(user, area)) {
      router.replace("/dashboard");
    }
  }, [area, pathname, router, user]);

  async function logout() {
    if (window.localStorage.getItem(BONSUNG_SERVER_SESSION_TOKEN_KEY)) {
      await logoutStageServer().catch(() => {});
    }
    const token = ENABLE_APPS_SCRIPT_TRANSITION ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) : "";
    if (token) {
      fetch(APPS_SCRIPT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "logout", token })
      }).catch(() => {});
    }
    clearClientSession();
    router.push("/login");
  }

  function setGroupOpen(groupId: string, nextOpen: boolean) {
    setExpandedGroups((currentGroups) => {
      const nextGroups = { ...currentGroups, [groupId]: nextOpen };
      saveSidebarGroupState(nextGroups);
      return nextGroups;
    });
  }

  if (!user || !canAccessStageArea(user, area)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-sm text-muted">
        <LoadingMark label="화면을 준비하고 있습니다." />
      </div>
    );
  }

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccessStageArea(user, item.area)) }))
    .filter((group) => group.items.length > 0);
  const sidebarGroups = filterSidebarGroups(visibleGroups, user.role, menuQuery);
  const compact = preferences.density === "compact";

  return (
    <div className={`min-h-screen bg-canvas lg:h-screen lg:overflow-hidden ${compact ? "text-[95%]" : ""}`}>
      <aside className="fixed inset-y-0 left-0 hidden h-screen w-72 flex-col border-r border-line bg-white px-5 py-5 lg:flex">
        <div className="shrink-0">
          <BrandBlock connectionStatus={connectionStatus} />
          <SidebarAccountBadge user={user} onLogout={logout} />
          <SidebarMenuSearch query={menuQuery} onChange={setMenuQuery} />
        </div>
        <nav className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-label="주요 메뉴">
          {sidebarGroups.length ? sidebarGroups.map((group) => (
            <SidebarGroup
              expanded={expandedGroups[group.id] ?? false}
              group={group}
              key={group.id}
              pathname={pathname}
              role={user.role}
              onToggle={() => setGroupOpen(group.id, !(expandedGroups[group.id] ?? false))}
            />
          )) : <SidebarEmptySearch />}
        </nav>
      </aside>

      <div className="lg:h-screen lg:overflow-y-auto lg:pl-72">
        <MobileAppHeader user={user} connectionStatus={connectionStatus} onMenu={() => setMenuOpen(true)} onLogout={logout} />
        <MobileHomeStrip groups={visibleGroups} currentArea={area} mode={preferences.mobileMenu} role={user.role} />
        <main className={`mx-auto max-w-7xl px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 lg:pb-8 ${compact ? "sm:py-5" : "sm:py-8"}`}>{children}</main>
      </div>

      <MobileBottomTabs groups={visibleGroups} pathname={pathname} area={area} role={user.role} onMore={() => setMenuOpen(true)} />
      <MobileMenuSheet groups={visibleGroups} open={menuOpen} pathname={pathname} role={user.role} mode={preferences.mobileMenu} onClose={() => setMenuOpen(false)} />
      <GlobalFeedbackLayer />
    </div>
  );
}

function SidebarGroup({
  expanded,
  group,
  pathname,
  role,
  onToggle
}: {
  expanded: boolean;
  group: NavGroup;
  pathname: string;
  role: Role;
  onToggle: () => void;
}) {
  const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const copy = groupCopyForRole(group, role);
  const controlId = `sidebar-group-${group.id}`;
  const activeItem = group.items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <section className={`rounded-[18px] border p-2 transition ${active ? "border-brand/30 bg-brand/5" : "border-line bg-surface-muted"}`}>
      <button
        className={`flex min-h-[58px] w-full items-center justify-between gap-3 rounded-[14px] border px-3 py-2 text-left transition ${
          active ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-white text-ink hover:border-brand/30 hover:bg-white"
        }`}
        type="button"
        aria-expanded={expanded}
        aria-controls={controlId}
        aria-label={`${copy.title} 메뉴 ${expanded ? "접기" : "펼치기"}`}
        onClick={onToggle}
      >
        <span className="grid min-w-0 gap-0.5">
          <span className="block truncate text-[12px] font-extrabold uppercase tracking-[0.12em]">{copy.title}</span>
          <span className={`block truncate text-[11px] font-semibold ${active ? "text-white/72" : "text-muted"}`}>
            {activeItem ? activeItem.label : copy.helper}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white/18 text-white" : "bg-surface-muted text-brand"}`}>
            <ChevronIcon expanded={expanded} />
          </span>
        </span>
      </button>
      {expanded ? (
        <div className="mt-2 space-y-1.5" id={controlId}>
          {group.items.map((item) => <NavLink item={item} pathname={pathname} key={item.href} />)}
        </div>
      ) : null}
    </section>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href;
  return (
    <Link
      className={`group relative flex min-h-11 items-center gap-2 rounded-[14px] border px-3.5 py-2.5 text-sm font-extrabold transition ${
        active ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-white text-muted hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
      }`}
      href={item.href}
      aria-current={active ? "page" : undefined}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-white" : "bg-line group-hover:bg-brand/40"}`} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function filterSidebarGroups(groups: NavGroup[], role: Role, query: string): NavGroup[] {
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  if (!normalized) return groups;

  return groups
    .map((group) => {
      const copy = groupCopyForRole(group, role);
      const groupMatches = matchesSidebarQuery([group.id, copy.title, copy.helper], normalized);
      const items = groupMatches
        ? group.items
        : group.items.filter((item) => matchesSidebarQuery([item.label, item.area, item.href], normalized));
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}

function matchesSidebarQuery(values: string[], query: string) {
  return values.some((value) => value.toLocaleLowerCase("ko-KR").includes(query));
}

function groupCopyForRole(group: NavGroup, role: Role) {
  const copy = roleGroupCopy[group.id]?.[role];
  return { title: group.title, helper: copy?.helper ?? group.helper };
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function MobileHomeStrip({ groups, currentArea, mode, role }: { groups: NavGroup[]; currentArea: string; mode: "grouped" | "expanded"; role: Role }) {
  const activeGroup = groups.find((group) => group.items.some((item) => item.area === currentArea)) ?? groups[0];
  if (!activeGroup) return null;
  const items = mode === "expanded" ? groups.flatMap((group) => group.items) : activeGroup.items;
  const copy = groupCopyForRole(activeGroup, role);

  return (
    <section className="border-b border-line bg-white px-4 py-3 lg:hidden" aria-label={mode === "expanded" ? "전체 메뉴 빠른 이동" : "현재 영역 빠른 이동"}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand">App Menu</p>
          <p className="text-sm font-extrabold text-ink">{mode === "expanded" ? "전체 업무" : copy.title}</p>
        </div>
        <p className="max-w-[12rem] truncate text-right text-xs text-muted">{mode === "expanded" ? "한 번에 펼쳐 보기" : copy.helper}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Link
            className={`shrink-0 rounded-2xl border px-4 py-3 text-sm font-extrabold ${
              item.area === currentArea ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-surface-muted text-ink"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function MobileBottomTabs({
  groups,
  pathname,
  area,
  role,
  onMore
}: {
  groups: NavGroup[];
  pathname: string;
  area: string;
  role: Role;
  onMore: () => void;
}) {
  const allItems = groups.flatMap((group) => group.items);
  const tabs = bottomTabsFor(role);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-white px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_38px_rgba(60,6,8,0.14)] [transform:translateZ(0)] lg:hidden"
      aria-label="앱 하단 메뉴"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1.5">
        {tabs.map((tab) => {
          const target = allItems.find((item) => item.tab === tab.id) ?? allItems.find((item) => item.href === tab.fallbackHref);
          const href = target?.href ?? tab.fallbackHref;
          const active = tab.id === "more" ? !tabs.slice(0, 4).some((item) => item.areas.includes(area)) : pathname === href || tab.areas.includes(area);
          const itemClass = `min-h-[60px] rounded-[18px] px-1.5 py-2 text-center text-[11px] font-extrabold transition ${
            active ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-brand/5 hover:text-brand"
          }`;
          if (tab.id === "more") {
            return (
              <button
                className={itemClass}
                key={tab.id}
                onClick={onMore}
                type="button"
              >
                <span className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ${active ? "bg-white/20" : "bg-surface-muted text-brand"}`}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          }

          return (
            <Link
              className={itemClass}
              href={href}
              key={tab.id}
              aria-current={active ? "page" : undefined}
            >
              <span className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ${active ? "bg-white/20" : "bg-surface-muted text-brand"}`}>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileMenuSheet({
  groups,
  open,
  pathname,
  role,
  mode,
  onClose
}: {
  groups: NavGroup[];
  open: boolean;
  pathname: string;
  role: Role;
  mode: "grouped" | "expanded";
  onClose: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 lg:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
      <button className="absolute inset-0 h-full w-full cursor-default" aria-label="메뉴 닫기" onClick={onClose} type="button" />
      <section className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-20px_60px_rgba(0,0,0,0.16)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <BrandBlock compact />
          <button className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-muted" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="grid gap-3">
          {groups.map((group) => {
            const copy = groupCopyForRole(group, role);
            const expanded = openGroups[group.id] ?? false;
            const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
            return (
              <section className={`rounded-[22px] border p-3 ${active ? "border-brand/30 bg-brand/5" : "border-line bg-surface-muted"}`} key={group.id}>
                <button
                  className={`flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left ${
                    active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink"
                  }`}
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenGroups((currentGroups) => ({ ...currentGroups, [group.id]: !expanded }))}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold tracking-[0.12em]">{copy.title}</span>
                    <span className={`mt-1 block truncate text-xs ${active ? "text-white/72" : "text-muted"}`}>{copy.helper}</span>
                  </span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? "bg-white/18" : "bg-surface-muted text-brand"}`}>
                    <ChevronIcon expanded={expanded} />
                  </span>
                </button>
                {expanded ? (
                  <div className={`mt-3 grid gap-2 ${mode === "expanded" ? "grid-cols-1" : "grid-cols-2"}`}>
                    {group.items.map((item) => {
                      const itemActive = pathname === item.href;
                      return (
                        <Link
                          className={`rounded-[18px] border px-3 py-4 text-sm font-extrabold ${itemActive ? "border-brand bg-brand text-white" : "border-line bg-white text-ink"}`}
                          href={item.href}
                          key={item.href}
                          onClick={onClose}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MobileAppHeader({
  user,
  connectionStatus,
  onMenu,
  onLogout
}: {
  user: CurrentUser;
  connectionStatus: DataConnectionStatus;
  onMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/96 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link className="flex min-w-0 items-center gap-2.5" href="/dashboard" aria-label="홈으로 이동">
          <BrandSeal size={40} />
          <ConnectionLightDot status={connectionStatus} />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-brand">본성뮤직 스테이지</p>
            <p className="truncate text-xs font-semibold text-muted">통합 관리 시스템</p>
          </div>
        </Link>
        <button className="rounded-2xl border border-line bg-surface-muted px-3 py-2 text-sm font-extrabold text-brand" type="button" onClick={onMenu}>
          메뉴
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-line bg-surface-muted px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-extrabold tracking-[0.16em] text-brand">{accountTypeLabel[user.role]}</p>
          <p className="truncate text-sm font-extrabold text-ink">{user.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-extrabold text-muted" href={accountSettingsHref(user)}>
            계정 관리
          </Link>
          <button className="rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white" type="button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

function SidebarMenuSearch({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-white p-2 shadow-sm">
      <label className="sr-only" htmlFor="sidebar-menu-search">
        메뉴 검색
      </label>
      <div className="flex items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border border-transparent bg-surface-muted px-3 py-2.5 text-sm font-bold text-ink outline-none transition placeholder:text-muted focus:border-brand/30 focus:bg-white"
          id="sidebar-menu-search"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder="메뉴 검색"
          type="search"
        />
        {query ? (
          <button className="shrink-0 rounded-xl bg-brand/10 px-3 py-2 text-xs font-extrabold text-brand hover:bg-brand/15" type="button" onClick={() => onChange("")}>
            지우기
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SidebarEmptySearch() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface-muted p-4 text-sm leading-6 text-muted">
      <p className="font-extrabold text-ink">검색 결과가 없습니다</p>
      <p className="mt-1">현재 권한에서 볼 수 있는 메뉴와 일치하는 항목이 없습니다.</p>
    </div>
  );
}

function SidebarAccountBadge({ user, onLogout }: { user: CurrentUser; onLogout: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold tracking-[0.16em] text-brand">{accountTypeLabel[user.role]}</p>
          <p className="mt-1 truncate text-sm font-extrabold text-ink">{user.name}</p>
        </div>
        <div className="grid w-[4.4rem] shrink-0 gap-1">
          <Link className="rounded-xl border border-line bg-white px-1.5 py-1.5 text-center text-[10px] font-extrabold text-muted hover:border-brand/40 hover:text-brand" href={accountSettingsHref(user)}>
            계정 관리
          </Link>
          <button className="rounded-xl bg-brand px-1.5 py-1.5 text-[10px] font-extrabold text-white hover:bg-brand-dark" type="button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

function accountSettingsHref(user: CurrentUser) {
  return canAccessStageArea(user, "accounts") ? "/accounts" : "/profile-settings";
}

function BrandBlock({ compact = false, connectionStatus = "disconnected" }: { compact?: boolean; connectionStatus?: DataConnectionStatus }) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-3 ${compact ? "" : "border-b border-line pb-5"}`}>
      <BrandSeal size={compact ? 44 : 52} />
      <ConnectionLightDot status={connectionStatus} />
      <div>
        <p className="text-lg font-extrabold tracking-tight text-brand">본성뮤직 스테이지</p>
        <p className="text-xs font-semibold text-muted">통합 관리 시스템</p>
      </div>
    </Link>
  );
}

function ConnectionLightDot({ status }: { status: DataConnectionStatus }) {
  const copy = {
    disconnected: "데이터 연동 안 됨",
    unstable: "데이터 연동 불안정",
    connected: "데이터 연동 완료 및 반영중"
  } satisfies Record<DataConnectionStatus, string>;
  const className = {
    disconnected: "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.14)]",
    unstable: "animate-pulse bg-orange-400 shadow-[0_0_0_3px_rgba(251,146,60,0.18)]",
    connected: "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.16)]"
  } satisfies Record<DataConnectionStatus, string>;

  return (
    <span
      aria-label={copy[status]}
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${className[status]}`}
      role="status"
      title={copy[status]}
    />
  );
}

function GlobalFeedbackLayer() {
  const [loading, setLoading] = useState<UiLoadingDetail>({ active: false, label: "" });
  const [toast, setToast] = useState<UiToastDetail | null>(null);

  useEffect(() => {
    const onLoading = (event: Event) => {
      const detail = (event as CustomEvent<UiLoadingDetail>).detail;
      setLoading(detail ?? { active: false });
    };
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<UiToastDetail>).detail;
      if (detail?.message) setToast({ ...detail, id: detail.id ?? Date.now() });
    };

    window.addEventListener(UI_LOADING_EVENT, onLoading);
    window.addEventListener(UI_TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(UI_LOADING_EVENT, onLoading);
      window.removeEventListener(UI_TOAST_EVENT, onToast);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {loading.active ? (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-white/40 backdrop-blur-[1px]" role="status" aria-live="polite">
          <LoadingMark label={loading.label || "처리 중"} />
        </div>
      ) : null}
      {toast ? (
        <div
          className={`fixed left-1/2 top-5 z-[100] -translate-x-1/2 rounded-2xl border px-5 py-3 text-sm font-extrabold shadow-[0_18px_46px_rgba(0,0,0,0.16)] backdrop-blur transition ${
            toast.tone === "error"
              ? "border-danger/25 bg-white/90 text-danger"
              : toast.tone === "info"
                ? "border-line bg-white/90 text-ink"
                : "border-success/20 bg-white/90 text-success"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}

function LoadingMark({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/92 px-5 py-4 text-sm font-extrabold text-ink shadow-card">
      <span className="relative flex h-6 w-6 items-center justify-center" aria-hidden="true">
        <span className="absolute h-6 w-6 animate-ping rounded-full bg-brand/20" />
        <span className="h-3 w-3 animate-pulse rounded-full bg-brand" />
      </span>
      {label}
    </div>
  );
}

function BrandSeal({ size }: { size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand/15 bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <Image
        src={assetPath("/brand/bonsung-logo-seal.png")}
        alt="본성뮤직 아카데미 로고"
        width={size - 4}
        height={size - 4}
        className="h-[calc(100%-4px)] w-[calc(100%-4px)] rounded-full object-contain"
        priority
      />
    </span>
  );
}
