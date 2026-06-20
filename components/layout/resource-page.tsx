import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import type { ReactNode } from "react";

type Field = { label: string; name: string; type?: "text" | "date" | "number" | "textarea" | "select"; options?: string[] };

export function ResourcePage({
  title,
  description,
  headers,
  rows,
  fields,
  emptyTitle = "등록된 데이터가 없습니다",
  emptyDescription = "오른쪽 빠른 등록 영역에서 첫 항목을 입력할 수 있습니다."
}: {
  title: string;
  description: string;
  headers: string[];
  rows: ReactNode[][];
  fields: Field[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <Section title={title} description={description}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">목록 관리</p>
              <p className="mt-1 text-xs text-muted">총 {rows.length.toLocaleString("ko-KR")}건의 항목을 확인하고 빠르게 등록합니다.</p>
            </div>
            <label className="w-full sm:max-w-xs">
              <span className="sr-only">목록 검색</span>
              <input className="h-11 w-full rounded-xl border border-line bg-surface-muted px-3 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15" placeholder="이름, 상태, 메모 검색" type="search" />
            </label>
          </div>
          {rows.length ? <DataTable headers={headers} rows={rows} /> : <EmptyState title={emptyTitle} description={emptyDescription} />}
        </div>
        <form className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-label={`${title} 빠른 등록`}>
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">빠른 등록</h2>
              <p className="mt-1 text-xs leading-5 text-muted">필수 정보를 먼저 적고, 상세 내용은 나중에 보완합니다.</p>
            </div>
            <Badge>v1 입력폼</Badge>
          </div>
          <div className="space-y-3">
            {fields.map((field) => (
              <label className="block" key={field.name}>
                <span className="text-xs font-bold text-ink">{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea className="mt-1 min-h-24 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name={field.name} placeholder={`${field.label} 입력`} />
                ) : field.type === "select" ? (
                  <select className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name={field.name}>
                    {(field.options ?? []).map((option) => <option key={option}>{option}</option>)}
                  </select>
                ) : (
                  <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name={field.name} placeholder={`${field.label} 입력`} type={field.type ?? "text"} />
                )}
              </label>
            ))}
          </div>
          <button className="mt-4 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark" type="button">
            임시 저장
          </button>
          <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">
            현재 화면은 업무 흐름 검증용입니다. 실제 저장은 Prisma 연결 후 서버 액션으로 활성화됩니다.
          </p>
        </form>
      </div>
    </Section>
  );
}
