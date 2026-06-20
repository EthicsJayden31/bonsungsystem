import Link from "next/link";
import Image from "next/image";
import { assetPath } from "@/lib/assets";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <section className="w-full max-w-md rounded-[28px] border border-line bg-white p-8 text-center shadow-card">
        <Image src={assetPath("/brand/bonsung-seal.png")} alt="본성뮤직 아카데미 로고" width={80} height={80} className="mx-auto rounded-full" priority />
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-brand">Bonsung Music Academy</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">인트라넷 v1 프리뷰</h1>
        <p className="mt-3 text-sm leading-6 text-muted">상담, 수강, 출결, 납부 상태를 한곳에서 확인하는 운영 화면입니다.</p>
        <Link className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-dark" href="/login">
          로그인으로 이동
        </Link>
      </section>
    </main>
  );
}
