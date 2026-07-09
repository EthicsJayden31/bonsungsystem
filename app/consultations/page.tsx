"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import type { Consultation, ConsultationHistory } from "@/lib/operations-types";
import { useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentRole } from "@/lib/use-current-role";
import { normalizeConsultationStatus, version3ConsultationStatuses, type Version3ConsultationStatus } from "@/lib/version3-server-contract";

type StatusFilter = Version3ConsultationStatus | "전체";
type AssigneeOption = {
  id: string;
  name: string;
  role: "manager" | "coach";
};

export default function ConsultationsPage() {
  const role = useCurrentRole();
  const { data, source, error } = useOperationsData(role);
  const saveAction = useOperationAction();
  const requestedConsultationId = useRequestedConsultationId();
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("전체");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Version3ConsultationStatus>>({});
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<string, string>>({});
  const [localHistory, setLocalHistory] = useState<ConsultationHistory[]>([]);
  const isStudent = role === "artist";
  const canTriage = role === "admin" || role === "manager";
  const studentName = data.students[0]?.name || "수강생";
  const sourceLabel = source === "server" ? "Version.3 서버 데이터" : source === "live" ? "전환 데이터" : source === "fallback" ? "연결 실패" : "확인 중";
  const assignees = useMemo(() => buildAssignees(data.teachers), [data.teachers]);
  const assigneeNames = useMemo(() => Object.fromEntries(assignees.map((assignee) => [assignee.id, assignee.name])), [assignees]);
  const consultations = useMemo(
    () =>
      data.consultations.map((item) => {
        const assignedTo = assigneeOverrides[item.id] ?? item.assignedTo;
        return {
          ...item,
          status: statusOverrides[item.id] ?? normalizeConsultationStatus(item.status),
          assignedTo,
          assignedToName: assignedTo ? assigneeNames[assignedTo] || item.assignedToName || assignedTo : ""
        };
      }),
    [assigneeNames, assigneeOverrides, data.consultations, statusOverrides]
  );
  const requestedConsultation = useMemo(
    () => consultations.find((item) => item.id === requestedConsultationId),
    [consultations, requestedConsultationId]
  );
  const effectiveStatusFilter: StatusFilter =
    requestedConsultation && statusFilter !== "전체" && requestedConsultation.status !== statusFilter ? "전체" : statusFilter;
  const filteredConsultations = useMemo(() => {
    const items = effectiveStatusFilter === "전체" ? consultations : consultations.filter((item) => item.status === effectiveStatusFilter);
    if (!requestedConsultationId) return items;
    return [...items].sort((left, right) => Number(right.id === requestedConsultationId) - Number(left.id === requestedConsultationId));
  }, [consultations, effectiveStatusFilter, requestedConsultationId]);
  const visibleConsultationIds = useMemo(() => new Set(consultations.map((item) => item.id)), [consultations]);
  const consultationHistory = useMemo(
    () =>
      [...localHistory, ...data.consultationHistory]
        .filter((item) => visibleConsultationIds.has(item.consultationId))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 8),
    [data.consultationHistory, localHistory, visibleConsultationIds]
  );
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(version3ConsultationStatuses.map((status) => [status, 0])) as Record<Version3ConsultationStatus, number>;
    consultations.forEach((item) => {
      counts[normalizeConsultationStatus(item.status)] += 1;
    });
    return counts;
  }, [consultations]);

  useEffect(() => {
    if (!requestedConsultation) return;
    window.requestAnimationFrame(() => {
      document.getElementById("consultation-request-focus")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [requestedConsultation]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const memo = String(form.get("memo") || "").trim();
    const goal = String(form.get("goal") || "").trim() || "상담요청";

    if (!memo) {
      setMessage("상담요청 내용을 입력해 주세요.");
      return;
    }

    setMessage("");
    try {
      await saveAction.run("createConsultation", {
        consultation: {
          studentName,
          channel: "Version.3 상담요청",
          major: "보컬",
          goal,
          memo,
          status: "접수됨",
          priority: "보통"
        }
      });
      event.currentTarget.reset();
      setMessage("상담요청을 접수했습니다. 매니저가 먼저 확인합니다.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "상담요청을 저장하지 못했습니다.");
    }
  }

  async function updateStatus(consultationId: string, status: Version3ConsultationStatus, assignedTo?: string) {
    setStatusOverrides((current) => ({ ...current, [consultationId]: status }));
    setMessage("");

    if (!saveAction.hasLiveSession) {
      appendLocalHistory(consultationId, "update_consultation_status", status, assignedTo);
      setMessage("상담요청 상태를 변경했습니다.");
      return;
    }

    try {
      await saveAction.run("updateConsultationStatus", { consultationId, status, assignedTo });
      appendLocalHistory(consultationId, "update_consultation_status", status, assignedTo);
      setMessage(`상담요청 상태를 '${status}'로 저장했습니다.`);
    } catch (caught) {
      setStatusOverrides((current) => {
        const next = { ...current };
        delete next[consultationId];
        return next;
      });
      setMessage(caught instanceof Error ? caught.message : "상담요청 상태를 저장하지 못했습니다.");
    }
  }

  async function updateAssignee(item: Consultation, assignedTo: string) {
    setAssigneeOverrides((current) => ({ ...current, [item.id]: assignedTo }));
    setMessage("");

    if (!saveAction.hasLiveSession) {
      appendLocalHistory(item.id, "assign_consultation", normalizeConsultationStatus(item.status), assignedTo);
      setMessage("담당자를 배정했습니다.");
      return;
    }

    try {
      await saveAction.run("updateConsultationStatus", {
        consultationId: item.id,
        status: normalizeConsultationStatus(item.status),
        assignedTo
      });
      appendLocalHistory(item.id, "assign_consultation", normalizeConsultationStatus(item.status), assignedTo);
      setMessage(`상담요청 담당자를 '${assigneeNames[assignedTo] || assignedTo || "미배정"}'로 저장했습니다.`);
    } catch (caught) {
      setAssigneeOverrides((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setMessage(caught instanceof Error ? caught.message : "상담요청 담당자를 저장하지 못했습니다.");
    }
  }

  function appendLocalHistory(consultationId: string, action: string, status: Version3ConsultationStatus, assignedTo?: string) {
    const occurredAt = new Date().toISOString();
    setLocalHistory((current) => [
      {
        id: `local-${consultationId}-${occurredAt}`,
        consultationId,
        actorId: role || "current",
        actorName: currentActorName(role),
        action,
        status,
        assignedTo: assignedTo || "",
        assignedToName: assignedTo ? assigneeNames[assignedTo] || assignedTo : "매니저 접수",
        occurredAt
      },
      ...current
    ]);
  }

  return (
    <AppShell area="consultations">
      <Section
        title={isStudent ? "상담요청" : "상담요청 접수함"}
        description={`${isStudent ? "수강생은 필요한 내용을 일방향 메시지로 보냅니다." : "대표와 매니저는 접수된 요청을 먼저 확인하고 필요한 담당자에게 공유합니다."} 현재 표시: ${sourceLabel}${error ? ` · 연결 오류: ${error}` : ""}`}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-3">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <p className="text-sm font-extrabold text-ink">{isStudent ? "내 상담요청" : "접수된 상담요청"}</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {canTriage ? "상태값은 접수됨, 확인 중, 전달 필요, 종결 흐름으로 관리합니다." : "답변형 Q&A가 아니라 운영진에게 보내는 일방향 요청함입니다."}
              </p>
            </div>
            {canTriage ? (
              <div className="grid gap-2 rounded-2xl border border-line bg-white p-3 shadow-card sm:grid-cols-5">
                {(["전체", ...version3ConsultationStatuses] as StatusFilter[]).map((status) => (
                  <button
                    className={`rounded-xl px-3 py-2 text-sm font-extrabold transition ${statusFilter === status ? "bg-brand text-white shadow-sm" : "bg-surface-muted text-muted hover:bg-brand/5 hover:text-brand"}`}
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    type="button"
                  >
                    {status}
                    <span className="ml-1 text-xs opacity-75">{status === "전체" ? consultations.length : statusCounts[status]}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {requestedConsultationId ? (
              <RequestedConsultationPanel consultation={requestedConsultation} requestId={requestedConsultationId} />
            ) : null}
            {filteredConsultations.length ? (
              <DataTable
                headers={isStudent ? ["요청", "상태", "작성일", "내용"] : ["수강생", "상태", "담당", "우선순위", "내용", "처리"]}
                rows={filteredConsultations.map((item) =>
                  isStudent
                    ? [item.goal || "상담요청", statusBadge(item.status), item.date || "-", item.memo || "-"]
                    : [
                        item.studentName || "-",
                        statusBadge(item.status),
                        <AssigneeSelect assignees={assignees} item={item} key={`${item.id}-assignee`} onUpdate={updateAssignee} />,
                        item.priority || "보통",
                        item.memo || "-",
                        <StatusActions assignedTo={item.assignedTo} current={normalizeConsultationStatus(item.status)} id={item.id} key={`${item.id}-actions`} onUpdate={updateStatus} />
                      ]
                )}
              />
            ) : (
              <EmptyState title="상담요청이 없습니다" description={statusFilter === "전체" ? "새 요청이 접수되면 이곳에 표시됩니다." : "선택한 상태에 해당하는 요청이 없습니다."} />
            )}
            {message && !isStudent ? <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">{message}</p> : null}
          </div>

          {isStudent ? (
            <form className="scroll-mt-28 rounded-[24px] border border-line bg-white p-5 shadow-card" onSubmit={submitRequest}>
              <div className="mb-4">
                <h2 className="text-lg font-extrabold tracking-tight text-ink">새 상담요청</h2>
                <p className="mt-1 text-xs leading-5 text-muted">개인정보와 민감한 상담 내용은 꼭 필요한 범위로만 작성해 주세요.</p>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-ink">요청 주제</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="goal" placeholder="예: 수업 시간 변경" />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">요청 내용</span>
                <textarea className="mt-1 min-h-32 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="memo" placeholder="매니저에게 전달할 내용을 적어 주세요." />
              </label>
              <button className="mt-4 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/45" disabled={saveAction.pending} type="submit">
                {saveAction.pending ? "접수 중" : "상담요청 보내기"}
              </button>
              {message ? <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">{message}</p> : null}
            </form>
          ) : (
            <aside className="rounded-[24px] border border-line bg-white p-5 shadow-card">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">운영 기준</h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-muted">
                <p>수강생 상담요청은 매니저가 먼저 확인합니다.</p>
                <p>확인 중은 매니저가 읽은 상태, 전달 필요는 담당 강사나 대표에게 넘겨야 하는 상태입니다.</p>
                <p>Q&A 게시판은 만들지 않고, 상태 관리가 있는 일방향 메시지로 유지합니다.</p>
              </div>
              <div className="mt-5 border-t border-line pt-5">
                <h3 className="text-sm font-extrabold text-ink">최근 변경 이력</h3>
                {consultationHistory.length ? (
                  <div className="mt-3 grid gap-2">
                    {consultationHistory.map((history) => (
                      <HistoryItem history={history} key={history.id} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-xs leading-5 text-muted">상태나 담당자를 바꾸면 이곳에 이력이 남습니다.</p>
                )}
              </div>
            </aside>
          )}
        </div>
      </Section>
    </AppShell>
  );
}

function currentActorName(role: string | null) {
  if (role === "admin") return "시스템 관리자";
  if (role === "manager") return "조영진";
  if (role === "coach") return "황휘현";
  if (role === "artist") return "장윤호";
  return "현재 계정";
}

function useRequestedConsultationId() {
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    const readRequestId = () => {
      const params = new URLSearchParams(window.location.search);
      setRequestId(params.get("request") || params.get("consultation") || "");
    };
    readRequestId();
    window.addEventListener("popstate", readRequestId);
    return () => window.removeEventListener("popstate", readRequestId);
  }, []);

  return requestId;
}

function RequestedConsultationPanel({ consultation, requestId }: { consultation?: Consultation; requestId: string }) {
  if (!consultation) {
    return (
      <div className="scroll-mt-28 rounded-2xl border border-accent/25 bg-accent/10 p-4 text-sm leading-6 text-accent" id="consultation-request-focus">
        요청한 상담요청을 현재 목록에서 찾지 못했습니다. 권한 범위, 서버 동기화 상태, 또는 이미 종결된 요청인지 확인이 필요합니다. 요청 ID: {requestId}
      </div>
    );
  }

  return (
    <article className="scroll-mt-28 rounded-2xl border border-brand/20 bg-brand/5 p-4 shadow-card" id="consultation-request-focus">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold text-brand">요청 바로 확인</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-ink">{consultation.studentName || "미등록 학생"} · {consultation.goal || "상담요청"}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{consultation.memo || "내용 없음"}</p>
        </div>
        {statusBadge(consultation.status)}
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
        <div className="rounded-xl bg-white px-3 py-2">
          <dt className="font-bold text-ink">담당</dt>
          <dd className="mt-1">{consultation.assignedToName || consultation.assignedTo || "매니저 접수"}</dd>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <dt className="font-bold text-ink">작성일</dt>
          <dd className="mt-1">{consultation.date || "-"}</dd>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <dt className="font-bold text-ink">최근 변경</dt>
          <dd className="mt-1">{consultation.statusUpdatedAt?.slice(0, 10) || "-"}</dd>
        </div>
      </dl>
    </article>
  );
}

function buildAssignees(teachers: Array<{ id: string; name: string }>): AssigneeOption[] {
  const options = new Map<string, AssigneeOption>();
  options.set("manager-1", { id: "manager-1", name: "조영진", role: "manager" });
  teachers.forEach((teacher) => {
    if (!teacher.id) return;
    options.set(teacher.id, { id: teacher.id, name: teacher.name || teacher.id, role: "coach" });
  });
  return Array.from(options.values());
}

function HistoryItem({ history }: { history: ConsultationHistory }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold text-ink">{historyLabel(history.action)}</p>
        <span className="text-[11px] text-muted">{history.occurredAt.slice(0, 10)}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">
        {history.actorName || "알 수 없음"} · {history.status || "상태 없음"} · {history.assignedToName || "매니저 접수"}
      </p>
    </div>
  );
}

function historyLabel(action: string) {
  if (action === "create_consultation") return "요청 접수";
  if (action === "assign_consultation") return "담당자 배정";
  if (action === "update_consultation_status") return "상태 변경";
  return "상담요청 변경";
}

function statusBadge(status: string) {
  const normalized = normalizeConsultationStatus(status);
  if (normalized === "종결") return <Badge tone="good">종결</Badge>;
  if (normalized === "전달 필요") return <Badge tone="warn">전달 필요</Badge>;
  if (normalized === "확인 중") return <Badge>확인 중</Badge>;
  return <Badge tone="danger">접수됨</Badge>;
}

function AssigneeSelect({
  assignees,
  item,
  onUpdate
}: {
  assignees: AssigneeOption[];
  item: Consultation;
  onUpdate: (item: Consultation, assignedTo: string) => void;
}) {
  return (
    <label className="block min-w-36">
      <span className="sr-only">담당자</span>
      <select
        className="h-9 w-full rounded-lg border border-line bg-white px-2 text-xs font-bold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
        onChange={(event) => onUpdate(item, event.target.value)}
        value={item.assignedTo || ""}
      >
        <option value="">매니저 접수</option>
        {assignees.map((assignee) => (
          <option key={assignee.id} value={assignee.id}>
            {assignee.name}
          </option>
        ))}
      </select>
      {item.statusUpdatedAt ? <span className="mt-1 block text-[11px] font-medium text-muted">변경일 {item.statusUpdatedAt.slice(0, 10)}</span> : null}
    </label>
  );
}

function StatusActions({
  assignedTo,
  current,
  id,
  onUpdate
}: {
  assignedTo?: string;
  current: Version3ConsultationStatus;
  id: string;
  onUpdate: (consultationId: string, status: Version3ConsultationStatus, assignedTo?: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {version3ConsultationStatuses.map((status) => (
        <button
          className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${current === status ? "border-brand bg-brand text-white" : "border-line bg-white text-brand hover:bg-brand/5"}`}
          disabled={current === status}
          key={status}
          onClick={() => onUpdate(id, status, assignedTo)}
          type="button"
        >
          {status}
        </button>
      ))}
    </div>
  );
}
