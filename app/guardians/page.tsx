import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { getStudentName, guardians } from "@/lib/demo-data";

export default function GuardiansPage() {
  return (
    <AppShell area="guardians">
      <ResourcePage
        title="보호자 관리"
        description="학생과 보호자를 연결하고 결제자, 비상연락 여부를 확인합니다."
        headers={["학생", "보호자", "관계", "연락처", "결제자", "비상연락", "메모"]}
        rows={guardians.map((guardian) => [getStudentName(guardian.studentId), guardian.name, guardian.relation, guardian.phone, guardian.payer ? <Badge key="payer" tone="good">예</Badge> : "아니오", guardian.emergency ? <Badge key="emergency" tone="warn">예</Badge> : "아니오", guardian.memo])}
        fields={[
          { label: "학생", name: "student" },
          { label: "보호자 이름", name: "name" },
          { label: "관계", name: "relation" },
          { label: "연락처", name: "phone" },
          { label: "결제자 여부", name: "payer", type: "select", options: ["예", "아니오"] },
          { label: "비상연락 여부", name: "emergency", type: "select", options: ["예", "아니오"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
