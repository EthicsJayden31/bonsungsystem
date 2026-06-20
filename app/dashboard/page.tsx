"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import { attendance, consultations, getCourseName, getStudentName, getTeacherName, lessonNotes, lessons, payments, students, tasks } from "@/lib/demo-data";
import { usePreviewRole } from "@/lib/use-preview-role";
import type { ReactNode } from "react";

export default function DashboardPage() {
  const role = usePreviewRole();

  const visibleLessons = role === "teacher" ? lessons.filter((lesson) => lesson.teacherId === "teacher-1") : lessons;
  const unpaid = role === "teacher" ? [] : payments.filter((payment) => ["미납", "청구완료"].includes(payment.status));
  const openTasks = tasks.filter((task) => task.status !== "완료");
  const pendingAttendance = attendance.filter((item) => item.status === "미처리");
  const today = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(new Date());

  return (
    <AppShell area="dashboard">
      <Section title="대시보드" description="오늘 운영에 필요한 수업, 상담, 출결, 업무 상태를 한 화면에서 확인합니다.">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-6 text-white shadow-card sm:p-8">
          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full border border-white/15" />
          <div className="absolute bottom-0 right-8 text-[11rem] font-black leading-none text-white/[0.04]">♪</div>
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Bonsung Music Academy</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">오늘의 운영 현황</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{today} 기준으로 수업, 상담, 출결, 납부 대기 항목을 확인합니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              {["학생 등록", "상담 등록", "레슨 추가", "출결 입력"].map((label) => (
                <button className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand shadow-sm transition hover:bg-white/90" key={label} type="button">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="오늘 수업" value={visibleLessons.length} helper="예정 및 최근 완료 포함" />
          <Stat label="상담/후속" value={consultations.length} helper="후속 연락 필요" />
          <Stat label="출결 미처리" value={pendingAttendance.length} helper="오늘 확인할 항목" />
          <Stat label="미완료 업무" value={openTasks.length} helper="진행중 또는 할일" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="오늘 예정된 수업">
            <DataTable
              headers={["학생", "강사", "과목", "상태"]}
              rows={visibleLessons.map((lesson) => [getStudentName(lesson.studentId), getTeacherName(lesson.teacherId), getCourseName(lesson.courseId), <Badge key={lesson.id}>{lesson.status}</Badge>])}
            />
          </Panel>
          <Panel title="상담 일정 및 후속 연락">
            <DataTable headers={["학생", "연락처", "상태", "후속 연락"]} rows={consultations.map((item) => [item.studentName, item.phone, <Badge key={item.id}>{item.status}</Badge>, item.followUpDate])} />
          </Panel>
          <Panel title="출결 미처리 수업">
            {pendingAttendance.length ? <DataTable headers={["학생", "상태", "메모"]} rows={pendingAttendance.map((item) => [getStudentName(item.studentId), <Badge key={item.id} tone="warn">{item.status}</Badge>, item.memo])} /> : <EmptyState title="미처리 출결이 없습니다" description="오늘 수업 출결 처리가 완료되면 이 영역은 비어 있습니다." />}
          </Panel>
          <Panel title="보강 확인이 필요한 학생">
            <EmptyState title="보강 필요 학생이 없습니다" description="결석 처리 후 보강 필요 여부를 기록하면 이곳에 표시됩니다." />
          </Panel>
          {role !== "teacher" ? (
            <Panel title="납부 확인 필요">
              <DataTable headers={["학생", "항목", "상태", "금액"]} rows={unpaid.map((item) => [getStudentName(item.studentId), item.title, <Badge key={item.id} tone="warn">{item.status}</Badge>, `${item.amount.toLocaleString("ko-KR")}원`])} />
            </Panel>
          ) : null}
          <Panel title="최근 등록 학생">
            <DataTable headers={["이름", "전공", "상태", "등록일"]} rows={students.slice(0, 3).map((student) => [student.name, student.major, <Badge key={student.id}>{student.status}</Badge>, student.enrolledAt || "-"])} />
          </Panel>
          <Panel title="최근 레슨노트">
            <DataTable headers={["학생", "강사", "수업일", "다음 목표"]} rows={lessonNotes.map((note) => [getStudentName(note.studentId), getTeacherName(note.teacherId), note.date, note.nextGoal])} />
          </Panel>
          <Panel title="내부 미완료 업무">
            <DataTable headers={["업무", "담당자", "상태", "마감일"]} rows={openTasks.map((task) => [task.title, task.assignee, <Badge key={task.id}>{task.status}</Badge>, task.dueDate])} />
          </Panel>
        </div>
      </Section>
    </AppShell>
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
