"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { assetPath } from "@/lib/assets";
import { canAccess, type CurrentUser, type Role } from "@/lib/auth-shared";
import { usePreviewRole } from "@/lib/use-preview-role";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "대시보드", area: "dashboard" },
  { href: "/students", label: "학생", area: "students" },
  { href: "/guardians", label: "보호자", area: "guardians" },
  { href: "/consultations", label: "상담", area: "consultations" },
  { href: "/enrollments", label: "수강", area: "enrollments" },
  { href: "/lessons", label: "수업/시간표", area: "lessons" },
  { href: "/attendance", label: "출결", area: "attendance" },
  { href: "/lesson-notes", label: "레슨노트", area: "lesson-notes" },
  { href: "/practice-rooms", label: "연습실", area: "practice-rooms" },
  { href: "/payments", label: "수납", area: "payments" },
  { href: "/data-quality", label: "데이터 점검", area: "data-quality" },
  { href: "/tasks", label: "업무", area: "tasks" },
  { href: "/notices", label: "공지/문서", area: "notices" }
];

const pageCopy: Record<string, { title: string; description: string; action: string }> = {
  dashboard: { title: "운영 대시보드", description: "오늘의 수업, 상담, 출결, 납부 흐름을 빠르게 확인합니다.", action: "학생 등록" },
  students: { title: "학생 관리", description: "학생 상태와 보호자, 담당 강사 정보를 한눈에 정리합니다.", action: "학생 등록" },
  guardians: { title: "보호자 관리", description: "결제자와 비상연락 정보를 명확하게 관리합니다.", action: "보호자 등록" },
  consultations: { title: "상담 관리", description: "신규 문의부터 등록 전환까지 상담 흐름을 추적합니다.", action: "상담 등록" },
  enrollments: { title: "수강 관리", description: "수강 과목, 담당 강사, 시작일과 상태를 관리합니다.", action: "수강 등록" },
  lessons: { title: "수업/시간표", description: "오늘의 수업 일정과 완료 상태를 확인합니다.", action: "수업 추가" },
  attendance: { title: "출결 관리", description: "출석, 지각, 결석, 보강 필요 여부를 기록합니다.", action: "출결 입력" },
  "lesson-notes": { title: "레슨노트", description: "수업 내용, 과제, 다음 목표를 일관되게 남깁니다.", action: "노트 추가" },
  "practice-rooms": { title: "연습실 예약", description: "연습실 예약 상태와 사용 시간을 관리합니다.", action: "예약 추가" },
  payments: { title: "수납 상태", description: "청구, 입금, 미납, 환불 상태를 분리해 확인합니다.", action: "결제 등록" },
  "data-quality": { title: "데이터 점검", description: "Google Sheets 운영 데이터의 누락, 중복, 참조 오류, 예약 충돌을 확인합니다.", action: "점검 새로고침" },
  tasks: { title: "내부 업무", description: "운영 업무의 담당자, 마감일, 우선순위를 관리합니다.", action: "업무 추가" },
  notices: { title: "공지/문서", description: "운영 기준과 강사 매뉴얼을 정리합니다.", action: "문서 작성" }
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

export function AppShell({ children, area = "dashboard" }: { children: ReactNode; area?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = usePreviewRole();
  const user = useMemo(() => (role ? previewUsers[role] : null), [role]);

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
    window.localStorage.removeItem("bonsung_role");
    router.push("/login");
  }

  if (!user || !canAccess(user.role, area)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-sm text-muted">
        화면을 준비하고 있습니다.
      </div>
    );
  }

  const visibleNav = navItems.filter((item) => canAccess(user.role, item.area));
  const current = pageCopy[area] ?? pageCopy.dashboard;

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-white px-5 py-5 lg:block">
        <BrandBlock />
        <nav className="mt-6 space-y-1.5" aria-label="주요 메뉴">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`group relative block rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-brand/5 hover:text-brand"
                }`}
                href={item.href}
                key={item.href}
                aria-current={active ? "page" : undefined}
              >
                {active ? <span className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-white/80" /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 space-y-3">
          <Link className="block rounded-2xl border border-brand/10 bg-brand/5 p-4 text-sm font-bold text-brand hover:bg-brand/10" href="/legacy-preview/">
            실사용 Apps Script 화면
          </Link>
          <p className="rounded-2xl border border-line bg-surface-muted p-4 text-xs leading-5 text-muted">
            현재 Next 화면은 공식 UI입니다. Apps Script 세션 토큰이 있으면 실사용 데이터를 읽고, 없으면 기능 점검 preview 데이터를 보여줍니다.
          </p>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight text-ink">{current.title}</p>
              <p className="hidden text-xs text-muted sm:block">{current.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link className="hidden rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-brand hover:border-brand/40 md:inline-flex" href="/legacy-preview/">
                실사용 로그인
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
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="모바일 메뉴">
            {visibleNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    active ? "border-brand bg-brand text-white" : "border-line bg-white text-slate-700"
                  }`}
                  href={item.href}
                  key={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function BrandBlock() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 border-b border-line pb-5">
      <Image src={assetPath("/brand/bonsung-seal.png")} alt="본성뮤직 아카데미 로고" width={52} height={52} className="rounded-full shadow-sm" priority />
      <div>
        <p className="text-lg font-extrabold tracking-tight text-brand">본성뮤직</p>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Music Academy</p>
      </div>
    </Link>
  );
}
