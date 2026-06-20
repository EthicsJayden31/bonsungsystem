"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { enrollments, getCourseName, getStudentName, getTeacherName } from "@/lib/demo-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function EnrollmentsPage() {
  const role = usePreviewRole();
  const visible = role === "teacher" ? enrollments.filter((item) => item.teacherId === "teacher-1") : enrollments;
  return (
    <AppShell area="enrollments">
      <ResourcePage
        title="수강 관리"
        description="학생별 수강 등록, 담당 강사, 과목 이력을 확인합니다."
        headers={["학생", "과목", "강사", "시작일", "상태", "메모"]}
        rows={visible.map((item) => [getStudentName(item.studentId), getCourseName(item.courseId), getTeacherName(item.teacherId), item.startDate, <Badge key={item.id}>{item.status}</Badge>, item.memo])}
        fields={[
          { label: "학생", name: "student" },
          { label: "과목/전공", name: "course" },
          { label: "담당 강사", name: "teacher" },
          { label: "시작일", name: "startDate", type: "date" },
          { label: "상태", name: "status", type: "select", options: ["수강중", "등록대기", "휴강", "종료", "취소"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
