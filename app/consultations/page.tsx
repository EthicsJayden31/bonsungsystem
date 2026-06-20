import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { consultations } from "@/lib/demo-data";

export default function ConsultationsPage() {
  return (
    <AppShell area="consultations">
      <ResourcePage
        title="상담 관리"
        description="문의 접수부터 후속 연락, 등록 전환까지 상담 상태를 관리합니다."
        headers={["학생", "보호자", "연락처", "경로", "상태", "후속 연락", "우선순위"]}
        rows={consultations.map((item) => [item.studentName, item.guardianName, item.phone, item.channel, <Badge key={item.id}>{item.status}</Badge>, item.followUpDate, item.priority])}
        fields={[
          { label: "학생명 또는 연결 학생", name: "studentName" },
          { label: "보호자명", name: "guardianName" },
          { label: "연락처", name: "phone" },
          { label: "문의 경로", name: "channel" },
          { label: "관심 전공", name: "major" },
          { label: "상태", name: "status", type: "select", options: ["신규문의", "상담예정", "상담완료", "등록전환", "보류", "미등록"] },
          { label: "후속 연락일", name: "followUpDate", type: "date" },
          { label: "상담 메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
