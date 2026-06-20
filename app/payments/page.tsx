import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { getStudentName, payments } from "@/lib/demo-data";

export default function PaymentsPage() {
  return (
    <AppShell area="payments">
      <ResourcePage
        title="납부 상태 관리"
        description="실제 결제 연동 없이 학생별 청구, 입금, 미납, 환불 상태와 메모를 관리합니다."
        headers={["학생", "항목", "금액", "상태", "납부기한", "확인일", "메모"]}
        rows={payments.map((item) => [getStudentName(item.studentId), item.title, `${item.amount.toLocaleString("ko-KR")}원`, <Badge key={item.id} tone={item.status === "미납" ? "danger" : "warn"}>{item.status}</Badge>, item.dueDate, item.paidAt || "-", item.memo])}
        fields={[
          { label: "학생", name: "student" },
          { label: "청구/납부 항목", name: "title" },
          { label: "금액", name: "amount", type: "number" },
          { label: "입금 상태", name: "status", type: "select", options: ["청구예정", "청구완료", "입금완료", "미납", "환불", "취소"] },
          { label: "결제일 또는 확인일", name: "paidAt", type: "date" },
          { label: "환불/납부 메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
