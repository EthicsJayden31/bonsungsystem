"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assetPath } from "@/lib/assets";
import type { Role } from "@/lib/auth-shared";

const accounts: Array<{ role: Role; title: string; description: string }> = [
  { role: "admin", title: "원장 관리자", description: "전체 메뉴와 운영 현황, 설정 권한을 확인합니다." },
  { role: "staff", title: "운영 스태프", description: "상담, 등록, 출결, 수납 등 데스크 업무 흐름을 확인합니다." },
  { role: "teacher", title: "강사", description: "담당 수업, 학생, 출결, 레슨노트 중심으로 확인합니다." }
];

export default function LoginPage() {
  const router = useRouter();

  function previewLogin(role: Role) {
    window.localStorage.setItem("bonsung_role", role);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-8 text-white shadow-card">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <div className="absolute -bottom-24 right-8 h-64 w-64 rounded-full bg-white/5" />
          <Image src={assetPath("/brand/bonsung-seal.png")} alt="본성뮤직 아카데미 로고" width={112} height={112} className="relative rounded-full shadow-lg" priority />
          <div className="relative mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Bonsung Music Academy</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">본성뮤직 인트라넷</h1>
            <p className="mt-4 max-w-md text-base leading-7 text-white/78">브랜드 UI는 Next.js에서 확인하고, 실사용 데이터 입력과 계정 로그인은 Apps Script 운영 화면에서 처리합니다.</p>
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em]">BONSUNG MUSIC A NEW BEGINNING</p>
          </div>
        </div>
        <div>
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-bold text-brand">접속 방식 선택</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">실사용과 preview를 분리했습니다</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              실제 운영 데이터는 Apps Script와 Google Sheets에 연결된 화면에서 로그인합니다. 아래 역할 선택은 Next 공식 UI를 빠르게 점검하는 preview 모드입니다.
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-brand/15 bg-white p-5 shadow-card">
            <p className="text-sm font-extrabold text-ink">실사용 Apps Script 로그인</p>
            <p className="mt-2 text-sm leading-6 text-muted">계정, 학생, 수업, 예약, 수납 등 실제 Google Sheets 데이터와 연결되는 운영 화면입니다.</p>
            <Link className="mt-4 inline-flex rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark" href="/legacy-preview/">
              실사용 페이지로 이동
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {accounts.map((account) => (
              <article className="flex rounded-2xl border border-line bg-white p-5 shadow-card" key={account.role}>
                <div className="flex flex-1 flex-col">
                  <h3 className="text-lg font-extrabold text-ink">{account.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted">{account.description}</p>
                  <button className="mt-5 w-full rounded-xl border border-brand/20 bg-brand/5 px-3 py-3 text-sm font-bold text-brand transition hover:bg-brand/10" onClick={() => previewLogin(account.role)}>
                    Preview로 시작
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
