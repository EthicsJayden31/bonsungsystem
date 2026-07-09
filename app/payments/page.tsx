"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { hasStagePermission } from "@/lib/access-policy";
import { studentName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { useCurrentRole } from "@/lib/use-current-role";

export default function PaymentsPage() {
  const role = useCurrentRole();
  const user = useCurrentUser();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();
  const accessUser = user ?? role;
  const canRegisterPayment = hasStagePermission(accessUser, "viewPayments") && hasStagePermission(accessUser, "manageOperations");

  return (
    <AppShell area="payments">
      <ResourcePage
        title="수납 상태 관리"
        description={source === "server" ? "본성 스테이지 서버의 수납 데이터를 표시합니다." : source === "live" ? "전환 세션의 등록결제 데이터를 표시합니다." : source === "fallback" ? "수납 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "수납 데이터를 확인하고 있습니다."}
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
        emptyDescription="강사 권한이거나 서버 응답에 수납 데이터가 없으면 이곳이 비어 있을 수 있습니다."
        onSubmit={canRegisterPayment ? (values) => saveAction.run("createRegistration", { registration: mapRegistrationInput(values, data) }) : undefined}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "수납 저장"}
        submitHelp="학생은 이름 또는 ID를 입력할 수 있습니다. 강사 권한에서는 수납 메뉴가 노출되지 않습니다."
        showForm={canRegisterPayment}
        fields={[
          { label: "학생명 또는 ID", name: "student" },
          { label: "등록 구분", name: "registrationType", type: "select", options: ["신규등록", "재등록"] },
          { label: "금액", name: "amount", type: "number" },
          { label: "등록 시작일", name: "periodStart", type: "date" },
          { label: "다음 결제 예정일", name: "nextDueDate", type: "date" },
          { label: "입금 상태", name: "status", type: "select", options: ["청구예정", "청구완료", "납부완료", "미납", "환불", "취소"] },
          { label: "결제일 또는 확인일", name: "paidAt", type: "date" },
          { label: "환불/납부 메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function mapRegistrationInput(values: Record<string, string>, data: ReturnType<typeof useOperationsData>["data"]) {
  return {
    student_id: data.students.find((student) => student.id === values.student || student.name === values.student)?.id || values.student,
    registration_type: values.registrationType || "신규등록",
    period_start: values.periodStart,
    next_due_date: values.nextDueDate,
    amount: values.amount,
    paid_at: values.paidAt,
    payment_status: values.status,
    memo: values.memo
  };
}

function paymentTone(status: string) {
  if (["미납", "확인 필요"].includes(status)) return "danger";
  if (["입금완료", "납부완료"].includes(status)) return "good";
  return "warn";
}
