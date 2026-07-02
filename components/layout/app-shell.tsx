"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { assetPath } from "@/lib/assets";
import { canAccessVersion3Area } from "@/lib/access-policy";
import { normalizeRole, type CurrentUser, type Role } from "@/lib/auth-shared";
import {
  APPS_SCRIPT_ENDPOINT,
  APPS_SCRIPT_SESSION_TOKEN_KEY,
  APPS_SCRIPT_USER_KEY,
  type AppsScriptUser
} from "@/lib/apps-script-client";
import { clearClientSession, PREVIEW_ROLE_KEY, SESSION_CHANGE_EVENT } from "@/lib/client-session";
import { usePreferences } from "@/lib/preferences";
import { usePreviewRole } from "@/lib/use-preview-role";
import { hasVersion3TestSession, version3TestCurrentUser } from "@/lib/version3-test-mode";
import { logoutVersion3Server, VERSION3_SERVER_SESSION_TOKEN_KEY, VERSION3_SERVER_USER_KEY, type Version3ServerUser } from "@/lib/version3-server-client";
import { ENABLE_APPS_SCRIPT_TRANSITION, ENABLE_LEGACY_PREVIEW, ENABLE_PREVIEW_LOGIN } from "@/lib/version3-runtime-flags";

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

const navGroups: NavGroup[] = [
  {
    id: "operations",
    title: "Operations",
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
    title: "Academy Roster",
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
    title: "Classes & Rooms",
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
    title: "Administration",
    helper: "계정, 수납과 개인 설정",
    items: [
      { href: "/accounts", label: "계정", area: "accounts", tab: "more" },
      { href: "/payments", label: "수납", area: "payments", tab: "more" },
      { href: "/profile-settings", label: "개인화 설정", area: "profile-settings", tab: "more" }
    ]
  }
];

const pageCopy: Record<string, { title: string; description: string; action: string }> = {
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
  "data-quality": { title: "데이터 점검", description: "Version.3 서버 운영 데이터의 누락, 중복, 참조 오류를 확인합니다.", action: "점검 새로고침" },
  tasks: { title: "내부 운영", description: "업무, 근태, 회의, 일정을 함께 관리합니다.", action: "업무 추가" },
  notices: { title: "공지/문서", description: "운영 기준과 강사 매뉴얼을 정리합니다.", action: "문서 작성" },
  "profile-settings": { title: "개인화 설정", description: "내 화면 방식, 시작 화면, 메뉴 표시 방식을 조정합니다.", action: "설정 저장" }
};

const roleLabel: Record<Role, string> = {
  owner: "대표",
  manager: "매니저",
  teacher: "강사",
  student: "수강생"
};

const previewUsers: Record<Role, CurrentUser> = {
  owner: { id: "owner-1", name: "대표 계정", email: "owner@bonsung.test", role: "owner" },
  manager: { id: "manager-1", name: "매니저 계정", email: "manager@bonsung.test", role: "manager" },
  teacher: { id: "teacher-1", name: "강사 계정", email: "teacher@bonsung.test", role: "teacher" },
  student: { id: "student-1", name: "수강생 계정", email: "student@bonsung.test", role: "student" }
};

type BottomTab = { id: NonNullable<NavItem["tab"]>; label: string; icon: string; fallbackHref: string; areas: string[] };

const defaultBottomTabs: BottomTab[] = [
  { id: "home", label: "홈", icon: "H", fallbackHref: "/dashboard", areas: ["dashboard"] },
  { id: "people", label: "학생", icon: "S", fallbackHref: "/students", areas: ["students", "teachers", "guardians", "consultations"] },
  { id: "classes", label: "수업", icon: "L", fallbackHref: "/lessons", areas: ["lessons", "attendance", "lesson-notes", "enrollments"] },
  { id: "rooms", label: "예약", icon: "R", fallbackHref: "/practice-rooms", areas: ["practice-rooms"] },
  { id: "more", label: "메뉴", icon: "+", fallbackHref: "#app-menu", areas: [] }
];

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
  if (role === "student") return studentBottomTabs;
  if (role === "teacher") return teacherBottomTabs;
  return defaultBottomTabs;
}

