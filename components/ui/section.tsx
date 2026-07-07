import type { ReactNode } from "react";

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="max-w-3xl">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-2 text-[15px] leading-6 text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
