import Image from "next/image";
import Link from "next/link";
import { assetPath } from "@/lib/assets";
import { ENABLE_LEGACY_PREVIEW } from "@/lib/version3-runtime-flags";

const roles = [
  { title: "대표", detail: "전체 운영 현황, 공지, 수납, 권한과 데이터 점검" },
  { title: "매니저", detail: "상담요청 접수, 학생·강사·수업 관리, 공지 작성" },
  { title: "강사", detail: "담당 학생, 수업 일정, 출결, 레슨노트, 공간 예약" },
  { title: "수강생", detail: "내 수업, 레슨노트, 공지 확인, 상담요청, 연습실 예약" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-6 sm:py-10">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card sm:p-8">
          <Image src={assetPath("/brand/bonsung-logo-seal.png")} alt="본성뮤직 아카데미 로고" width={84} height={84} className="rounded-full object-contain" priority />
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-brand">Bonsung Music Academy</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">통합 관리 시스템 Version.3</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            공개 경로의 기준 화면을 Version.3로 전환합니다. 별도 서버 기반 운영을 기준으로 권한, 홈 화면, 상담요청, 공지와 주요 입력 흐름을 이 화면에서 관리합니다.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-dark" href="/login">
              Version.3 로그인
            </Link>
            {ENABLE_LEGACY_PREVIEW ? (
              <a className="inline-flex items-center justify-center rounded-xl border border-brand/20 bg-brand/5 px-5 py-3 text-sm font-bold text-brand hover:bg-brand/10" href={assetPath("/legacy-preview/")}>
                legacy 비교 화면
              </a>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <article className="rounded-[24px] border border-line bg-white p-5 shadow-card" key={role.title}>
              <h2 className="text-xl font-extrabold text-ink">{role.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{role.detail}</p>
            </article>
          ))}
          <article className="rounded-[24px] border border-brand/15 bg-brand/5 p-5 sm:col-span-2">
            <h2 className="text-lg font-extrabold text-brand">1차 구축 기준</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              대표·매니저·강사·수강생 계정 체계를 먼저 고정하고, 학생 계정 연결, dashboard 개인화, 일방향 상담요청, 공지 권한, 서버형 데이터 모델 순서로 확장합니다.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
