"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { studentName, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function AttendancePage() {
  const role = usePreviewRole();
  const { data, source } = useOperationsData(role);

  return (
    <AppShell area="attendance">
      <ResourcePage
        title="출결 관리"
        description={source === "live" ? "Apps Script bootstrap의 수업/레슨노트 데이터에서 출결 상태를 계산해 표시합니다." : "Preview 데이터로 출결 화면을 점검합니다."}
        headers={["학생", "출결 상태", "보강 필요", "메모"]}
        rows={data.attendance.map((item) => [
          studentName(data, item.studentId),
          <Badge key={item.id} tone={item.status === "미처리" ? "warn" : item.status === "결석" || item.status === "취소" ? "danger" : "good"}>{item.status}</Badge>,
          item.makeupNeeded ? "예" : "아니오",
          item.memo || "-"
        ])}
        emptyTitle="표시할 출결 정보가 없습니다"
        emptyDescription="실사용 세션이 없거나 Apps Script 응답의 수업 데이터가 비어 있으면 이곳이 비어 있을 수 있습니다."
        fields={[
          { label: "수업", name: "lesson" },
          { label: "학생", name: "student" },
          { label: "출결 상태", name: "status", type: "select", options: ["출석", "지각", "결석", "취소"] },
          { label: "보강 필요 여부", name: "makeupNeeded", type: "select", options: ["예", "아니오"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
