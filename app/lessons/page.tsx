"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { hasVersion3Permission } from "@/lib/access-policy";
import { courseName, studentName, teacherName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function LessonsPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();
  const canManageOperations = hasVersion3Permission(user ?? role, "manageOperations");

  return (
    <AppShell area="lessons">
      <ResourcePage
        title="수업/시간표"
        description={source === "server" || source === "test" ? "Version.3 서버의 수업 데이터를 표시합니다." : source === "live" ? "전환 세션의 수업 데이터를 표시합니다." : source === "fallback" ? "수업 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "Preview 데이터로 수업 일정 화면을 점검합니다."}
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
        emptyDescription="실사용 세션이 없거나 서버 응답에 수업 데이터가 없으면 이곳이 비어 있을 수 있습니다."
        onSubmit={canManageOperations ? (values) => saveAction.run("createLesson", { lesson: mapLessonInput(values, data) }) : undefined}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "수업 저장"}
        submitHelp="학생과 강사는 이름 또는 ID로 입력할 수 있습니다. Version.3 서버 세션에서는 수업과 미처리 출결 기록이 함께 생성됩니다."
        showForm={canManageOperations}
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
