"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { assetPath } from "@/lib/assets";
import type { Role } from "@/lib/auth-shared";
import {
  APPS_SCRIPT_SESSION_TOKEN_KEY,
  APPS_SCRIPT_USER_KEY,
  loginWithAppsScript
} from "@/lib/apps-script-client";
import { readPreferences } from "@/lib/preferences";

const accounts: Array<{ role: Role; title: string; description: string }> = [
  { role: "admin", title: "원장 관리자", description: "전체 운영 현황, 수납, 데이터 점검, 설정 권한을 확인합니다." },
  { role: "staff", title: "운영 스태프", description: "상담, 등록, 출결, 수납 같은 데스크 업무 흐름을 확인합니다." },
  { role: "teacher", title: "강사", description: "담당 수업, 학생, 출결, 레슨노트 중심으로 확인합니다." }
];

export default function LoginPage() {
  const router = useRouter();
  const [liveLoginError, setLiveLoginError] = useState("");
  const [liveLoginPending, setLiveLoginPending] = useState(false);

  function previewLogin(role: Role) {
    window.localStorage.setItem("bonsung_role", role);
    router.push(readPreferences().startPage);
  }

  async function liveLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const loginId = String(form.get("loginId") || "").trim();
    const password = String(form.get("password") || "");

    if (!loginId || !password) {
      setLiveLoginError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setLiveLoginPending(true);
    setLiveLoginError("");
    try {
      const result = await loginWithAppsScript(loginId, password);
      if (!isNextRole(result.user.role)) {
        window.localStorage.setItem(APPS_SCRIPT_SESSION_TOKEN_KEY, result.token);
        window.localStorage.setItem(APPS_SCRIPT_USER_KEY, JSON.stringify(result.user));
        window.location.assign("/legacy-preview/");
        return;
      }

      window.localStorage.setItem(APPS_SCRIPT_SESSION_TOKEN_KEY, result.token);
      window.localStorage.setItem(APPS_SCRIPT_USER_KEY, JSON.stringify(result.user));
      window.localStorage.setItem("bonsung_role", result.user.role);
      router.replace(readPreferences().startPage);
    } catch (caught) {
      setLiveLoginError(caught instanceof Error ? caught.message : "실사용 로그인을 완료하지 못했습니다.");
    } finally {
      setLiveLoginPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 sm:py-10">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-7 text-white shadow-card sm:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <div className="absolute -bottom-24 right-8 h-64 w-64 rounded-full bg-white/5" />
          <Image src={assetPath("/brand/bonsung-logo-seal.png")} alt="본성뮤직 아카데미 로고" width={112} height={112} className="relative rounded-full object-contain shadow-lg" priority />
          <div className="relative mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Bonsung Music Academy</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">본성뮤직 인트라넷</h1>
            <p className="mt-4 max-w-md text-base leading-7 text-white/80">전문적인 음악 교육과 체계적인 운영 관리를 위한 모바일 우선 아카데미 시스템입니다.</p>
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em]">BONSUNG MUSIC A NEW BEGINNING</p>
          </div>
        </div>

        <div>
          <div className="mb-5 max-w-2xl">
            <p className="text-sm font-bold text-brand">접속 방식 선택</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">실사용 로그인 우선</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              실제 운영 데이터는 Apps Script와 Google Sheets 로그인으로 연결합니다. 아래 preview 계정은 UI와 권한 흐름을 빠르게 점검할 때 사용합니다.
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-brand/15 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-ink">실사용 Apps Script 로그인</p>
                <p className="mt-2 text-sm leading-6 text-muted">관리자, 운영 스태프, 강사 계정으로 Google Sheets 운영 데이터를 Next UI에서 바로 확인합니다.</p>
              </div>
              <Link className="text-sm font-bold text-brand hover:text-brand-dark" href="/legacy-preview/">
                legacy 화면
              </Link>
            </div>
            <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={liveLogin}>
              <label className="block">
                <span className="sr-only">아이디</span>
                <input className="h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="loginId" placeholder="아이디" autoComplete="username" disabled={liveLoginPending} />
              </label>
              <label className="block">
                <span className="sr-only">비밀번호</span>
                <input className="h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="password" placeholder="비밀번호" type="password" autoComplete="current-password" disabled={liveLoginPending} />
              </label>
              <button className="h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={liveLoginPending} type="submit">
                {liveLoginPending ? "로그인 중" : "실사용 로그인"}
              </button>
            </form>
            {liveLoginError ? <p className="mt-3 text-sm font-medium text-danger" role="alert">{liveLoginError}</p> : null}
          </div>

          <details className="rounded-2xl border border-line bg-white p-5 shadow-card" open>
            <summary className="cursor-pointer list-none text-sm font-extrabold text-ink">
              Preview 계정으로 앱 화면 보기
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {accounts.map((account) => (
                <article className="flex rounded-2xl border border-line bg-surface-muted p-4" key={account.role}>
                  <div className="flex flex-1 flex-col">
                    <h3 className="text-base font-extrabold text-ink">{account.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-muted">{account.description}</p>
                    <button className="mt-5 w-full rounded-xl border border-brand/20 bg-brand/5 px-3 py-3 text-sm font-bold text-brand transition hover:bg-brand/10" onClick={() => previewLogin(account.role)}>
                      Preview로 시작
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}

function isNextRole(role: string | undefined): role is Role {
  return role === "admin" || role === "staff" || role === "teacher";
}
