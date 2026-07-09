"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

type Field = { label: string; name: string; type?: "text" | "date" | "number" | "textarea" | "select" | "checkbox"; options?: string[] };
type SubmitStatus = { tone: "info" | "success" | "error"; message: string };

export type MobileListCard = {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  meta?: ReactNode[];
  action?: ReactNode;
};

export function ResourcePage({
  title,
  description,
  headers,
  rows,
  fields,
  mobileCards,
  initialValues,
  emptyTitle = "등록된 데이터가 없습니다",
  emptyDescription = "오른쪽 빠른 등록 영역에서 첫 항목을 입력할 수 있습니다.",
  sourceNote,
  onSubmit,
  submitLabel,
  submitHelp,
  submitDisabled = false,
  formId,
  showForm = true
}: {
  title: string;
  description: string;
  headers: string[];
  rows: ReactNode[][];
  fields: Field[];
  mobileCards?: MobileListCard[];
  initialValues?: Record<string, string>;
  emptyTitle?: string;
  emptyDescription?: string;
  sourceNote?: ReactNode;
  onSubmit?: (values: Record<string, string>) => Promise<void> | void;
  submitLabel?: string;
  submitHelp?: string;
  submitDisabled?: boolean;
  formId?: string;
  showForm?: boolean;
}) {
  const [status, setStatus] = useState<SubmitStatus | null>(null);
  const formKey = useMemo(() => JSON.stringify(initialValues ?? {}), [initialValues]);
  const quickFormId = formId ?? "quick-form";
  const cards = mobileCards ?? rows.map((row, index) => ({
    id: String(index),
    title: row[0],
    subtitle: row[1],
    status: row[2],
    meta: row.slice(3)
  }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    if (!onSubmit) {
      setStatus({ tone: "info", message: "현재 권한 또는 세션에서는 이 화면의 저장 기능을 사용할 수 없습니다." });
      return;
    }

    setStatus({ tone: "info", message: "본성 스테이지 운영 서버에 저장을 요청하고 있습니다." });
    try {
      await onSubmit(values);
      form.reset();
      setStatus({ tone: "success", message: "저장 요청이 완료되었습니다. 목록은 새로고침 후 최신 데이터로 다시 불러옵니다." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  const statusClass = status?.tone === "success"
    ? "border-success/20 bg-success/10 text-success"
    : status?.tone === "error"
      ? "border-danger/20 bg-danger/10 text-danger"
      : "border-brand/15 bg-brand/5 text-muted";

  return (
    <Section title={title} description={description}>
      <div className={`grid gap-5 ${showForm ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        <div className="min-w-0 space-y-3">
          {sourceNote}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">목록 관리</p>
              <p className="mt-1 text-xs text-muted">총 {rows.length.toLocaleString("ko-KR")}건의 항목을 확인합니다.</p>
            </div>
            <div className="flex w-full gap-2 sm:max-w-md">
              <label className="min-w-0 flex-1">
                <span className="sr-only">목록 검색</span>
                <input className="h-11 w-full rounded-xl border border-line bg-surface-muted px-3 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15" placeholder="이름, 상태, 메모 검색" type="search" />
              </label>
              {showForm ? (
                <a className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-sm font-extrabold text-white shadow-sm xl:hidden" href={`#${quickFormId}`}>
                  등록
                </a>
              ) : null}
            </div>
          </div>

          {rows.length ? (
            <>
              <MobileCardList cards={cards} />
              <div className="hidden lg:block">
                <DataTable headers={headers} rows={rows} />
              </div>
            </>
          ) : (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          )}
        </div>

        {showForm ? <form className="scroll-mt-28 rounded-[24px] border border-line bg-white p-5 shadow-card" aria-label={`${title} 빠른 등록`} id={quickFormId} onSubmit={handleSubmit} key={formKey}>
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">빠른 등록</h2>
              <p className="mt-1 text-xs leading-5 text-muted">필수 정보를 먼저 적고, 상세 내용은 나중에 보완합니다.</p>
            </div>
            <Badge>{onSubmit ? "실사용 저장" : "v1 입력안"}</Badge>
          </div>
          <div className="space-y-3">
            {fields.map((field) => (
              <label className="block" key={field.name}>
                <span className="text-xs font-bold text-ink">{field.label}</span>
                {field.type === "checkbox" ? (
                  <span className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2.5 text-sm text-ink">
                    <input className="h-4 w-4 rounded border-line text-brand focus:ring-brand/20" name={field.name} type="checkbox" defaultChecked={initialValues?.[field.name] === "true"} />
                    {field.label}
                  </span>
                ) : field.type === "textarea" ? (
                  <textarea className="mt-1 min-h-24 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name={field.name} placeholder={`${field.label} 입력`} defaultValue={initialValues?.[field.name] ?? ""} />
                ) : field.type === "select" ? (
                  <select className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name={field.name} defaultValue={initialValues?.[field.name] ?? field.options?.[0] ?? ""}>
                    {(field.options ?? []).map((option) => <option key={option}>{option}</option>)}
                  </select>
                ) : (
                  <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name={field.name} placeholder={`${field.label} 입력`} type={field.type ?? "text"} defaultValue={initialValues?.[field.name] ?? ""} />
                )}
              </label>
            ))}
          </div>
          <button className="mt-4 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/45" disabled={submitDisabled} type="submit">
            {submitLabel ?? (onSubmit ? "실사용 저장" : "임시 저장")}
          </button>
          <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">
            {submitHelp ?? (onSubmit ? "본성 스테이지 서버 세션이 있으면 별도 서버에 저장되고, 전환 세션에서는 기존 연결층으로 저장됩니다." : "저장 권한이 있는 본성 스테이지 계정으로 로그인하면 이 화면에서 직접 등록할 수 있습니다.")}
          </p>
          {status ? <p className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-5 ${statusClass}`}>{status.message}</p> : null}
        </form> : null}
      </div>
    </Section>
  );
}

function MobileCardList({ cards }: { cards: MobileListCard[] }) {
  return (
    <div className="grid gap-3 lg:hidden" aria-label="모바일 카드 목록">
      {cards.map((card) => (
        <article className="rounded-[22px] border border-line bg-white p-4 shadow-card" key={card.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-extrabold text-ink">{card.title}</div>
              {card.subtitle ? <div className="mt-1 text-sm leading-5 text-muted">{card.subtitle}</div> : null}
            </div>
            {card.status ? <div className="shrink-0">{card.status}</div> : null}
          </div>
          {card.meta?.length ? (
            <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
              {card.meta.map((item, index) => (
                <div className="rounded-xl bg-surface-muted px-3 py-2" key={index}>
                  {item}
                </div>
              ))}
            </dl>
          ) : null}
          {card.action ? <div className="mt-3">{card.action}</div> : null}
        </article>
      ))}
    </div>
  );
}
