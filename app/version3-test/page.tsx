"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { assetPath } from "@/lib/assets";
import { clearClientSession, isNextRole, PREVIEW_ROLE_KEY } from "@/lib/client-session";
import { readPreferences } from "@/lib/preferences";
import { version3TestLogin } from "@/lib/version3-test-mode";

export default function Version3TestPage() {
  const router = useRouter();
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  async function testLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const loginId = String(form.get("loginId") || "").trim();
    const password = String(form.get("password") || "");

    if (!loginId || !password) {
      setLoginError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setLoginPending(true);
    setLoginError("");
    try {
      clearClientSession();
      const account = version3TestLogin(loginId, password);
      if (!isNextRole(account.role)) {
        window.localStorage.removeItem(PREVIEW_ROLE_KEY);
        setLoginError("Version.3에서 사용할 수 있는 계정 종류가 아닙니다.");
        return;
      }

      router.replace(account.mustChangePassword ? "/profile-settings?forcePasswordChange=1" : readPreferences().startPage);
    } catch (caught) {
      setLoginError(caught instanceof Error ? caught.message : "실사용 로그인을 완료하지 못했습니다.");
    } finally {
      setLoginPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 sm:py-10">
      <TestingPageMark />
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-center gap-6">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-7 text-white shadow-card sm:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <div className="absolute -bottom-24 right-8 h-64 w-64 rounded-full bg-white/5" />
          <Image src={assetPath("/brand/bonsung-logo-seal.png")} alt="본성뮤직 아카데미 로고" width={112} height={112} className="relative rounded-full object-contain shadow-lg" priority />
          <div className="relative mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">BONSUNG MUSIC ACADEMY</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">본성 스테이지</h1>
            <p className="mt-4 max-w-md text-base leading-7 text-white/80">교육행정운영 통합 관리 시스템</p>
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em]">BONSUNG MUSIC A NEW BEGINNING</p>
          </div>
        </div>

        <div className="rounded-2xl border border-brand/15 bg-white p-5 shadow-card">
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={testLogin}>
            <label className="block">
              <span className="sr-only">ID</span>
              <input className="h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="loginId" placeholder="ID" autoComplete="username" disabled={loginPending} />
            </label>
            <label className="block">
              <span className="sr-only">PW</span>
              <input className="h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="password" placeholder="PW" type="password" autoComplete="current-password" disabled={loginPending} />
            </label>
            <button className="h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={loginPending} type="submit">
              {loginPending ? "LOGIN..." : "LOGIN"}
            </button>
          </form>
          <p className="mt-3 text-sm font-medium text-muted">※계정 요청 및 패스워드 초기화는 매니저에게 문의 바랍니다.</p>
          {loginError ? <p className="mt-3 text-sm font-medium text-danger" role="alert">{loginError}</p> : null}
        </div>

        <p className="text-center text-xs font-semibold text-muted">@Bonsungmusicacademy Alrights Reserved</p>
      </section>
    </main>
  );
}

function TestingPageMark() {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 select-none text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500/45">
      testing page
    </div>
  );
}
