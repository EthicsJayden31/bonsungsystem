"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { courseName, studentName, teacherName, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function LessonsPage() {
  const role = usePreviewRole();
  const { data, source } = useOperationsData(role);

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
        fields={[
          { label: "학생", name: "student" },
          { label: "강사", name: "teacher" },
          { label: "과목/전공", name: "course" },
          { label: "수업일", name: "date", type: "date" },
          { label: "수업 시간(분)", name: "duration", type: "number" },
          { label: "상태", name: "status", type: "select", options: ["예정", "완료", "결석", "보강예정", "취소"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function formatLessonTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR");
}