export function AppShell({ children, area = "dashboard" }: { children: ReactNode; area?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = usePreviewRole();
  const preferences = usePreferences();
  const user = useMemo(() => (role ? getSessionUser(role) ?? (ENABLE_PREVIEW_LOGIN ? previewUsers[role] : null) : null), [role]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const syncTestingState = () => setTesting(hasVersion3TestSession());
    syncTestingState();
    window.addEventListener(SESSION_CHANGE_EVENT, syncTestingState);
    return () => window.removeEventListener(SESSION_CHANGE_EVENT, syncTestingState);
  }, []);

  useEffect(() => {
    const stored = normalizeRole(window.localStorage.getItem(PREVIEW_ROLE_KEY));
    if (!stored) {
      router.replace("/login");
      return;
    }
    const currentUser = getSessionUser(stored) ?? (ENABLE_PREVIEW_LOGIN ? previewUsers[stored] : null);
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (currentUser.mustChangePassword && area !== "profile-settings") {
      router.replace("/profile-settings?forcePasswordChange=1");
      return;
    }
    if (!canAccessVersion3Area(currentUser, area)) {
      router.replace("/dashboard");
    }
  }, [area, pathname, router]);

  async function logout() {
    if (window.localStorage.getItem(VERSION3_SERVER_SESSION_TOKEN_KEY)) {
      await logoutVersion3Server().catch(() => {});
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

  if (!user || !canAccessVersion3Area(user, area)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-sm text-muted">
        화면을 준비하고 있습니다.
      </div>
    );
  }

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccessVersion3Area(user, item.area)) }))
    .filter((group) => group.items.length > 0);
  const current = pageCopy[area] ?? pageCopy.dashboard;
  const compact = preferences.density === "compact";

  return (
    <div className={`min-h-screen bg-canvas lg:h-screen lg:overflow-hidden ${compact ? "text-[95%]" : ""}`}>
      <aside className="fixed inset-y-0 left-0 hidden h-screen w-72 flex-col border-r border-line bg-white px-5 py-5 lg:flex">
        <div className="shrink-0">
          <BrandBlock />
        </div>
        <nav className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-label="주요 메뉴">
          {visibleGroups.map((group) => (
            <SidebarGroup
              expanded={expandedGroups[group.id] ?? true}
              group={group}
              key={group.id}
              pathname={pathname}
              onToggle={() => setExpandedGroups((currentGroups) => ({ ...currentGroups, [group.id]: !(currentGroups[group.id] ?? true) }))}
            />
          ))}
        </nav>
        <div className="mt-4 shrink-0 space-y-3 border-t border-line pt-4">
          {ENABLE_LEGACY_PREVIEW ? (
            <Link className="block rounded-2xl border border-brand/10 bg-brand/5 p-4 text-sm font-bold text-brand hover:bg-brand/10" href={assetPath("/legacy-preview/")}>
              실사용 legacy 화면
            </Link>
          ) : null}
          <p className="rounded-2xl border border-line bg-surface-muted p-4 text-xs leading-5 text-muted">
            Version.3 UI는 별도 서버 세션을 기준으로 실사용 데이터를 읽습니다.
          </p>
        </div>
      </aside>

      <div className="lg:h-screen lg:overflow-y-auto lg:pl-72">
        <header className="sticky top-0 z-20 hidden border-b border-line bg-white/92 px-4 py-3 backdrop-blur lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold tracking-tight text-ink sm:text-xl">{current.title}</p>
                <p className="hidden text-xs text-muted sm:block">{current.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ENABLE_LEGACY_PREVIEW ? (
                <Link className="hidden rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-brand hover:border-brand/40 md:inline-flex" href={assetPath("/legacy-preview/")}>
                  legacy
                </Link>
              ) : null}
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-ink">{user.name}</p>
                <p className="text-xs text-muted">권한: {roleLabel[user.role]}</p>
              </div>
              <button className="hidden rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark md:inline-flex" type="button">
                {current.action}
              </button>
              <button className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-muted hover:border-brand/40 hover:text-brand" onClick={logout}>
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <MobileAppHeader current={current} user={user} onMenu={() => setMenuOpen(true)} onLogout={logout} />
        <MobileHomeStrip groups={visibleGroups} currentArea={area} mode={preferences.mobileMenu} />
        <main className={`mx-auto max-w-7xl px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 lg:pb-8 ${compact ? "sm:py-5" : "sm:py-8"}`}>{children}</main>
      </div>

      <MobileBottomTabs groups={visibleGroups} pathname={pathname} area={area} role={user.role} onMore={() => setMenuOpen(true)} />
      <MobileMenuSheet groups={visibleGroups} open={menuOpen} pathname={pathname} role={user.role} mode={preferences.mobileMenu} onClose={() => setMenuOpen(false)} />
      {testing ? <TestingPageMark /> : null}
    </div>
  );
}

function SidebarGroup({
  expanded,
  group,
  pathname,
  onToggle
}: {
  expanded: boolean;
  group: NavGroup;
  pathname: string;
  onToggle: () => void;
}) {
  const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <section className="rounded-[18px] border border-line bg-surface-muted p-2">
      <button
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left transition ${
          active ? "bg-brand text-white shadow-sm" : "bg-white text-ink hover:border-brand/20 hover:bg-brand/5"
        }`}
        type="button"
        aria-expanded={expanded}
        aria-label={`${group.title} 메뉴 ${expanded ? "접기" : "펼치기"}`}
        onClick={onToggle}
      >
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-extrabold uppercase tracking-[0.12em]">{group.title}</span>
          <span className={`mt-0.5 block truncate text-[11px] font-semibold ${active ? "text-white/70" : "text-muted"}`}>{group.helper}</span>
        </span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${active ? "bg-white/18 text-white" : "bg-surface-muted text-brand"}`}>
          {expanded ? "-" : "+"}
        </span>
      </button>
      {expanded ? (
        <div className="mt-2 space-y-1.5">
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
      className={`group relative block rounded-[14px] border px-3.5 py-2.5 text-sm font-extrabold transition ${
        active ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-white text-muted hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
      }`}
      href={item.href}
      aria-current={active ? "page" : undefined}
    >
      {item.label}
    </Link>
  );
}

