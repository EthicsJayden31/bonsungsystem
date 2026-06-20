import type { ReactNode } from "react";

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
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
  );
}
