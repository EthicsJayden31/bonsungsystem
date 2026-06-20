"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { getStudentName, getTeacherName, lessonNotes } from "@/lib/demo-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function LessonNotesPage() {
  const role = usePreviewRole();
  const visible = role === "teacher" ? lessonNotes.filter((note) => note.teacherId === "teacher-1") : lessonNotes;
  return (
    <AppShell area="lesson-notes">
      <ResourcePage
        title="레슨노트"
        description="수업 내용, 과제, 다음 목표, 내부 메모를 수업별로 기록합니다."
        headers={["수업일", "학생", "강사", "수업 내용", "과제", "다음 목표"]}
        rows={visible.map((note) => [note.date, getStudentName(note.studentId), getTeacherName(note.teacherId), note.content, note.homework, note.nextGoal])}
        fields={[
          { label: "수업일", name: "date", type: "date" },
          { label: "학생", name: "student" },
          { label: "강사", name: "teacher" },
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
