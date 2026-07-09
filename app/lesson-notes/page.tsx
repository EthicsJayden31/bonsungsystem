"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { hasVersion3Permission } from "@/lib/access-policy";
import { studentName, teacherName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { useCurrentRole } from "@/lib/use-current-role";

export default function LessonNotesPage() {
  const role = useCurrentRole();
  const user = useCurrentUser();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();
  const canWriteLessonLogs = hasVersion3Permission(user ?? role, "writeLessonLogs");

  return (
    <AppShell area="lesson-notes">
      <ResourcePage
        title="레슨노트"
        description={source === "server" ? "Version.3 서버의 레슨노트 데이터를 표시합니다." : source === "live" ? "전환 세션의 최근 레슨노트 데이터를 표시합니다." : source === "fallback" ? "레슨노트 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "레슨노트 데이터를 확인하고 있습니다."}
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
        emptyDescription="실사용 세션이 없거나 서버 응답의 레슨노트가 비어 있으면 이곳이 비어 있을 수 있습니다."
        onSubmit={canWriteLessonLogs ? (values) => saveAction.run("createLessonLog", { log: mapLessonLogInput(values, data) }) : undefined}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "레슨노트 저장"}
        submitHelp="학생과 강사는 이름 또는 ID로 입력할 수 있습니다. 강사 계정은 담당 학생의 레슨노트만 저장할 수 있습니다."
        showForm={canWriteLessonLogs}
        fields={[
          { label: "수업일", name: "date", type: "date" },
          { label: "학생명 또는 ID", name: "student" },
          { label: "강사 계정 ID", name: "teacher" },
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
