"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDataQualityReport, type DataQualityIssue } from "@/lib/operations-data";

const sourceLabel = {
  loading: "점검 중",
  live: "실사용 Apps Script 데이터",
  preview: "기능 점검 Preview",
  fallback: "연결 실패"
};

export default function DataQualityPage() {
  const state = useDataQualityReport();
  const report = state.report;

  return (
    <AppShell area="data-quality">
      <Section title="데이터 점검" description="Google Sheets 운영 데이터의 필수값, 중복, 참조 불일치, 예약 충돌을 확인합니다.">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="데이터 소스" value={sourceLabel[state.source]} helper={state.hasLiveSession ? "Apps Script 세션 사용" : "실사용 로그인 필요"} />
          <SummaryCard label="전체 이슈" value={report ? report.summary.totalIssues : "-"} helper={report ? report.summary.checkedRecords.toLocaleString("ko-KR") + "건 점검" : "운영 원본 미연결"} />
          <SummaryCard label="즉시 조치" value={report ? report.summary.blocking : "-"} helper="필수값/중복/충돌" tone="danger" />
          <SummaryCard label="확인 필요" value={report ? report.summary.warning : "-"} helper="참조 불일치 등" tone="warn" />
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">점검 상태</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{statusMessage(state.source, state.error)}</p>
            </div>
            {report ? <Badge tone={report.summary.blocking ? "danger" : report.summary.warning ? "warn" : "good"}>{report.generatedAt}</Badge> : null}
          </div>
          {report ? <p className="mt-3 text-xs text-muted">점검 시트: {report.summary.checkedSheets.join(", ")}</p> : null}
        </div>

        {report && report.issues.length ? (
          <DataTable
            headers={["심각도", "영역", "레코드", "항목", "상세"]}
            rows={report.issues.map((issue) => [severityBadge(issue), issue.area, issue.recordId, issue.title, issue.detail])}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-12 text-center shadow-card">
            <p className="text-base font-extrabold text-ink">{report ? "발견된 데이터 이슈가 없습니다" : "실사용 로그인 후 점검할 수 있습니다"}</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
              {report
                ? "현재 기준으로 필수값, 중복, 참조, 예약 충돌 점검을 통과했습니다."
                : "Preview 모드는 화면과 권한 흐름을 확인하기 위한 용도입니다. Google Sheets 원본 점검은 legacy-preview에서 로그인한 세션 토큰이 있을 때 실행됩니다."}
            </p>
          </div>
        )}
      </Section>
    </AppShell>
  );
}

function SummaryCard({ label, value, helper, tone = "default" }: { label: string; value: string | number; helper: string; tone?: "default" | "danger" | "warn" }) {
  const valueColor = tone === "danger" ? "text-danger" : tone === "warn" ? "text-accent" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className={["mt-2 text-3xl font-extrabold tracking-tight", valueColor].join(" ")}>{value}</p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
    </div>
  );
}

function statusMessage(source: keyof typeof sourceLabel, error: string) {
  if (source === "loading") return "Apps Script 데이터 점검 결과를 불러오는 중입니다.";
  if (source === "live") return "실사용 Apps Script 데이터 기준 점검 결과입니다.";
  if (source === "fallback") return "Apps Script 연결 또는 권한 확인이 필요합니다. " + error;
  return "실사용 세션이 없어 기능 점검용 preview 상태입니다. 데이터 원본 점검 결과는 표시하지 않습니다.";
}

function severityBadge(issue: DataQualityIssue) {
  if (issue.severity === "blocking") return <Badge tone="danger">즉시 조치</Badge>;
  if (issue.severity === "warning") return <Badge tone="warn">확인 필요</Badge>;
  return <Badge>정보</Badge>;
}
