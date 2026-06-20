"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const accounts = [
  { role: "admin", title: "원장 관리자", description: "전체 메뉴와 운영 현황, 설정 권한을 확인합니다." },
  { role: "staff", title: "운영 스태프", description: "상담, 등록, 출결, 납부 등 데스크 업무 흐름을 확인합니다." },
  { role: "teacher", title: "강사", description: "담당 수업, 학생, 출결, 레슨노트 중심으로 확인합니다." }
];

export default function LoginPage() {
  const router = useRouter();

  function login(role: string) {
    window.localStorage.setItem("bonsung_role", role);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-8 text-white shadow-card">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/15" />
          <div className="absolute -bottom-24 right-8 h-64 w-64 rounded-full bg-white/5" />
          <Image src="/brand/bonsung-seal.png" alt="본성뮤직 아카데미 로고" width={112} height={112} className="relative rounded-full shadow-lg" priority />
          <div className="relative mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Bonsung Music Academy</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">본성뮤직 인트라넷</h1>
            <p className="mt-4 max-w-md text-base leading-7 text-white/78">전문적인 음악 교육과 체계적인 운영 관리를 위한 프리미엄 아카데미 시스템입니다.</p>
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em]">BONSUNG MUSIC A NEW BEGINNING</p>
          </div>
        </div>
        <div>
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-bold text-brand">권한 선택</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">시연용 로그인</h2>
            <p className="mt-3 text-sm leading-6 text-muted">실제 배포 시 Auth.js credentials 또는 SSO로 교체합니다. 지금은 역할별 화면 권한과 운영 흐름을 확인합니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          {accounts.map((account) => (
            <article className="flex rounded-2xl border border-line bg-white p-5 shadow-card" key={account.role}>
              <div className="flex flex-1 flex-col">
                <h3 className="text-lg font-extrabold text-ink">{account.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">{account.description}</p>
                <button className="mt-5 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark" onClick={() => login(account.role)}>
                  이 권한으로 시작
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
