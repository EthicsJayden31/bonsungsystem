"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage, type MobileListCard } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { hasVersion3Permission } from "@/lib/access-policy";
import { courseName, studentName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { useCurrentRole } from "@/lib/use-current-role";

export default function TeachersPage() {
  const role = useCurrentRole();
  const user = useCurrentUser();
  const { data, source, error } = useOperationsData(role);
  const saveAction = useOperationAction();
  const canManageOperations = hasVersion3Permission(user ?? role, "manageOperations");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedTeacherId(params.get("teacher") ?? "");
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const selectedTeacher = useMemo(
    () => data.teachers.find((teacher) => teacher.id === selectedTeacherId),
    [data.teachers, selectedTeacherId]
  );

  useEffect(() => {
    if (!selectedTeacher) return;
    window.requestAnimationFrame(() => {
      document.getElementById("teacher-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedTeacher]);

  function openTeacherDetail(teacherId: string) {
    setSelectedTeacherId(teacherId);
    const url = new URL(window.location.href);
    url.searchParams.set("teacher", teacherId);
    url.hash = "teacher-detail";
    window.history.pushState({}, "", url);
  }

  function closeTeacherDetail() {
    setSelectedTeacherId("");
    const url = new URL(window.location.href);
    url.searchParams.delete("teacher");
    url.hash = "";
    window.history.pushState({}, "", url);
  }

  const statsByTeacher = useMemo(() => {
    return data.teachers.map((teacher) => {
      const teacherStudents = data.students.filter((student) => student.teacherId === teacher.id || student.teacherName === teacher.name);
      const teacherEnrollments = data.enrollments.filter((item) => item.teacherId === teacher.id || item.teacherName === teacher.name);
      const teacherLessons = data.lessons.filter((lesson) => lesson.teacherId === teacher.id || lesson.teacherName === teacher.name);
      const teacherNotes = data.lessonNotes.filter((note) => note.teacherId === teacher.id || note.teacherName === teacher.name);
      return {
        teacher,
        students: teacherStudents,
        enrollments: teacherEnrollments,
        lessons: teacherLessons,
        notes: teacherNotes
      };
    });
  }, [data]);

  const mobileCards: MobileListCard[] = statsByTeacher.map((item) => ({
    id: item.teacher.id,
    title: (
      <button className="text-left text-base font-extrabold text-brand" type="button" onClick={() => openTeacherDetail(item.teacher.id)}>
        {item.teacher.name}
      </button>
    ),
    subtitle: item.teacher.major || "전공 미등록",
    status: <Badge tone={item.lessons.length ? "good" : "default"}>{item.lessons.length}수업</Badge>,
    meta: [
      <span key="students">담당 학생: {item.students.length}명</span>,
      <span key="enrollments">수강 이력: {item.enrollments.length}건</span>,
      <span key="notes">최근 레슨노트: {item.notes.length}건</span>
    ],
    action: (
      <button
        className="w-full rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-sm font-bold text-brand transition hover:bg-brand/10"
        type="button"
        onClick={() => openTeacherDetail(item.teacher.id)}
      >
        강사별 보기
      </button>
    )
  }));

  return (
    <AppShell area="teachers">
      <div className="space-y-5">
        {selectedTeacher ? (
          <TeacherDetailPanel
            data={data}
            teacherId={selectedTeacher.id}
            onClose={closeTeacherDetail}
          />
        ) : null}

        <ResourcePage
          title="강사별 조회"
          description="강사별 담당 학생, 수강 이력, 수업 일정, 레슨노트를 한 화면에서 확인합니다. 모바일에서는 강사 카드에서 하나씩 들어갑니다."
          sourceNote={<SourceNote source={source} error={error} />}
          headers={["강사", "전공", "담당 학생", "수강", "수업", "레슨노트", "상세"]}
          mobileCards={mobileCards}
          rows={statsByTeacher.map((item) => [
            <button
              className="text-left font-bold text-brand underline-offset-4 hover:underline"
              key={`${item.teacher.id}-name`}
              type="button"
              onClick={() => openTeacherDetail(item.teacher.id)}
            >
              {item.teacher.name}
            </button>,
            item.teacher.major || "-",
            `${item.students.length}명`,
            `${item.enrollments.length}건`,
            `${item.lessons.length}건`,
            `${item.notes.length}건`,
            <button
              className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-brand/10"
              key={`${item.teacher.id}-detail`}
              type="button"
              onClick={() => openTeacherDetail(item.teacher.id)}
            >
              강사별 보기
            </button>
          ])}
          emptyTitle="강사 기록이 없습니다"
          emptyDescription="운영 데이터에 강사 기록이 없으면 이 상태가 표시됩니다."
          onSubmit={canManageOperations ? (values) => saveAction.run("createTeacher", { teacher: values }) : undefined}
          submitDisabled={saveAction.pending}
          submitLabel={saveAction.pending ? "저장 중" : "강사 저장"}
          submitHelp="Version.3 서버 세션에서는 강사 기록이 별도 서버에 저장됩니다. 강사 계정 생성과 권한 부여는 계정 관리에서 이어서 처리합니다."
          showForm={canManageOperations}
          fields={[
            { label: "강사명", name: "name" },
            { label: "전공/담당 분야", name: "major" },
            { label: "메모", name: "memo", type: "textarea" }
          ]}
        />
      </div>
    </AppShell>
  );
}

function SourceNote({ source, error }: { source: string; error?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ink">
          {source === "server" ? "Version.3 서버의 강사 데이터를 표시합니다." : source === "live" ? "전환 세션의 강사 데이터를 표시합니다." : source === "fallback" ? "강사 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "강사 데이터를 확인하고 있습니다."}
        </p>
        <Badge tone={source === "server" || source === "live" ? "good" : source === "fallback" ? "warn" : "default"}>
          {source === "server" ? "서버 데이터" : source === "live" ? "전환 데이터" : source === "fallback" ? "연결 실패" : "확인 중"}
        </Badge>
      </div>
      {error ? <p className="mt-2 text-xs text-muted">연결 오류: {error}</p> : null}
    </div>
  );
}

function TeacherDetailPanel({
  data,
  teacherId,
  onClose
}: {
  data: ReturnType<typeof useOperationsData>["data"];
  teacherId: string;
  onClose: () => void;
}) {
  const teacher = data.teachers.find((item) => item.id === teacherId);
  if (!teacher) return null;

  const students = data.students.filter((student) => student.teacherId === teacher.id || student.teacherName === teacher.name);
  const enrollments = data.enrollments.filter((item) => item.teacherId === teacher.id || item.teacherName === teacher.name);
  const lessons = data.lessons.filter((lesson) => lesson.teacherId === teacher.id || lesson.teacherName === teacher.name);
  const notes = data.lessonNotes.filter((note) => note.teacherId === teacher.id || note.teacherName === teacher.name);

  return (
    <section className="scroll-mt-24 overflow-hidden rounded-[24px] border border-brand/15 bg-white shadow-card" id="teacher-detail" aria-label={`${teacher.name} 강사별 상세`}>
      <header className="flex flex-col gap-4 border-b border-line bg-brand/5 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">Teacher Detail</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{teacher.name}</h2>
          <p className="mt-1 text-sm text-muted">{teacher.major || "전공 미등록"}</p>
        </div>
        <button className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-muted hover:text-brand" onClick={onClose} type="button">
          닫기
        </button>
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="담당 학생" value={`${students.length}명`} />
        <SummaryCard label="수강 이력" value={`${enrollments.length}건`} />
        <SummaryCard label="수업 일정" value={`${lessons.length}건`} />
        <SummaryCard label="레슨노트" value={`${notes.length}건`} />
      </div>
      <div className="grid gap-5 p-5 pt-0 xl:grid-cols-2">
        <DetailSection title="담당 학생">
          {students.length ? (
            <DataTable
              headers={["학생", "전공", "상태", "목표"]}
              rows={students.map((student) => [student.name, student.major || "-", <Badge key={student.id}>{student.status}</Badge>, student.goal || "-"])}
            />
          ) : (
            <EmptyLine>담당 학생이 없습니다.</EmptyLine>
          )}
        </DetailSection>
        <DetailSection title="수업 일정">
          {lessons.length ? (
            <DataTable
              headers={["일시", "학생", "과목", "상태"]}
              rows={lessons.map((lesson) => [formatDateTime(lesson.startsAt), lesson.studentName || studentName(data, lesson.studentId), lesson.subject || courseName(data, lesson.courseId), <Badge key={lesson.id}>{lesson.status}</Badge>])}
            />
          ) : (
            <EmptyLine>수업 일정이 없습니다.</EmptyLine>
          )}
        </DetailSection>
        <DetailSection title="최근 레슨노트">
          {notes.length ? (
            <DataTable
              headers={["수업일", "학생", "내용", "다음 목표"]}
              rows={notes.map((note) => [note.date || "-", note.studentName || studentName(data, note.studentId), note.content || "-", note.nextGoal || "-"])}
            />
          ) : (
            <EmptyLine>레슨노트가 없습니다.</EmptyLine>
          )}
        </DetailSection>
        <DetailSection title="수강 이력">
          {enrollments.length ? (
            <DataTable
              headers={["학생", "과목", "시작일", "상태"]}
              rows={enrollments.map((item) => [item.studentName || studentName(data, item.studentId), courseName(data, item.courseId), item.startDate || "-", <Badge key={item.id}>{item.status}</Badge>])}
            />
          ) : (
            <EmptyLine>수강 이력이 없습니다.</EmptyLine>
          )}
        </DetailSection>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-3">
      <h3 className="text-base font-extrabold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line bg-surface-muted px-4 py-5 text-sm text-muted">{children}</p>;
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR");
}
