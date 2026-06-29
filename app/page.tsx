import Image from "next/image";
import Link from "next/link";
import { assetPath } from "@/lib/assets";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <section className="w-full max-w-md rounded-[28px] border border-line bg-white p-8 text-center shadow-card">
        <Image src={assetPath("/brand/bonsung-logo-seal.png")} alt="본성뮤직 아카데미 로고" width={88} height={88} className="mx-auto rounded-full object-contain" priority />
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-brand">Bonsung Music Academy</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">본성뮤직 인트라넷</h1>
        <p className="mt-3 text-sm leading-6 text-muted">실제 운영 데이터는 로그인 후 연결됩니다. 기존 운영 화면도 같은 인트라넷 안에서 바로 사용할 수 있습니다.</p>
        <div className="mt-6 grid gap-3">
          <Link className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-dark" href="/login">
            로그인해서 시작
          </Link>
          <a className="inline-flex items-center justify-center rounded-xl border border-brand/20 bg-brand/5 px-5 py-3 text-sm font-bold text-brand hover:bg-brand/10" href={assetPath("/legacy-preview/")}>
            운영 화면 바로 열기
          </a>
        </div>
      </section>
    </main>
  );
}
