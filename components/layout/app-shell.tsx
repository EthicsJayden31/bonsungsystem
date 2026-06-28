"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { assetPath } from "@/lib/assets";
import { canAccess, type CurrentUser, type Role } from "@/lib/auth-shared";
import {
  APPS_SCRIPT_ENDPOINT,
  APPS_SCRIPT_SESSION_TOKEN_KEY,
  APPS_SCRIPT_USER_KEY,
  type AppsScriptUser
} from "@/lib/apps-script-client";
import { usePreferences } from "@/lib/preferences";
import { usePreviewRole } from "@/lib/use-preview-role";

type NavItem = {
  href: string;
  label: string;
  area: string;
  tab?: "home" | "people" | "classes" | "attendance" | "more";
};

type NavGroup = {
  title: string;
  helper: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "오늘 운영",
    helper: "오늘 먼저 확인할 일",
    items: [
      { href: "/dashboard", label: "홈", area: "dashboard", tab: "home" },
      { href: "/data-quality", label: "데이터 점검", area: "data-quality", tab: "more" },
      { href: "/tasks", label: "업무", area: "tasks", tab: "more" },
      { href: "/notices", label: "공지/문서", area: "notices", tab: "more" }
    ]
  },
  {
    title: "사람",
    helper: "학생, 강사, 보호자, 상담",
    items: [
      { href: "/students", label: "학생", area: "students", tab: "people" },
      { href: "/teachers", label: "강사", area: "teachers", tab: "more" },
      { href: "/guardians", label: "보호자", area: "guardians", tab: "more" },
      { href: "/consultations", label: "상담", area: "consultations", tab: "more" }
    ]
  },
  {
    title: "수업과 공간",
    helper: "강의, 출결, 예약",
    items: [
      { href: "/enrollments", label: "수강", area: "enrollments", tab: "more" },
      { href: "/lessons", label: "수업", area: "lessons", tab: "classes" },
      { href: "/attendance", label: "출결", area: "attendance", tab: "attendance" },
      { href: "/lesson-notes", label: "레슨노트", area: "lesson-notes", tab: "more" },
      { href: "/practice-rooms", label: "공간 예약", area: "practice-rooms", tab: "more" }
    ]
  },
  {
    title: "관리",
    helper: "수납과 개인 설정",
    items: [
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
  consultations: { title: "상담", description: "신규 문의부터 등록 전환까지 상담 흐름을 추적합니다.", action: "상담 등록" },
  enrollments: { title: "수강", description: "수강 과목, 담당 강사, 시작일과 상태를 관리합니다.", action: "수강 등록" },
  lessons: { title: "수업", description: "오늘의 수업 일정과 완료 상태를 확인합니다.", action: "수업 추가" },
  attendance: { title: "출결", description: "출석, 지각, 결석, 보강 필요 여부를 기록합니다.", action: "출결 입력" },
  "lesson-notes": { title: "레슨노트", description: "수업 내용, 과제, 다음 목표를 일관되게 남깁니다.", action: "노트 추가" },
  "practice-rooms": { title: "공간 예약", description: "강의실과 연습실의 예약 상태를 시각적으로 확인합니다.", action: "예약 추가" },
  payments: { title: "수납", description: "청구, 입금, 미납, 환불 상태를 분리해 확인합니다.", action: "결제 등록" },
  "data-quality": { title: "데이터 점검", description: "Google Sheets 운영 데이터의 누락, 중복, 참조 오류를 확인합니다.", action: "점검 새로고침" },
  tasks: { title: "업무", description: "운영 업무의 담당자, 마감일, 우선순위를 관리합니다.", action: "업무 추가" },
  notices: { title: "공지/문서", description: "운영 기준과 강사 매뉴얼을 정리합니다.", action: "문서 작성" },
  "profile-settings": { title: "개인화 설정", description: "내 화면 방식, 시작 화면, 메뉴 표시 방식을 조정합니다.", action: "설정 저장" }
};

const roleLabel: Record<Role, string> = {
  admin: "원장 관리자",
  staff: "운영 스태프",
  teacher: "강사"
};

const previewUsers: Record<Role, CurrentUser> = {
  admin: { id: "admin-1", name: "원장 관리자", email: "admin@bonsung.test", role: "admin" },
  staff: { id: "staff-1", name: "운영 스태프", email: "staff@bonsung.test", role: "staff" },
  teacher: { id: "teacher-1", name: "강사 계정", email: "teacher@bonsung.test", role: "teacher" }
};

const bottomTabs: Array<{ id: NonNullable<NavItem["tab"]>; label: string; fallbackHref: string; areas: string[] }> = [
  { id: "home", label: "홈", fallbackHref: "/dashboard", areas: ["dashboard"] },
  { id: "people", label: "학생", fallbackHref: "/students", areas: ["students"] },
  { id: "classes", label: "수업", fallbackHref: "/lessons", areas: ["lessons"] },
  { id: "attendance", label: "출결", fallbackHref: "/attendance", areas: ["attendance"] },
  { id: "more", label: "더보기", fallbackHref: "#app-menu", areas: [] }
];

export function AppShell({ children, area = "dashboard" }: { children: ReactNode; area?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = usePreviewRole();
  const preferences = usePreferences();
  const user = useMemo(() => (role ? getSessionUser(role) ?? previewUsers[role] : null), [role]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("bonsung_role") as Role | null;
    if (!stored) {
      router.replace("/login");
      return;
    }
    if (stored === "teacher" && pathname.startsWith("/payments")) {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

  function logout() {
    const token = window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY);
    if (token) {
      fetch(APPS_SCRIPT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "logout", token })
      }).catch(() => {});
    }
    window.localStorage.removeItem("bonsung_role");
    window.localStorage.removeItem(APPS_SCRIPT_SESSION_TOKEN_KEY);
    window.localStorage.removeItem(APPS_SCRIPT_USER_KEY);
    router.push("/login");
  }

  if (!user || !canAccess(user.role, area)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-sm text-muted">
        화면을 준비하고 있습니다.
      </div>
    );
  }

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccess(user.role, item.area)) }))
    .filter((group) => group.items.length > 0);
  const current = pageCopy[area] ?? pageCopy.dashboard;
  const compact = preferences.density === "compact";

  return (
    <div className={`min-h-screen bg-canvas ${compact ? "text-[95%]" : ""}`}>
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-white px-5 py-5 lg:block">
        <BrandBlock />
        <nav className="mt-6 space-y-5" aria-label="주요 메뉴">
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">{group.title}</p>
              <div className="space-y-1.5">
                {group.items.map((item) => <NavLink item={item} pathname={pathname} key={item.href} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 space-y-3">
          <Link className="block rounded-2xl border border-brand/10 bg-brand/5 p-4 text-sm font-bold text-brand hover:bg-brand/10" href="/legacy-preview/">
            실사용 legacy 화면
          </Link>
          <p className="rounded-2xl border border-line bg-surface-muted p-4 text-xs leading-5 text-muted">
            Next 공식 UI는 실사용 세션 토큰이 있으면 Apps Script 데이터를 읽고, 없으면 preview 데이터로 화면을 보여줍니다.
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-white/92 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <BrandSeal size={36} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold tracking-tight text-ink sm:text-xl">{current.title}</p>
                <p className="hidden text-xs text-muted sm:block">{current.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link className="hidden rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-brand hover:border-brand/40 md:inline-flex" href="/legacy-preview/">
                legacy
              </Link>
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

        <MobileHomeStrip groups={visibleGroups} currentArea={area} mode={preferences.mobileMenu} />
        <main className={`mx-auto max-w-7xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 lg:pb-8 ${compact ? "sm:py-5" : "sm:py-8"}`}>{children}</main>
      </div>

      <MobileBottomTabs groups={visibleGroups} pathname={pathname} area={area} onMore={() => setMenuOpen(true)} />
      <MobileMenuSheet groups={visibleGroups} open={menuOpen} pathname={pathname} role={user.role} mode={preferences.mobileMenu} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href;
  return (
    <Link
      className={`group relative block rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
        active ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-brand/5 hover:text-brand"
      }`}
      href={item.href}
      aria-current={active ? "page" : undefined}
    >
      {active ? <span className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-white/80" /> : null}
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
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${
              item.area === currentArea ? "border-brand bg-brand text-white" : "border-line bg-surface-muted text-muted"
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
  onMore
}: {
  groups: NavGroup[];
  pathname: string;
  area: string;
  onMore: () => void;
}) {
  const allItems = groups.flatMap((group) => group.items);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/96 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_38px_rgba(60,6,8,0.08)] backdrop-blur lg:hidden"
      aria-label="앱 하단 메뉴"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {bottomTabs.map((tab) => {
          const target = allItems.find((item) => item.tab === tab.id) ?? allItems.find((item) => item.href === tab.fallbackHref);
          const href = target?.href ?? tab.fallbackHref;
          const active = tab.id === "more" ? !bottomTabs.slice(0, 4).some((item) => item.areas.includes(area)) : pathname === href || tab.areas.includes(area);
          if (tab.id === "more") {
            return (
              <button
                className={`rounded-2xl px-2 py-2 text-center text-[11px] font-extrabold transition ${active ? "bg-brand text-white" : "text-muted hover:bg-brand/5 hover:text-brand"}`}
                key={tab.id}
                onClick={onMore}
                type="button"
              >
                <span className="block text-base leading-4">+</span>
                {tab.label}
              </button>
            );
          }

          return (
            <Link
              className={`rounded-2xl px-2 py-2 text-center text-[11px] font-extrabold transition ${active ? "bg-brand text-white" : "text-muted hover:bg-brand/5 hover:text-brand"}`}
              href={href}
              key={tab.id}
              aria-current={active ? "page" : undefined}
            >
              <span className="block text-base leading-4">{tab.label.slice(0, 1)}</span>
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
    <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
      <button className="absolute inset-0 h-full w-full cursor-default" aria-label="메뉴 닫기" onClick={onClose} type="button" />
      <section className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[28px] bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-20px_60px_rgba(0,0,0,0.16)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <BrandBlock compact />
          <button className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-muted" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="grid gap-3">
          {groups.map((group) => (
            <section className="rounded-2xl border border-line bg-surface-muted p-3" key={group.title}>
              <div className="mb-3">
                <p className="text-sm font-extrabold text-ink">{group.title}</p>
                <p className="mt-1 text-xs text-muted">{group.helper}</p>
              </div>
              <div className={`grid gap-2 ${mode === "expanded" ? "grid-cols-1" : "grid-cols-2"}`}>
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold ${active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink"}`}
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
          <Link className="rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 text-sm font-extrabold text-brand" href="/legacy-preview/" onClick={onClose}>
            실사용 legacy 화면
          </Link>
          <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs leading-5 text-muted">
            현재 권한은 {roleLabel[role]}입니다. 권한에 맞지 않는 수납, 데이터 점검 메뉴는 자동으로 숨겨집니다.
          </p>
        </div>
      </section>
    </div>
  );
}

function getSessionUser(role: Role): CurrentUser | null {
  if (typeof window === "undefined" || !window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY)) return null;

  try {
    const user = JSON.parse(window.localStorage.getItem(APPS_SCRIPT_USER_KEY) || "null") as AppsScriptUser | null;
    if (!user || user.role !== role || !(user.account_id || user.id) || !user.name) return null;
    return {
      id: String(user.account_id || user.id),
      name: user.name,
      email: user.email || "",
      role
    };
  } catch {
    return null;
  }
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
    <Image
      src={assetPath("/brand/bonsung-logo-seal.png")}
      alt="본성뮤직 아카데미 로고"
      width={size}
      height={size}
      className="shrink-0 rounded-full object-contain shadow-sm"
      priority
    />
  );
}
