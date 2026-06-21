"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { studentName, teacherName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function LessonNotesPage() {
  const role = usePreviewRole();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();

  return (
    <AppShell area="lesson-notes">
      <ResourcePage
        title="레슨노트"
        description={source === "live" ? "Apps Script bootstrap의 최근 레슨노트 데이터를 표시합니다." : "Preview 데이터로 레슨노트 화면을 점검합니다."}
        headers={["수업일", "학생", "강사", "수업 내용", "과제", "다음 목표"]}
        rows={data.lessonNotes.map((note) => [
          note.date || "-",
          note.studentName || studentName(data, note.studentId),
          note.teacherName || teacherName(data, note.teacherId),
          note.content || "-",
          note.homework || "-",
          note.nextGoal || "-"
        ])}
        emptyTitle="최근 레슨노트가 없습니다"
        emptyDescription="실사용 세션이 없거나 Apps Script 응답의 recentLogs가 비어 있으면 이곳이 비어 있을 수 있습니다."
        onSubmit={(values) => saveAction.run("createLessonLog", { log: mapLessonLogInput(values, data) })}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "레슨노트 저장"}
        submitHelp="학생은 이름 또는 ID를 입력할 수 있습니다. 강사 계정은 담당 학생만 저장할 수 있습니다."
        fields={[
          { label: "수업일", name: "date", type: "date" },
          { label: "학생명 또는 ID", name: "student" },
          { label: "강사명 또는 ID", name: "teacher" },
          { label: "수업 내용", name: "content", type: "textarea" },
          { label: "과제", name: "homework", type: "textarea" },
          { label: "다음 수업 목표", name: "nextGoal", type: "textarea" },
          { label: "연습 요청", name: "practiceRequest", type: "textarea" },
          { label: "내부 메모", name: "internalMemo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function mapLessonLogInput(values: Record<string, string>, data: ReturnType<typeof useOperationsData>["data"]) {
  return {
    lesson_date: values.date,
    student_id: findStudentId(data, values.student),
    teacher_id: findTeacherId(data, values.teacher),
    lesson_content: values.content,
    homework: values.homework,
    next_goal: values.nextGoal,
    practice_request: values.practiceRequest,
    internal_memo: values.internalMemo
  };
}

function findStudentId(data: ReturnType<typeof useOperationsData>["data"], value: string) {
  return data.students.find((student) => student.id === value || student.name === value)?.id || value;
}

function findTeacherId(data: ReturnType<typeof useOperationsData>["data"], value: string) {
  return data.teachers.find((teacher) => teacher.id === value || teacher.name === value)?.id || value;
}
