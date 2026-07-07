"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import { useAuditLogs, useDataQualityReport, type DataQualityCheck, type DataQualityIssue, type DataQualityReport } from "@/lib/operations-data";
import { callVersion3Server } from "@/lib/version3-server-client";
import type { Version3AuditLog } from "@/lib/version3-server-contract";

const sourceLabel = {
  loading: "점검 중",
  server: "Version.3 서버 데이터",
  live: "전환 연결층 데이터",
  test: "Version.3 서버 데이터",
  preview: "기능 점검 Preview",
  fallback: "연결 실패"
};

export default function DataQualityPage() {
  const state = useDataQualityReport();
  const auditState = useAuditLogs();
  const [exportState, setExportState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [exportMessage, setExportMessage] = useState("");
  const [importState, setImportState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const report = state.report;
  const recentAuditLogs = auditState.logs.slice(0, 10);
  const readinessItems = useMemo(
    () => buildOperationsReadinessItems(report, state.source, auditState.source),
    [auditState.source, report, state.source]
  );

  async function exportData() {
    setExportState("pending");
    setExportMessage("");
    try {
      const payload = await callVersion3Server<Record<string, unknown>>("/data-export");
      const exportedAt = typeof payload.exportedAt === "string" ? payload.exportedAt : new Date().toISOString();
      const filename = `bonsung-version3-export-${exportedAt.slice(0, 10)}.json`;
      downloadJson(filename, payload);
      setExportState("done");
      setExportMessage("비밀번호가 제거된 Version.3 운영 데이터 내보내기를 생성했습니다.");
    } catch (caught) {
      setExportState("error");
      setExportMessage(caught instanceof Error ? caught.message : "운영 데이터를 내보내지 못했습니다.");
    }
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportState("pending");
    setImportMessage("");
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const result = await callVersion3Server<{ summary?: { accounts?: number; students?: number }; temporaryPasswordApplied?: number }>("/data-import", {
        method: "POST",
        body: {
          export: parsed,
          temporaryPassword: importPassword
        }
      });
      setImportState("done");
      setImportMessage(`Version.3 운영 데이터를 가져왔습니다. 계정 ${result.summary?.accounts ?? "-"}개, 학생 ${result.summary?.students ?? "-"}명, 임시 비밀번호 적용 ${result.temporaryPasswordApplied ?? 0}건`);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (caught) {
      setImportState("error");
      setImportMessage(caught instanceof Error ? caught.message : "운영 데이터를 가져오지 못했습니다.");
    }
  }

  return (
    <AppShell area="data-quality">
      <Section title="데이터 점검" description="운영 데이터의 필수값, 중복, 참조 불일치, 예약 충돌, 서버 감사 로그를 확인합니다.">
        <div className="grid gap-4 md:grid-cols-6">
          <SummaryCard label="데이터 소스" value={sourceLabel[state.source]} helper={state.source === "server" || state.source === "test" ? "별도 서버 세션 사용" : state.hasLiveSession ? "전환 세션 사용" : "실사용 로그인 필요"} />
          <SummaryCard label="전체 이슈" value={report ? report.summary.totalIssues ?? 0 : "-"} helper={report ? `${(report.summary.checkedRecords ?? 0).toLocaleString("ko-KR")}건 점검` : "운영 원본 미연결"} />
          <SummaryCard label="즉시 조치" value={report ? report.summary.blocking ?? 0 : "-"} helper="필수값 중복/충돌" tone="danger" />
          <SummaryCard label="확인 필요" value={report ? report.summary.warning ?? 0 : "-"} helper="참조 불일치 등" tone="warn" />
          <SummaryCard label="끊어진 참조" value={report ? report.summary.brokenReferences ?? 0 : "-"} helper="학생·강사·수업 연결" tone={(report?.summary.brokenReferences ?? 0) ? "warn" : "default"} />
          <SummaryCard label="감사 로그" value={auditState.source === "server" || auditState.source === "test" ? auditState.logs.length : "-"} helper={auditState.source === "server" || auditState.source === "test" ? "서버 변경 이력" : "Version.3 서버 필요"} />
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">운영 시작 체크리스트</h2>
              <p className="mt-1 text-sm leading-6 text-muted">실제 학원 운영 전에 별도 서버, 계정, 학생 연결, 감사 로그, 백업 상태를 한 번에 확인합니다.</p>
            </div>
            <Badge tone={readinessItems.every((item) => item.status === "good") ? "good" : "warn"}>
              {readinessItems.filter((item) => item.status === "good").length}/{readinessItems.length}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readinessItems.map((item) => (
              <div className="rounded-2xl border border-line bg-surface-muted p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-extrabold text-ink">{item.label}</p>
                  <Badge tone={item.status === "good" ? "good" : item.status === "danger" ? "danger" : "warn"}>{item.badge}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">점검 상태</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{statusMessage(state.source, state.error)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {report ? <Badge tone={(report.summary.blocking ?? 0) ? "danger" : (report.summary.warning ?? 0) ? "warn" : "good"}>{report.generatedAt}</Badge> : null}
              <button
                className="rounded-xl border border-brand/25 px-3 py-2 text-sm font-bold text-brand transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={state.source !== "server" || exportState === "pending"}
                onClick={exportData}
                type="button"
              >
                {exportState === "pending" ? "내보내는 중" : "운영 데이터 내보내기"}
              </button>
              <input
                className="min-h-10 rounded-xl border border-line px-3 py-2 text-sm text-ink"
                disabled={state.source !== "server" || importState === "pending"}
                onChange={(event) => setImportPassword(event.target.value)}
                placeholder="가져오기 임시 비밀번호"
                type="password"
                value={importPassword}
              />
              <label className={["cursor-pointer rounded-xl border border-accent/25 px-3 py-2 text-sm font-bold text-accent transition hover:bg-accent/5", state.source !== "server" || importState === "pending" ? "pointer-events-none opacity-50" : ""].join(" ")}>
                {importState === "pending" ? "가져오는 중" : "백업 가져오기"}
                <input accept="application/json,.json" className="sr-only" disabled={state.source !== "server" || importState === "pending"} onChange={importData} type="file" />
              </label>
            </div>
          </div>
          {report?.summary.checkedSheets?.length ? <p className="mt-3 text-xs text-muted">점검 시트: {report.summary.checkedSheets.join(", ")}</p> : null}
          {exportMessage ? (
            <p className={["mt-3 rounded-xl px-3 py-2 text-xs leading-5", exportState === "error" ? "bg-accent/10 text-accent" : "bg-brand/5 text-muted"].join(" ")}>
              {exportMessage}
            </p>
          ) : null}
          {importMessage ? (
            <p className={["mt-3 rounded-xl px-3 py-2 text-xs leading-5", importState === "error" ? "bg-accent/10 text-accent" : "bg-brand/5 text-muted"].join(" ")}>
              {importMessage}
            </p>
          ) : null}
        </div>

        {report?.checks.length ? (
          <DataTable
            headers={["점검 항목", "상태", "건수"]}
            rows={report.checks.map((check) => [qualityCheckLabel(check), qualityCheckBadge(check), check.count.toLocaleString("ko-KR")])}
          />
        ) : null}

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
                : "Preview 모드는 화면과 권한 흐름 확인용입니다. 운영 원본 점검은 Version.3 서버 세션에서 실행됩니다."}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">Version.3 감사 로그</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{auditStatusMessage(auditState.source, auditState.error)}</p>
            </div>
            <Badge tone={auditState.source === "server" || auditState.source === "test" ? "good" : auditState.source === "fallback" ? "danger" : "warn"}>
              {auditState.source === "server" || auditState.source === "test" ? `${auditState.logs.length}건` : "서버 전용"}
            </Badge>
          </div>
          {recentAuditLogs.length ? (
            <div className="mt-4">
              <DataTable
                headers={["시간", "처리", "대상", "처리자", "상세"]}
                rows={recentAuditLogs.map((log) => [
                  formatAuditTime(log.createdAt),
                  auditActionLabel(log.action),
                  `${auditTargetLabel(log.targetType)} · ${log.targetName || log.targetId}`,
                  log.actorName || log.actorId || "-",
                  auditMetadata(log)
                ])}
              />
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-sm leading-6 text-muted">
              {auditState.source === "server" || auditState.source === "test" ? "아직 표시할 감사 로그가 없습니다." : "감사 로그는 Version.3 별도 서버 로그인 후 표시됩니다."}
            </p>
          )}
        </div>
      </Section>
    </AppShell>
  );
}

type ReadinessItem = {
  id: string;
  label: string;
  badge: string;
  detail: string;
  status: "good" | "warn" | "danger";
};

function buildOperationsReadinessItems(
  report: DataQualityReport | null,
  dataSource: keyof typeof sourceLabel,
  auditSource: keyof typeof sourceLabel
): ReadinessItem[] {
  const summary = report?.summary;
  const studentsWithoutAccounts = summary?.studentsWithoutAccounts ?? 0;
  const brokenReferences = summary?.brokenReferences ?? 0;
  const auditLogs = summary?.auditLogs ?? 0;
  const accounts = summary?.accounts ?? 0;
  const students = summary?.students ?? 0;

  return [
    {
      id: "server",
      label: "별도 서버 연결",
      badge: dataSource === "server" || dataSource === "test" ? "연결됨" : "확인 필요",
      detail: dataSource === "server" || dataSource === "test" ? "Version.3 서버에서 운영 데이터 품질 결과를 받았습니다." : "공개 운영 전에는 Apps Script나 Preview가 아니라 Version.3 서버 세션으로 확인해야 합니다.",
      status: dataSource === "server" || dataSource === "test" ? "good" : "danger"
    },
    {
      id: "accounts",
      label: "운영 계정",
      badge: accounts ? `${accounts}개` : "미확인",
      detail: accounts ? "대표, 매니저, 강사, 수강생 계정 현황이 서버 요약에 포함되어 있습니다." : "서버 연결 후 실제 운영 계정을 등록해야 합니다.",
      status: accounts ? "good" : "warn"
    },
    {
      id: "student-links",
      label: "수강생 계정 연결",
      badge: studentsWithoutAccounts ? `${studentsWithoutAccounts}명 미연결` : students ? "연결 완료" : "학생 없음",
      detail: studentsWithoutAccounts ? "학생 기록은 있지만 수강생 로그인 계정이 없는 항목이 남아 있습니다." : "학생 기록과 수강생 계정 연결 상태가 운영 기준을 만족합니다.",
      status: studentsWithoutAccounts ? "warn" : "good"
    },
    {
      id: "references",
      label: "참조 무결성",
      badge: brokenReferences ? `${brokenReferences}건` : "정상",
      detail: brokenReferences ? "학생, 강사, 수업, 예약, 수납 데이터 사이에 끊어진 연결이 있습니다." : "학생, 강사, 수업, 예약, 수납 연결에서 끊어진 참조가 없습니다.",
      status: brokenReferences ? "danger" : "good"
    },
    {
      id: "audit",
      label: "감사 로그",
      badge: auditSource === "server" || auditSource === "test" ? `${auditLogs}건` : "서버 필요",
      detail: auditSource === "server" || auditSource === "test" ? "계정, 상담요청, 공지, 데이터 변경 이력을 서버 감사 로그로 확인할 수 있습니다." : "감사 로그는 Version.3 서버 세션에서만 운영 증거로 봅니다.",
      status: (auditSource === "server" || auditSource === "test") && auditLogs ? "good" : "warn"
    },
    {
      id: "backup",
      label: "백업 가능 상태",
      badge: summary?.backupEnabled ? "사용" : "확인 필요",
      detail: summary?.backupEnabled ? "서버가 데이터 변경 전 백업 파일을 만들 수 있는 상태입니다." : "외부 서버는 /data 같은 영구 디스크와 백업 가능 경로를 사용해야 합니다.",
      status: summary?.backupEnabled ? "good" : "warn"
    }
  ];
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
  if (source === "loading") return "운영 데이터 점검 결과를 불러오는 중입니다.";
  if (source === "server" || source === "test") return "Version.3 별도 서버 기준 점검 결과입니다.";
  if (source === "live") return "전환 연결층 데이터 기준 점검 결과입니다.";
  if (source === "fallback") return `연결 또는 권한 확인이 필요합니다. ${error}`;
  return "실사용 세션이 없어 기능 점검 Preview 상태입니다. 데이터 원본 점검 결과는 표시하지 않습니다.";
}

function auditStatusMessage(source: keyof typeof sourceLabel, error: string) {
  if (source === "server" || source === "test") return "계정, 상담요청, 공지, 세션 변경 이력을 Version.3 서버 기준으로 표시합니다.";
  if (source === "fallback") return `감사 로그를 불러오지 못했습니다. ${error}`;
  if (source === "live") return "전환 세션에서는 Version.3 서버 감사 로그를 표시하지 않습니다.";
  return "Version.3 서버 세션이 없어서 감사 로그를 표시하지 않습니다.";
}

function severityBadge(issue: DataQualityIssue) {
  if (issue.severity === "blocking") return <Badge tone="danger">즉시 조치</Badge>;
  if (issue.severity === "warning") return <Badge tone="warn">확인 필요</Badge>;
  return <Badge>정보</Badge>;
}

function qualityCheckBadge(check: DataQualityCheck) {
  if (check.status === "danger") return <Badge tone="danger">즉시 조치</Badge>;
  if (check.status === "warn") return <Badge tone="warn">확인 필요</Badge>;
  if (check.status === "good") return <Badge tone="good">정상</Badge>;
  return <Badge>정보</Badge>;
}

function qualityCheckLabel(check: DataQualityCheck) {
  if (check.id === "student-account-links") return "수강생 계정 연결";
  if (check.id === "reference-integrity") return "참조 무결성";
  if (check.id === "notice-targets") return "공지 대상";
  if (check.id === "audit-logs") return "감사 로그";
  if (check.id === "open-consultations") return "상담요청";
  return check.label || check.id;
}

function auditActionLabel(action: string) {
  if (action === "create_account") return "계정 생성";
  if (action === "pause_account") return "계정 중지";
  if (action === "activate_account") return "계정 재개";
  if (action === "reset_password") return "비밀번호 초기화";
  if (action === "change_password") return "비밀번호 변경";
  if (action === "update_permissions") return "권한 변경";
  if (action === "create_consultation") return "상담요청 접수";
  if (action === "update_consultation_status") return "상담요청 처리";
  if (action === "create_notice") return "공지 작성";
  if (action === "export_data") return "데이터 내보내기";
  if (action === "import_data") return "데이터 가져오기";
  if (action === "login_throttled") return "로그인 제한";
  if (action === "logout") return "로그아웃";
  return action || "변경";
}

function auditTargetLabel(targetType: string) {
  if (targetType === "account") return "계정";
  if (targetType === "consultationRequest") return "상담요청";
  if (targetType === "notice") return "공지";
  if (targetType === "session") return "세션";
  if (targetType === "security") return "보안";
  return targetType || "대상";
}

function auditMetadata(log: Version3AuditLog) {
  const metadata = log.metadata || {};
  const parts = Object.entries(metadata)
    .filter(([, value]) => value != null && value !== "" && typeof value !== "object")
    .map(([key, value]) => `${key}: ${String(value)}`);
  return parts.length ? parts.join(" · ") : "-";
}

function formatAuditTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
