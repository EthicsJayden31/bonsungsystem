"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { studentName, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function PaymentsPage() {
  const role = usePreviewRole();
  const { data, source } = useOperationsData(role);

  return (
    <AppShell area="payments">
      <ResourcePage
        title="수납 상태 관리"
        description={source === "live" ? "Apps Script bootstrap의 등록결제 데이터를 표시합니다." : "Preview 데이터로 수납 상태 화면을 점검합니다."}
        headers={["학생", "항목", "금액", "상태", "납부기한", "확인일", "메모"]}
        rows={data.payments.map((item) => [
          item.studentName || studentName(data, item.studentId),
          item.title || "등록·결제",
          item.amount.toLocaleString("ko-KR") + "원",
          <Badge key={item.id} tone={paymentTone(item.status)}>{item.status || "확인 필요"}</Badge>,
          item.dueDate || "-",
          item.paidAt || "-",
          item.memo || "-"
        ])}
        emptyTitle="표시할 수납 정보가 없습니다"
        emptyDescription="teacher 권한이거나 Apps Script 응답에 등록결제 데이터가 없으면 이곳이 비어 있을 수 있습니다."
        fields={[
          { label: "학생", name: "student" },
          { label: "청구/납부 항목", name: "title" },
          { label: "금액", name: "amount", type: "number" },
          { label: "입금 상태", name: "status", type: "select", options: ["청구예정", "청구완료", "입금완료", "납부완료", "미납", "환불", "취소"] },
          { label: "결제일 또는 확인일", name: "paidAt", type: "date" },
          { label: "환불/납부 메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function paymentTone(status: string) {
  if (["미납", "확인 필요"].includes(status)) return "danger";
  if (["입금완료", "납부완료"].includes(status)) return "good";
  return "warn";
}
