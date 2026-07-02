"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import { hasVersion3Permission } from "@/lib/access-policy";
import { useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function TasksPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();
  const [message, setMessage] = useState("");
  const accessUser = user ?? role;
  const canManageOperations = hasVersion3Permission(user ?? role, "manageOperations");
  const canClockWork = hasVersion3Permission(accessUser, "clockWork");
  const canManageMeetings = hasVersion3Permission(accessUser, "manageMeetings");
  const canManageCalendar = hasVersion3Permission(accessUser, "manageCalendar");

  async function submitWorkLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    try {
      await saveAction.run("clockWork", { workLog: { memo: values.memo, workDate: values.workDate, mode: values.mode } });
      setMessage("근태 기록을 저장했습니다. 서버 데이터는 새로고침 후 목록에 반영됩니다.");
      form.reset();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "근태 기록을 저장하지 못했습니다.");
    }
  }

  async function submitMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    try {
      await saveAction.run("createMeeting", { meeting: mapMeetingInput(values) });
      setMessage("회의 일정을 저장했습니다. 서버 데이터는 새로고침 후 목록에 반영됩니다.");
      form.reset();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "회의 일정을 저장하지 못했습니다.");
    }
  }

  async function submitCalendarEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    try {
      await saveAction.run("createCalendarEvent", { event: mapCalendarInput(values) });
      setMessage("운영 일정을 저장했습니다. 서버 데이터는 새로고침 후 목록에 반영됩니다.");
      form.reset();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "운영 일정을 저장하지 못했습니다.");
    }
  }

  return (
    <AppShell area="tasks">
      <ResourcePage
        title="내부 업무"
        description={source === "server" || source === "test" ? "Version.3 서버의 내부 업무 데이터를 표시합니다." : source === "live" ? "전환 세션의 내 업무 데이터를 표시합니다." : source === "fallback" ? "내부 업무 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "Preview 데이터로 내부 업무 화면을 점검합니다."}
        headers={["업무", "담당자", "마감일", "상태", "우선순위", "메모"]}
        rows={data.tasks.map((task) => [task.title, task.assignee || "-", task.dueDate || "-", <Badge key={task.id}>{task.status || "할일"}</Badge>, task.priority || "보통", task.memo || "-"])}
        emptyTitle="표시할 업무가 없습니다"
        emptyDescription="실사용 세션이 없거나 서버 응답의 업무 데이터가 비어 있으면 이곳이 비어 있을 수 있습니다."
        onSubmit={canManageOperations ? (values) => saveAction.run("createTask", { task: mapTaskInput(values) }) : undefined}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "업무 저장"}
        submitHelp="담당자 ID를 비워두면 현재 로그인 계정의 업무로 저장됩니다."
        showForm={canManageOperations}
        fields={[
          { label: "업무명", name: "title" },
          { label: "담당자 ID", name: "assignee" },
          { label: "마감일", name: "dueDate", type: "date" },
          { label: "상태", name: "status", type: "select", options: ["할일", "진행중", "완료", "보류"] },
          { label: "우선순위", name: "priority", type: "select", options: ["높음", "보통", "낮음"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
      <Section
        title="근태 · 회의 · 일정"
        description={source === "server" || source === "test" ? "Version.3 서버에 저장된 내부 운영 기록을 확인하고 새 기록을 남깁니다." : "Preview 또는 점검 데이터로 내부 운영 흐름을 확인합니다."}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-ink">근태 기록</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">출근, 퇴근, 근무 메모를 계정 기준으로 남깁니다.</p>
                </div>
                <Badge tone={canClockWork ? "good" : "warn"}>{canClockWork ? "기록 가능" : "권한 필요"}</Badge>
              </div>
              {data.workLogs.length ? (
                <div className="mt-4">
                  <DataTable
                    headers={["직원", "근무일", "출근", "퇴근", "메모"]}
                    rows={data.workLogs.map((item) => [item.accountName || item.accountId, item.workDate || "-", formatTime(item.clockInAt), formatTime(item.clockOutAt), item.memo || "-"])}
                  />
                </div>
              ) : (
                <EmptyState title="근태 기록이 없습니다" description="권한이 있으면 출근 또는 퇴근 기록을 남길 수 있습니다." />
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">회의</h2>
              {data.meetings.length ? (
                <div className="mt-4">
                  <DataTable
                    headers={["회의명", "일시", "참석자", "상태", "메모"]}
                    rows={data.meetings.map((item) => [item.title, formatDateTime(item.startsAt), item.participantNames.join(", ") || "-", <Badge key={item.id}>{item.status || "예정"}</Badge>, item.memo || "-"])}
                  />
                </div>
              ) : (
                <EmptyState title="회의 기록이 없습니다" description="운영 회의가 등록되면 이곳에 표시됩니다." />
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">일정</h2>
              {data.calendarEvents.length ? (
                <div className="mt-4">
                  <DataTable
                    headers={["일정명", "날짜", "시간", "대상", "메모"]}
                    rows={data.calendarEvents.map((item) => [item.title, item.date || "-", item.startTime || "-", item.targetRoles.map(roleText).join(", ") || "전체", item.memo || "-"])}
                  />
                </div>
              ) : (
                <EmptyState title="일정이 없습니다" description="공지성 일정 또는 내부 운영 일정을 등록할 수 있습니다." />
              )}
            </div>
          </div>

          <aside className="h-fit space-y-5">
            {message ? <p className="rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 text-sm font-bold leading-6 text-muted">{message}</p> : null}
            <form className="rounded-2xl border border-line bg-white p-5 shadow-card" onSubmit={submitWorkLog}>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">근태 입력</h2>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">구분</span>
                <select className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canClockWork || saveAction.pending} name="mode">
                  <option value="clockIn">출근</option>
                  <option value="clockOut">퇴근</option>
                </select>
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">근무일</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canClockWork || saveAction.pending} name="workDate" type="date" />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">메모</span>
                <textarea className="mt-1 min-h-24 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canClockWork || saveAction.pending} name="memo" />
              </label>
              <button className="mt-4 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/45" disabled={!canClockWork || saveAction.pending} type="submit">
                근태 저장
              </button>
            </form>

            <form className="rounded-2xl border border-line bg-white p-5 shadow-card" onSubmit={submitMeeting}>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">회의 입력</h2>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">회의명</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageMeetings || saveAction.pending} name="title" />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">일시</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageMeetings || saveAction.pending} name="startsAt" type="datetime-local" />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">참석자 계정 ID</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageMeetings || saveAction.pending} name="participantIds" placeholder="쉼표로 구분" />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">메모</span>
                <textarea className="mt-1 min-h-20 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageMeetings || saveAction.pending} name="memo" />
              </label>
              <button className="mt-4 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/45" disabled={!canManageMeetings || saveAction.pending} type="submit">
                회의 저장
              </button>
            </form>

            <form className="rounded-2xl border border-line bg-white p-5 shadow-card" onSubmit={submitCalendarEvent}>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">일정 입력</h2>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">일정명</span>
                <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageCalendar || saveAction.pending} name="title" />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-ink">날짜</span>
                  <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageCalendar || saveAction.pending} name="date" type="date" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-ink">시간</span>
                  <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageCalendar || saveAction.pending} name="startTime" type="time" />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">대상</span>
                <select className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageCalendar || saveAction.pending} name="targetRoles">
                  <option value="owner,manager,teacher,student">전체</option>
                  <option value="owner,manager">운영진</option>
                  <option value="teacher">강사</option>
                  <option value="student">수강생</option>
                </select>
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">메모</span>
                <textarea className="mt-1 min-h-20 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageCalendar || saveAction.pending} name="memo" />
              </label>
              <button className="mt-4 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/45" disabled={!canManageCalendar || saveAction.pending} type="submit">
                일정 저장
              </button>
            </form>
          </aside>
        </div>
      </Section>
    </AppShell>
  );
}

function mapTaskInput(values: Record<string, string>) {
  return {
    title: values.title,
    assignee_id: values.assignee,
    due_date: values.dueDate,
    status: values.status,
    priority: values.priority,
    memo: values.memo
  };
}

function mapMeetingInput(values: Record<string, string>) {
  return {
    title: values.title,
    startsAt: values.startsAt,
    participantIds: splitValues(values.participantIds),
    memo: values.memo
  };
}

function mapCalendarInput(values: Record<string, string>) {
  return {
    title: values.title,
    date: values.date,
    startTime: values.startTime,
    targetRoles: splitValues(values.targetRoles),
    memo: values.memo
  };
}

function splitValues(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function roleText(value: string) {
  if (value === "owner") return "대표";
  if (value === "manager") return "매니저";
  if (value === "teacher") return "강사";
  if (value === "student") return "수강생";
  return value;
}
