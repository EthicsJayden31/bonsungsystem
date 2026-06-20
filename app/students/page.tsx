"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { getTeacherName, guardians, students } from "@/lib/demo-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function StudentsPage() {
  const role = usePreviewRole();
  const visible = role === "teacher" ? students.filter((student) => student.teacherId === "teacher-1") : students;
  return (
    <AppShell area="students">
      <ResourcePage
        title="학생 관리"
        description="학생 목록, 상태, 보호자 연결, 등록 메모를 관리합니다."
        headers={["이름", "전공", "상태", "담당", "보호자", "메모"]}
        rows={visible.map((student) => [student.name, student.major, <Badge key={student.id}>{student.status}</Badge>, getTeacherName(student.teacherId), guardians.filter((guardian) => guardian.studentId === student.id).map((guardian) => guardian.name).join(", ") || "-", student.memo])}
        fields={[
          { label: "이름", name: "name" },
          { label: "생년월일", name: "birthDate", type: "date" },
          { label: "연락처", name: "phone" },
          { label: "전공/관심 분야", name: "major" },
          { label: "목표", name: "goal" },
          { label: "상태", name: "status", type: "select", options: ["상담중", "등록대기", "재원", "휴원", "퇴원"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
