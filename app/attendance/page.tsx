import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { attendance, getStudentName } from "@/lib/demo-data";

export default function AttendancePage() {
  return (
    <AppShell area="attendance">
      <ResourcePage
        title="출결 관리"
        description="수업별 출석, 지각, 결석, 취소와 보강 필요 여부를 기록합니다."
        headers={["학생", "출결 상태", "보강 필요", "메모"]}
        rows={attendance.map((item) => [getStudentName(item.studentId), <Badge key={item.id} tone={item.status === "미처리" ? "warn" : "good"}>{item.status}</Badge>, item.makeupNeeded ? "예" : "아니오", item.memo])}
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
