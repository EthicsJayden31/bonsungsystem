"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { courseName, studentName, teacherName, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function EnrollmentsPage() {
  const role = usePreviewRole();
  const { data, source } = useOperationsData(role);

  return (
    <AppShell area="enrollments">
      <ResourcePage
        title="수강 관리"
        description={source === "live" ? "Apps Script bootstrap의 수강 데이터를 표시합니다." : "Preview 데이터로 수강 화면과 권한 흐름을 점검합니다."}
        headers={["학생", "과목", "강사", "시작일", "상태", "메모"]}
        rows={data.enrollments.map((item) => [
          item.studentName || studentName(data, item.studentId),
          courseName(data, item.courseId),
          item.teacherName || teacherName(data, item.teacherId),
          item.startDate || "-",
          <Badge key={item.id}>{item.status || "확인 필요"}</Badge>,
          item.memo || "-"
        ])}
        emptyTitle="표시할 수강 정보가 없습니다"
        emptyDescription="실사용 세션이 없거나 Apps Script 응답에 수강 데이터가 없으면 이곳이 비어 있을 수 있습니다."
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
