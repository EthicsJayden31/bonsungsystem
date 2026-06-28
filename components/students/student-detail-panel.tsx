"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/table";
import { courseName, teacherName, type OperationsData } from "@/lib/operations-data";
import type { Guardian, LessonNote } from "@/lib/demo-data";
import type { Role } from "@/lib/auth-shared";
import type { ReactNode } from "react";

type StudentDetailPanelProps = {
  data: OperationsData;
  studentId: string;
  role: Role | null;
  onClose: () => void;
};

export function StudentDetailPanel({ data, studentId, role, onClose }: StudentDetailPanelProps) {
  const student = data.students.find((item) => item.id === studentId);

  if (!student) {
    return <EmptyState title="학생을 찾을 수 없습니다" description="목록에서 다른 학생을 선택해 주세요." />;
  }

  const guardians = data.guardians.filter((item) => item.studentId === student.id);
  const enrollments = data.enrollments.filter((item) => item.studentId === student.id);
  const lessons = data.lessons
    .filter((item) => item.studentId === student.id)
    .toSorted((left, right) => right.startsAt.localeCompare(left.startsAt));
  const lessonNotes = data.lessonNotes
    .filter((item) => item.studentId === student.id)
    .toSorted((left, right) => right.date.localeCompare(left.date));
  const reservations = data.reservations
    .filter((item) => item.studentId === student.id || item.studentName === student.name)
    .toSorted((left, right) => right.startsAt.localeCompare(left.startsAt));
  const payments = role === "teacher"
    ? []
    : data.payments.filter((item) => item.studentId === student.id || item.studentName === student.name);

  return (
    <section className="scroll-mt-24 overflow-hidden rounded-[24px] border border-brand/15 bg-white shadow-card" id="student-detail" aria-label={`${student.name} 상세 정보`}>
      <div className="bg-gradient-to-br from-brand-dark via-brand to-brand-soft p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-extrabold">
              {student.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/65">Student Detail</p>
              <h2 className="mt-1 truncate text-2xl font-extrabold tracking-tight">{student.name}</h2>
              <p className="mt-2 text-sm leading-6 text-white/75">{student.goal || "등록된 목표가 없습니다."}</p>
            </div>
          </div>
          <button className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand shadow-sm transition hover:bg-white/90" type="button" onClick={onClose}>
            상세 닫기
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="상태" value={student.status || "-"} />
          <Summary label="전공/관심 분야" value={student.major || "-"} />
          <Summary label="담당" value={student.teacherName || teacherName(data, student.teacherId)} />
          <Summary label="등록일" value={student.enrolledAt || "-"} />
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <InfoBlock title="기본 정보">
            <DetailRow label="연락처" value={role === "teacher" ? "권한 제한" : student.phone || "-"} />
            <DetailRow label="생년월일" value={student.birthDate || "-"} />
            <DetailRow label="메모" value={role === "teacher" ? maskTeacherMemo(student.memo) : student.memo || "-"} />
          </InfoBlock>
          <InfoBlock title="보호자">
            {guardians.length ? guardians.map((guardian) => <GuardianRow guardian={guardian} key={guardian.id} role={role} />) : <p className="text-sm text-muted">등록된 보호자 정보가 없습니다.</p>}
          </InfoBlock>
        </aside>

        <div className="min-w-0 space-y-5">
          <DetailSection title="수강 이력" count={enrollments.length}>
            {enrollments.length ? (
              <DataTable
                headers={["과목", "담당", "시작일", "상태", "메모"]}
                rows={enrollments.map((item) => [
                  courseName(data, item.courseId),
                  item.teacherName || teacherName(data, item.teacherId),
                  item.startDate || "-",
                  <Badge key={item.id}>{item.status}</Badge>,
                  item.memo || "-"
                ])}
              />
            ) : <EmptyState title="수강 이력이 없습니다" description="수강 등록 후 이 영역에 이력이 표시됩니다." />}
          </DetailSection>

          <DetailSection title="수업 일정" count={lessons.length}>
            {lessons.length ? (
              <DataTable
                headers={["일시", "과목", "담당", "상태", "메모"]}
                rows={lessons.map((item) => [
                  formatDateTime(item.startsAt),
                  item.subject || courseName(data, item.courseId),
                  item.teacherName || teacherName(data, item.teacherId),
                  <Badge key={item.id}>{item.status || "확인 필요"}</Badge>,
                  item.memo || "-"
                ])}
              />
            ) : <EmptyState title="수업 일정이 없습니다" description="예정 또는 완료 수업이 연결되면 표시됩니다." />}
          </DetailSection>

          <DetailSection title="레슨노트" count={lessonNotes.length}>
            {lessonNotes.length ? <LessonNoteList notes={lessonNotes} role={role} /> : <EmptyState title="레슨노트가 없습니다" description="강사가 수업 내용을 저장하면 여기에 표시됩니다." />}
          </DetailSection>

          <DetailSection title="예약/수납" count={reservations.length + payments.length}>
            <div className="grid gap-4 xl:grid-cols-2">
              <MiniTable
                title="연습실 예약"
                empty="예약 내역이 없습니다."
                rows={reservations.map((item) => [formatDateTime(item.startsAt), item.roomName || item.roomId, item.status])}
              />
              <MiniTable
                title={role === "teacher" ? "수납 정보" : "수납 요약"}
                empty={role === "teacher" ? "강사 권한에서는 수납 정보를 표시하지 않습니다." : "수납 내역이 없습니다."}
                rows={payments.map((item) => [item.title, `${item.amount.toLocaleString("ko-KR")}원`, item.status])}
              />
            </div>
          </DetailSection>
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
      <p className="text-xs font-semibold text-white/60">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-muted/40 p-4">
      <h3 className="text-sm font-extrabold text-ink">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink">{value}</p>
    </div>
  );
}

function GuardianRow({ guardian, role }: { guardian: Guardian; role: Role | null }) {
  const phone = role === "teacher" ? "권한 제한" : guardian.phone;
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="text-sm font-bold text-ink">{guardian.name} <span className="font-medium text-muted">({guardian.relation})</span></p>
      <p className="mt-1 text-xs text-muted">{phone}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {guardian.payer ? <Badge tone="good">납부자</Badge> : null}
        {guardian.emergency ? <Badge tone="warn">비상연락</Badge> : null}
      </div>
    </div>
  );
}

function DetailSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold tracking-tight text-ink">{title}</h3>
        <Badge>{count.toLocaleString("ko-KR")}건</Badge>
      </div>
      {children}
    </section>
  );
}

function LessonNoteList({ notes, role }: { notes: LessonNote[]; role: Role | null }) {
  return (
    <div className="grid gap-3">
      {notes.map((note) => (
        <article className="rounded-2xl border border-line bg-white p-4 shadow-card" key={note.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-ink">{note.date || "날짜 미등록"}</p>
              <p className="mt-1 text-xs text-muted">{note.teacherName || note.teacherId || "담당 미등록"}</p>
            </div>
            <Badge>{note.nextGoal || "다음 목표 확인"}</Badge>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <NoteBlock label="수업 내용" value={note.content} />
            <NoteBlock label="과제" value={note.homework} />
            <NoteBlock label="연습 요청" value={note.practiceRequest} />
            {role === "teacher" ? <NoteBlock label="내부 메모" value={note.internalMemo} /> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-ink">{value || "-"}</p>
    </div>
  );
}

function MiniTable({ title, empty, rows }: { title: string; empty: string; rows: string[][] }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <h4 className="text-sm font-extrabold text-ink">{title}</h4>
      {rows.length ? (
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div className="grid gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm text-muted sm:grid-cols-3" key={row.join("|")}>
              {row.map((cell, index) => <span className={index === 0 ? "font-semibold text-ink" : ""} key={`${cell}-${index}`}>{cell || "-"}</span>)}
            </div>
          ))}
        </div>
      ) : <p className="mt-3 text-sm text-muted">{empty}</p>}
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined
  }).format(date);
}

function maskTeacherMemo(memo: string) {
  return memo ? "해당 수업 운영에 필요한 범위만 표시" : "-";
}
