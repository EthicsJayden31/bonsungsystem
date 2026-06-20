"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { getCourseName, getStudentName, getTeacherName, lessons } from "@/lib/demo-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function LessonsPage() {
  const role = usePreviewRole();
  const visible = role === "teacher" ? lessons.filter((lesson) => lesson.teacherId === "teacher-1") : lessons;
  return (
    <AppShell area="lessons">
      <ResourcePage
        title="수업/시간표"
        description="학생, 강사, 과목 기준으로 실제 수업 일정을 관리합니다."
        headers={["일시", "학생", "강사", "과목", "시간", "상태", "메모"]}
        rows={visible.map((lesson) => [new Date(lesson.startsAt).toLocaleString("ko-KR"), getStudentName(lesson.studentId), getTeacherName(lesson.teacherId), getCourseName(lesson.courseId), `${lesson.duration}분`, <Badge key={lesson.id}>{lesson.status}</Badge>, lesson.memo])}
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
