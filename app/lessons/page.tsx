"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { courseName, studentName, teacherName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function LessonsPage() {
  const role = usePreviewRole();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();

  return (
    <AppShell area="lessons">
      <ResourcePage
        title="수업/시간표"
        description={source === "live" ? "Apps Script bootstrap의 수업 데이터를 표시합니다." : "Preview 데이터로 수업 일정 화면을 점검합니다."}
        headers={["일시", "학생", "강사", "과목", "시간", "상태", "메모"]}
        rows={data.lessons.map((lesson) => [
          formatLessonTime(lesson.startsAt),
          lesson.studentName || studentName(data, lesson.studentId),
          lesson.teacherName || teacherName(data, lesson.teacherId),
          lesson.subject || courseName(data, lesson.courseId),
          String(lesson.duration || 0) + "분",
          <Badge key={lesson.id}>{lesson.status || "확인 필요"}</Badge>,
          lesson.memo || "-"
        ])}
        emptyTitle="표시할 수업 일정이 없습니다"
        emptyDescription="실사용 세션이 없거나 Apps Script 응답에 수업 데이터가 없으면 이곳이 비어 있을 수 있습니다."
        onSubmit={(values) => saveAction.run("createLesson", { lesson: mapLessonInput(values, data) })}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "수업 저장"}
        submitHelp="학생은 이름 또는 ID, 강사는 Apps Script 계정 ID를 입력합니다. 수업일과 시작 시간이 있어야 실사용 저장이 가능합니다."
        fields={[
          { label: "학생명 또는 ID", name: "student" },
          { label: "강사 계정 ID", name: "teacher" },
          { label: "과목/전공", name: "course" },
          { label: "수업일", name: "date", type: "date" },
          { label: "시작 시간(HH:MM)", name: "startTime" },
          { label: "수업 시간(분)", name: "duration", type: "number" },
          { label: "상태", name: "status", type: "select", options: ["예정", "완료", "결석", "보강예정", "취소"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function mapLessonInput(values: Record<string, string>, data: ReturnType<typeof useOperationsData>["data"]) {
  return {
    student_id: findStudentId(data, values.student),
    teacher_id: findTeacherId(data, values.teacher),
    subject: values.course,
    lesson_date: values.date,
    start_time: values.startTime,
    duration_minutes: values.duration,
    status: values.status,
    memo: values.memo
  };
}

function findStudentId(data: ReturnType<typeof useOperationsData>["data"], value: string) {
  return data.students.find((student) => student.id === value || student.name === value)?.id || value;
}

function findTeacherId(data: ReturnType<typeof useOperationsData>["data"], value: string) {
  return data.teachers.find((teacher) => teacher.id === value || teacher.name === value)?.id || value;
}

function formatLessonTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR");
}
