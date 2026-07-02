"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { assetPath } from "@/lib/assets";
import { clearClientSession } from "@/lib/client-session";
import { createVersion3TestAccountRequest, hasVersion3TestSession, resetVersion3TestData, version3TestCurrentUser, version3TestLogin } from "@/lib/version3-test-mode";
import type { Role } from "@/lib/auth-shared";

const testAccounts = [
  { role: "owner", label: "대표", id: "owner" },
  { role: "manager", label: "매니저", id: "manager" },
  { role: "teacher", label: "강사", id: "teacher" },
  { role: "student", label: "수강생", id: "student" }
] as const;

const appLinks = [
  { href: "/dashboard/", label: "대시보드" },
  { href: "/students/", label: "학생/보호자" },
  { href: "/consultations/", label: "상담" },
  { href: "/lessons/", label: "수업" },
  { href: "/attendance/", label: "출결" },
  { href: "/lesson-notes/", label: "레슨노트" },
  { href: "/practice-rooms/", label: "공간 예약" },
  { href: "/payments/", label: "수납" },
  { href: "/tasks/", label: "내부 운영" },
  { href: "/accounts/", label: "계정" },
  { href: "/data-quality/", label: "데이터 관리" }
];

export default function Version3TestPage() {
  const [message, setMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [user, setUser] = useState(() => version3TestCurrentUser());

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    try {
      const account = version3TestLogin(values.loginId || "", values.password || "");
      setUser(version3TestCurrentUser());
      setMessage(`${account.name}으로 테스트모드에 로그인했습니다.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "로그인하지 못했습니다.");
    }
  }

  function quickLogin(loginId: string) {
    try {
      const account = version3TestLogin(loginId, "bonsung1");
      setUser(version3TestCurrentUser());
      setMessage(`${account.name}으로 테스트모드에 로그인했습니다.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "로그인하지 못했습니다.");
    }
  }

  function logout() {
    clearClientSession();
    setUser(null);
    setMessage("테스트 세션을 종료했습니다. 입력한 테스트 데이터는 남아 있습니다.");
  }

  function resetData() {
    resetVersion3TestData();
    setUser(version3TestCurrentUser());
    setMessage("테스트 데이터를 초기 상태로 되돌렸습니다.");
  }

  function submitAccountRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    try {
      createVersion3TestAccountRequest({
        loginId: values.loginId?.trim() ?? "",
        name: values.name?.trim() ?? "",
        requestedRole: (values.requestedRole || "student") as Role,
        email: values.email?.trim() ?? "",
        phone: values.phone?.trim() ?? "",
        linkedStudentId: values.linkedStudentId?.trim() ?? "",
        message: values.message?.trim() ?? ""
      });
      form.reset();
      setRequestMessage("계정 요청을 저장했습니다. 대표 계정으로 로그인한 뒤 계정 화면에서 승인할 수 있습니다.");
    } catch (caught) {
      setRequestMessage(caught instanceof Error ? caught.message : "계정 요청을 저장하지 못했습니다.");
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 sm:py-10">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-7 text-white shadow-card sm:p-8">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/15" />
            <div className="absolute -bottom-24 right-8 h-64 w-64 rounded-full bg-white/5" />
            <Image src={assetPath("/brand/bonsung-logo-seal.png")} alt="본성뮤직 아카데미 로고" width={96} height={96} className="relative rounded-full object-contain shadow-lg" priority />
            <div className="relative mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">BONSUNG MUSIC ACADEMY</p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">본성 스테이지</h1>
              <p className="mt-4 max-w-md text-base leading-7 text-white/80">Version.3 실제 화면 점검모드</p>
              <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em]">BONSUNG MUSIC A NEW BEGINNING</p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-ink">현재 상태</h2>
                <p className="mt-1 text-sm leading-6 text-muted">이 페이지에서 로그인하면 기존 시스템 화면이 서버 대신 브라우저 저장소를 사용합니다.</p>
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand">
                {hasVersion3TestSession() ? "테스트 세션 사용 중" : "로그인 필요"}
              </span>
            </div>
            {user ? (
              <div className="mt-4 rounded-xl bg-surface-muted p-4 text-sm leading-6 text-muted">
                <strong className="text-ink">{user.name}</strong> 계정으로 접속 중입니다. 메뉴별 권한 제한도 이 계정 기준으로 적용됩니다.
              </div>
            ) : null}
            {message ? <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-sm font-bold text-brand">{message}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {appLinks.map((item) => (
                <Link className="rounded-xl border border-brand/20 bg-white px-3 py-2 text-sm font-bold text-brand transition hover:bg-brand/5" href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-muted" type="button" onClick={logout}>로그아웃</button>
              <button className="rounded-xl border border-accent/25 bg-white px-3 py-2 text-sm font-bold text-accent" type="button" onClick={resetData}>테스트 데이터 초기화</button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-brand/15 bg-white p-5 shadow-card">
            <h2 className="text-xl font-extrabold text-ink">테스트 로그인</h2>
            <p className="mt-1 text-sm leading-6 text-muted">공통 PW는 <strong>bonsung1</strong>입니다.</p>
            <form className="mt-4 grid gap-3" onSubmit={login}>
              <input className="h-11 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" name="loginId" placeholder="ID" />
              <input className="h-11 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" name="password" placeholder="PW" type="password" defaultValue="bonsung1" />
              <button className="h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark" type="submit">LOGIN</button>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {testAccounts.map((item) => (
                <button className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-sm font-bold text-brand transition hover:bg-brand/10" key={item.id} type="button" onClick={() => quickLogin(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-xl font-extrabold text-ink">계정 요청 테스트</h2>
            <form className="mt-4 grid gap-3" onSubmit={submitAccountRequest}>
              <input className="h-11 rounded-xl border border-line px-3 text-sm" name="loginId" placeholder="요청 ID" />
              <input className="h-11 rounded-xl border border-line px-3 text-sm" name="name" placeholder="이름" />
              <select className="h-11 rounded-xl border border-line px-3 text-sm" name="requestedRole" defaultValue="student">
                <option value="student">수강생</option>
                <option value="teacher">강사</option>
                <option value="manager">매니저</option>
              </select>
              <input className="h-11 rounded-xl border border-line px-3 text-sm" name="email" placeholder="이메일" />
              <input className="h-11 rounded-xl border border-line px-3 text-sm" name="phone" placeholder="연락처" />
              <input className="h-11 rounded-xl border border-line px-3 text-sm" name="linkedStudentId" placeholder="연결 학생 ID, 수강생만" />
              <textarea className="min-h-20 rounded-xl border border-line px-3 py-2 text-sm" name="message" placeholder="요청 메모" />
              <button className="h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white" type="submit">요청 저장</button>
            </form>
            {requestMessage ? <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs font-bold text-brand">{requestMessage}</p> : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
