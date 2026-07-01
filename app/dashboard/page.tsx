"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import { canAccessVersion3Area } from "@/lib/access-policy";
import { useAccountsData } from "@/lib/accounts-data";
import { buildDashboardWorkQueue, countActiveConsultations, countOpenTasks, countPendingAttendance } from "@/lib/dashboard-work-queue";
import { courseName, studentName, teacherName, useOperationAction, useOperationsData, type DataSource } from "@/lib/operations-data";
import { usePreferences } from "@/lib/preferences";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";
import type { CurrentUser, Role } from "@/lib/auth-shared";
import type { Consultation } from "@/lib/demo-data";
import { useState, type ReactNode } from "react";

type QuickCardData = {
  href: string;
  label: string;
  value: number;
  helper: string;
  tone?: "default" | "warn" | "good";
};

type ConsultationAlert = {
  id: string;
  href: string;
  label: string;
  title: string;
  meta: string;
  unread: boolean;
  tone: "default" | "warn" | "danger";
};

export default function DashboardPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const preferences = usePreferences();
  const operations = useOperationsData(role);
  const saveAction = useOperationAction();
  const data = operations.data;
  const profile = dashboardProfile(role);
  const accessUser = user ?? role;
  const canViewAccounts = canAccessVersion3Area(accessUser, "accounts");
  const accountState = useAccountsData({ enabled: canViewAccounts });
  const [acknowledgedConsultationIds, setAcknowledgedConsultationIds] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState("");

  const unpaid = role === "teacher" ? [] : data.payments.filter((payment) => ["미납", "청구예정", "청구완료", "확인 필요"].includes(payment.status));
  const activeConsultationCount = countActiveConsultations(data);
  const openTaskCount = countOpenTasks(data);
  const pendingAttendanceCount = countPendingAttendance(data);
  const makeupStudents = data.attendance.filter((item) => item.makeupNeeded);
  const priorityItems = buildDashboardWorkQueue(data, 8, canViewAccounts ? accountState.accounts : undefined);
  const consultationAlerts = buildConsultationAlerts(data.consultations, user ?? role, acknowledgedConsultationIds);
  const recentStudents = data.students.slice(0, 3);
  const today = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(new Date());
  const mobileQuickCards = buildMobileQuickCards(preferences.dashboardFocus, {
    lessons: data.lessons.length,
    consultations: activeConsultationCount,
    attendance: pendingAttendanceCount,
    students: data.students.length,
    rooms: data.rooms.length
  }).filter((card) => canAccessVersion3Area(accessUser, areaFromHref(card.href)));
  const visibleActions = profile.actions.filter(([, href]) => canAccessVersion3Area(accessUser, areaFromHref(href)));

  async function acknowledgeConsultation(consultationId: string) {
    setAcknowledgedConsultationIds((current) => (current.includes(consultationId) ? current : [...current, consultationId]));
    setAlertMessage("");

    if (!saveAction.hasLiveSession) {
      setAlertMessage("Preview에서는 확인 처리 상태만 화면에서 반영합니다. 서버 세션에서는 감사 로그까지 저장됩니다.");
      return;
    }

    try {
      await saveAction.run("acknowledgeConsultation", { consultationId });
      setAlertMessage("상담요청을 확인 처리했습니다.");
    } catch (caught) {
      setAcknowledgedConsultationIds((current) => current.filter((id) => id !== consultationId));
      setAlertMessage(caught instanceof Error ? caught.message : "상담요청 확인 처리에 실패했습니다.");
    }
  }

  return (
    <AppShell area="dashboard">
      <Section title="홈" description="모바일에서는 오늘 처리할 일과 빠른 이동을 먼저 보여줍니다. 자세한 표는 아래에서 확인합니다.">
        <SourceBanner source={operations.source} error={operations.error} hasLiveSession={operations.hasLiveSession} />

        <section className="grid gap-3 lg:hidden" aria-label="모바일 빠른 업무">
          <div className="rounded-[28px] bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-5 text-white shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Today</p>
            <h2 className="mt-2 text-2xl font-extrabold">{profile.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/78">{profile.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {mobileQuickCards.map((card) => (
              <QuickCard href={card.href} label={card.label} value={card.value} helper={card.helper} tone={card.tone} key={card.href} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ...visibleActions
            ].map(([label, href]) => (
              <Link className="rounded-2xl border border-line bg-white px-4 py-3 text-center text-sm font-extrabold text-ink shadow-card" href={href} key={href}>
                {label}
              </Link>
            ))}
          </div>
        </section>

        <div className="relative hidden overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-6 text-white shadow-card sm:p-8 lg:block">
          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full border border-white/15" />
          <div className="absolute bottom-0 right-8 text-[11rem] font-black leading-none text-white/[0.04]">♪</div>
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Bonsung Music Academy</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight">{profile.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{today} 기준 · {profile.description}</p>
            </div>
            <div className="flex gap-2">
              {visibleActions.map(([label, href]) => (
                <Link className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand shadow-sm transition hover:bg-white/90" href={href} key={href}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="오늘 수업" value={data.lessons.length} helper="예정 및 최근 완료 포함" />
          <Stat label="상담요청" value={activeConsultationCount} helper="종결 제외 확인 필요" />
          <Stat label="출결 미처리" value={pendingAttendanceCount} helper="오늘 확인할 항목" />
          <Stat label="미완료 업무" value={openTaskCount} helper="진행 중 또는 보류" />
        </div>

        {consultationAlerts.length ? <ConsultationAlertStrip alerts={consultationAlerts} message={alertMessage} onAcknowledge={acknowledgeConsultation} pending={saveAction.pending} /> : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="xl:col-span-2">
            <Panel title="우선 처리 목록">
              {priorityItems.length ? (
                <DataTable
                  headers={["구분", "내용", "담당", "바로가기"]}
                  rows={priorityItems.map((item) => [
                    <Badge tone={item.tone} key={item.id}>{item.kind}</Badge>,
                    item.title,
                    item.ownerName,
                    <Link className="font-extrabold text-brand underline-offset-4 hover:underline" href={item.href} key={item.id}>
                      확인
                    </Link>
                  ])}
                />
              ) : (
                <EmptyState title="우선 처리할 항목이 없습니다" description="상담요청, 미처리 출결, 미납 수납, 내부 업무가 없으면 이 영역은 비어 있습니다." />
              )}
            </Panel>
          </div>

          <Panel title="오늘 예정 수업">
            {data.lessons.length ? (
              <DataTable
                headers={["학생", "강사", "과목", "상태"]}
                rows={data.lessons.map((lesson) => [
                  lesson.studentName || studentName(data, lesson.studentId),
                  lesson.teacherName || teacherName(data, lesson.teacherId),
                  lesson.subject || courseName(data, lesson.courseId),
                  <Badge key={lesson.id}>{lesson.status}</Badge>
                ])}
              />
            ) : (
              <EmptyState title="예정 수업이 없습니다" description="Version.3 서버 또는 preview 데이터에 오늘 수업이 없으면 이 영역은 비어 있습니다." />
            )}
          </Panel>

          <Panel title="상담요청 상태">
            <DataTable headers={["학생", "상태", "담당", "작성일"]} rows={data.consultations.map((item) => [item.studentName, <Badge key={item.id}>{item.status}</Badge>, item.assignedToName || item.assignedTo || "매니저 접수", item.date || item.followUpDate || "-"])} />
          </Panel>

          <Panel title="출결 미처리 수업">
            {pendingAttendanceCount ? (
              <DataTable headers={["학생", "상태", "메모"]} rows={data.attendance.filter((item) => item.status === "미처리").map((item) => [studentName(data, item.studentId), <Badge key={item.id} tone="warn">{item.status}</Badge>, item.memo])} />
            ) : (
              <EmptyState title="미처리 출결이 없습니다" description="출결 처리가 완료되면 이 영역은 비어 있습니다." />
            )}
          </Panel>

          <Panel title="보강 확인이 필요한 학생">
            {makeupStudents.length ? (
              <DataTable headers={["학생", "상태", "메모"]} rows={makeupStudents.map((item) => [studentName(data, item.studentId), <Badge key={item.id} tone="warn">{item.status}</Badge>, item.memo])} />
            ) : (
              <EmptyState title="보강 필요 학생이 없습니다" description="결석 처리 후 보강 필요 여부를 기록하면 이곳에 표시합니다." />
            )}
          </Panel>

          {canAccessVersion3Area(accessUser, "payments") ? (
            <Panel title="수납 확인 필요">
              {unpaid.length ? (
                <DataTable headers={["학생", "항목", "상태", "금액"]} rows={unpaid.map((item) => [item.studentName || studentName(data, item.studentId), item.title, <Badge key={item.id} tone="warn">{item.status}</Badge>, `${item.amount.toLocaleString("ko-KR")}원`])} />
              ) : (
                <EmptyState title="수납 확인 항목이 없습니다" description="강사 권한에서는 수납 데이터가 표시되지 않습니다." />
              )}
            </Panel>
          ) : null}

          <Panel title="최근 등록 학생">
            <DataTable headers={["이름", "전공", "상태", "등록일"]} rows={recentStudents.map((student) => [student.name, student.major, <Badge key={student.id}>{student.status}</Badge>, student.enrolledAt || "-"])} />
          </Panel>

          <Panel title="최근 레슨노트">
            {data.lessonNotes.length ? (
              <DataTable headers={["학생", "강사", "수업일", "다음 목표"]} rows={data.lessonNotes.map((note) => [note.studentName || studentName(data, note.studentId), note.teacherName || teacherName(data, note.teacherId), note.date, note.nextGoal || "-"])} />
            ) : (
              <EmptyState title="최근 레슨노트가 없습니다" description="Version.3 서버의 레슨노트 응답을 연결해 표시합니다." />
            )}
          </Panel>

          <Panel title="내부 미완료 업무">
            <DataTable headers={["업무", "담당자", "상태", "마감일"]} rows={data.tasks.filter((task) => task.status !== "완료").map((task) => [task.title, task.assignee, <Badge key={task.id}>{task.status}</Badge>, task.dueDate])} />
          </Panel>
        </div>
      </Section>
    </AppShell>
  );
}

function dashboardProfile(role: Role | null) {
  if (role === "student") {
    return {
      title: "내 수업 홈",
      description: "공지, 내 수업, 레슨노트, 상담요청, 연습실 예약을 한곳에서 시작합니다.",
      actions: [["공지 확인", "/notices"], ["상담요청", "/consultations"], ["내 수업", "/lessons"], ["연습실 예약", "/practice-rooms"]]
    };
  }
  if (role === "teacher") {
    return {
      title: "강사 업무 홈",
      description: "담당 학생, 오늘 수업, 출결, 레슨노트와 공간 예약을 빠르게 확인합니다.",
      actions: [["담당 학생", "/students"], ["오늘 수업", "/lessons"], ["레슨노트", "/lesson-notes"], ["공간 예약", "/practice-rooms"]]
    };
  }
  if (role === "manager") {
    return {
      title: "매니저 운영 홈",
      description: "상담요청 접수, 학생·강사·수업 관리, 공지 작성 흐름을 우선 확인합니다.",
      actions: [["상담요청", "/consultations"], ["학생 관리", "/students"], ["계정 관리", "/accounts"], ["공지 작성", "/notices"]]
    };
  }
  return {
    title: "대표 운영 홈",
    description: "전체 운영 현황, 공지, 상담요청, 수납과 데이터 점검을 확인합니다.",
    actions: [["계정 관리", "/accounts"], ["공지 작성", "/notices"], ["상담요청", "/consultations"], ["데이터 점검", "/data-quality"]]
  };
}

function buildMobileQuickCards(
  focus: "operations" | "lessons" | "students",
  counts: { lessons: number; consultations: number; attendance: number; students: number; rooms: number }
) {
  const cards: Record<"lessons" | "consultations" | "attendance" | "students" | "rooms", QuickCardData> = {
    lessons: { href: "/lessons", label: "오늘 수업", value: counts.lessons, helper: "일정 확인" },
    consultations: {
      href: "/consultations",
      label: "상담요청",
      value: counts.consultations,
      helper: "상태 확인",
      tone: counts.consultations ? "warn" : "good"
    },
    attendance: {
      href: "/attendance",
      label: "출결 미처리",
      value: counts.attendance,
      helper: "바로 입력",
      tone: counts.attendance ? "warn" : "good"
    },
    students: { href: "/students", label: "학생 관리", value: counts.students, helper: "상세 조회" },
    rooms: { href: "/practice-rooms", label: "공간 예약", value: counts.rooms, helper: "시간 선택" }
  };

  if (focus === "lessons") return [cards.lessons, cards.attendance, cards.consultations, cards.rooms, cards.students];
  if (focus === "students") return [cards.students, cards.consultations, cards.lessons, cards.attendance, cards.rooms];
  return [cards.consultations, cards.attendance, cards.lessons, cards.students, cards.rooms];
}

function buildConsultationAlerts(consultations: Consultation[], user: CurrentUser | Role | null, acknowledgedIds: string[], limit = 3): ConsultationAlert[] {
  const role = typeof user === "string" ? user : user?.role ?? null;
  const accountId = typeof user === "string" ? defaultAccountIdForRole(user) : user?.id ?? "";
  return consultations
    .filter((item) => item.status !== "종결")
    .map((item) => {
      const status = item.status || "접수됨";
      const student = item.studentName || "미등록 학생";
      const topic = item.goal || "상담요청";
      const assigned = item.assignedToName || item.assignedTo || "매니저 접수";
      const unread = Boolean(accountId && item.unreadForAccountIds?.includes(accountId) && !acknowledgedIds.includes(item.id));
      const isHandoff = status === "전달 필요";
      const isNew = status === "접수됨";
      const label = unread ? "미확인" : role === "student" ? "내 요청" : role === "teacher" ? "강사 확인" : isHandoff ? "전달 필요" : isNew ? "새 요청" : "확인 중";
      const tone: ConsultationAlert["tone"] = unread || isHandoff ? "danger" : isNew ? "warn" : "default";

      return {
        id: item.id,
        href: `/consultations?request=${encodeURIComponent(item.id)}`,
        label,
        title: `${student} · ${topic}`,
        meta: `${status} · ${assigned}`,
        unread,
        tone
      };
    })
    .sort((left, right) => consultationAlertRank(left) - consultationAlertRank(right) || left.title.localeCompare(right.title))
    .slice(0, limit);
}

function consultationAlertRank(item: ConsultationAlert) {
  if (item.unread) return 0;
  if (item.tone === "danger") return 0;
  if (item.tone === "warn") return 1;
  return 2;
}

function defaultAccountIdForRole(role: Role | null) {
  if (role === "owner") return "owner-1";
  if (role === "manager") return "manager-1";
  if (role === "teacher") return "teacher-1";
  if (role === "student") return "student-1-account";
  return "";
}

function areaFromHref(href: string) {
  const [path] = href.split("?");
  return path.replace(/^\//, "") || "dashboard";
}

function SourceBanner({ source, error, hasLiveSession }: { source: DataSource; error: string; hasLiveSession: boolean }) {
  const label = {
    loading: "데이터 확인 중",
    server: "Version.3 서버 데이터",
    live: "전환 연결층 데이터",
    preview: "기능 점검 Preview 데이터",
    fallback: "연결 실패"
  }[source];
  const tone = source === "server" || source === "live" ? "good" : source === "fallback" ? "warn" : "default";

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-ink">데이터 소스</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {source === "server"
              ? "Version.3 별도 서버 세션을 사용해 운영 데이터를 먼저 불러옵니다."
              : source === "fallback"
              ? "운영 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다."
              : hasLiveSession
              ? "저장된 전환 세션 토큰을 사용해 실사용 데이터를 먼저 불러옵니다."
              : "실사용 로그인을 하지 않아 Next UI 기능 점검용 preview 데이터를 표시합니다."}
          </p>
        </div>
        <Badge tone={tone}>{label}</Badge>
      </div>
      {error ? <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">데이터 연결 실패: {error}</p> : null}
    </div>
  );
}

function ConsultationAlertStrip({
  alerts,
  message,
  onAcknowledge,
  pending
}: {
  alerts: ConsultationAlert[];
  message: string;
  onAcknowledge: (consultationId: string) => void;
  pending: boolean;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-label="상담요청 알림">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-ink">상담요청 알림</h2>
          <p className="mt-1 text-xs leading-5 text-muted">새 접수와 전달 필요 요청을 대시보드에서 먼저 확인합니다.</p>
        </div>
        <Link className="text-sm font-extrabold text-brand underline-offset-4 hover:underline" href="/consultations">
          전체 보기
        </Link>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <article
            className={`rounded-xl border px-3 py-3 transition hover:-translate-y-0.5 ${
              alert.tone === "danger"
                ? "border-accent/25 bg-accent/10 text-accent"
                : alert.tone === "warn"
                  ? "border-brand/20 bg-brand/5 text-brand"
                  : "border-line bg-surface-muted text-ink"
            }`}
            key={alert.id}
          >
            <Link className="block" href={alert.href}>
              <span className="text-xs font-extrabold">{alert.label}</span>
              <span className="mt-1 block text-sm font-extrabold text-ink">{alert.title}</span>
              <span className="mt-1 block text-xs font-bold text-muted">{alert.meta}</span>
            </Link>
            {alert.unread ? (
              <button
                className="mt-3 rounded-lg border border-current bg-white/70 px-2.5 py-1.5 text-xs font-extrabold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending}
                onClick={() => onAcknowledge(alert.id)}
                type="button"
              >
                확인 처리
              </button>
            ) : null}
          </article>
        ))}
      </div>
      {message ? <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">{message}</p> : null}
    </section>
  );
}

function QuickCard({ href, label, value, helper, tone = "default" }: { href: string; label: string; value: number; helper: string; tone?: "default" | "warn" | "good" }) {
  const color = tone === "warn" ? "text-accent" : tone === "good" ? "text-success" : "text-ink";
  return (
    <Link className="rounded-2xl border border-line bg-white p-4 shadow-card" href={href}>
      <p className="text-xs font-extrabold text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
      <p className="mt-1 text-xs font-bold text-muted">{helper}</p>
    </Link>
  );
}

function Stat({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-4xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}
