import type { ReactNode } from "react";

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <>
      <div className="grid gap-3 lg:hidden" aria-label="모바일 표 카드">
        {rows.map((row, index) => (
          <article className="rounded-[22px] border border-line bg-white p-4 shadow-card" key={index}>
            <div className="text-base font-extrabold text-ink">{row[0]}</div>
            <dl className="mt-3 grid gap-2 text-xs text-muted">
              {row.slice(1).map((cell, cellIndex) => (
                <div className="rounded-xl bg-surface-muted px-3 py-2" key={`${headers[cellIndex + 1]}-${cellIndex}`}>
                  <dt className="font-bold text-ink">{headers[cellIndex + 1]}</dt>
                  <dd className="mt-1">{cell}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white shadow-card lg:block">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-xs font-bold text-muted">
            <tr>{headers.map((header) => <th className="whitespace-nowrap px-4 py-3.5" key={header}>{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, index) => (
              <tr className="align-top transition hover:bg-brand/5" key={index}>
                {row.map((cell, cellIndex) => <td className="max-w-[18rem] px-4 py-3.5 text-muted" key={cellIndex}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