function MobileHomeStrip({ groups, currentArea, mode }: { groups: NavGroup[]; currentArea: string; mode: "grouped" | "expanded" }) {
  const activeGroup = groups.find((group) => group.items.some((item) => item.area === currentArea)) ?? groups[0];
  if (!activeGroup) return null;
  const items = mode === "expanded" ? groups.flatMap((group) => group.items) : activeGroup.items;

  return (
    <section className="border-b border-line bg-white px-4 py-3 lg:hidden" aria-label={mode === "expanded" ? "전체 메뉴 빠른 이동" : "현재 영역 빠른 이동"}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand">App Menu</p>
          <p className="text-sm font-extrabold text-ink">{mode === "expanded" ? "전체 업무" : activeGroup.title}</p>
        </div>
        <p className="max-w-[12rem] truncate text-right text-xs text-muted">{mode === "expanded" ? "한 번에 펼쳐 보기" : activeGroup.helper}</p>
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
          {groups.map((group) => (
            <section className="rounded-[22px] border border-line bg-surface-muted p-3" key={group.title}>
              <div className="mb-3">
                <p className="text-sm font-extrabold text-ink">{group.title}</p>
                <p className="mt-1 text-xs text-muted">{group.helper}</p>
              </div>
              <div className={`grid gap-2 ${mode === "expanded" ? "grid-cols-1" : "grid-cols-2"}`}>
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      className={`rounded-[18px] border px-3 py-4 text-sm font-extrabold ${active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink"}`}
                      href={item.href}
                      key={item.href}
                      onClick={onClose}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {ENABLE_LEGACY_PREVIEW ? (
            <Link className="rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 text-sm font-extrabold text-brand" href={assetPath("/legacy-preview/")} onClick={onClose}>
              실사용 legacy 화면
            </Link>
          ) : null}
          <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs leading-5 text-muted">
            현재 권한은 {roleLabel[role]}입니다. 권한에 맞지 않는 수납, 데이터 점검 메뉴는 자동으로 숨겨집니다.
          </p>
        </div>
      </section>
    </div>
  );
}

function MobileAppHeader({
  current,
  user,
  onMenu,
  onLogout
}: {
  current: { title: string; description: string; action: string };
  user: CurrentUser;
  onMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/96 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link className="flex min-w-0 items-center gap-2.5" href="/dashboard" aria-label="홈으로 이동">
          <BrandSeal size={40} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">Bonsung Music</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-ink">{current.title}</h1>
          </div>
        </Link>
        <button className="rounded-2xl border border-line bg-surface-muted px-3 py-2 text-sm font-extrabold text-brand" type="button" onClick={onMenu}>
          메뉴
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-[20px] bg-brand px-4 py-3 text-white shadow-sm">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{current.action}</p>
          <p className="mt-0.5 truncate text-xs text-white/72">{user.name} · {roleLabel[user.role]}</p>
        </div>
        <button className="shrink-0 rounded-xl bg-white/12 px-3 py-2 text-xs font-extrabold text-white" type="button" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}

function getSessionUser(role: Role): CurrentUser | null {
  if (typeof window === "undefined") return null;

  const testUser = version3TestCurrentUser();
  if (testUser && testUser.role === role) return testUser;

  const serverToken = window.localStorage.getItem(VERSION3_SERVER_SESSION_TOKEN_KEY);
  if (serverToken) {
    const serverUser = sessionUserFromJson(role, window.localStorage.getItem(VERSION3_SERVER_USER_KEY), "server");
    if (serverUser) return serverUser;
  }

  if (!ENABLE_APPS_SCRIPT_TRANSITION || !window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY)) return null;

  return sessionUserFromJson(role, window.localStorage.getItem(APPS_SCRIPT_USER_KEY), "apps-script");
}

function sessionUserFromJson(role: Role, value: string | null, source: "server" | "apps-script"): CurrentUser | null {
  try {
    const user = JSON.parse(value || "null") as (AppsScriptUser & Version3ServerUser) | null;
    if (!user) return null;
    const normalizedRole = normalizeRole(user.role);
    if (!user || normalizedRole !== role || !(user.accountId || user.account_id || user.id) || !user.name) return null;
    return {
      id: String(user.accountId || user.account_id || user.id),
      name: user.name,
      email: user.email || "",
      role: normalizedRole,
      linkedStudentId: user.linkedStudentId || user.linked_student_id || "",
      mustChangePassword: source === "server" ? Boolean(user.mustChangePassword || user.must_change_password) : false,
      sessionExpiresAt: user.sessionExpiresAt || user.session_expires_at || "",
      permissions: user.permissions || {}
    };
  } catch {
    return null;
  }
}

function TestingPageMark() {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 select-none text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500/45">
      testing page
    </div>
  );
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-3 ${compact ? "" : "border-b border-line pb-5"}`}>
      <BrandSeal size={compact ? 44 : 52} />
      <div>
        <p className="text-lg font-extrabold tracking-tight text-brand">본성뮤직</p>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Music Academy</p>
      </div>
    </Link>
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
