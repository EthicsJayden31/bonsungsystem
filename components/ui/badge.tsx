import type { ReactNode } from "react";

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "danger" }) {
  const color = {
    default: "border-brand/15 bg-brand/5 text-brand",
    good: "border-success/20 bg-success/10 text-success",
    warn: "border-accent/25 bg-accent/10 text-accent",
    danger: "border-danger/20 bg-danger/10 text-danger"
  }[tone];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>{children}</span>;
}
