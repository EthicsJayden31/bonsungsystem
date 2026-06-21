"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { useOperationAction, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function ConsultationsPage() {
  const role = usePreviewRole();
  const { data, source, error } = useOperationsData(role);
  const saveAction = useOperationAction();
  const sourceLabel = source === "live" ? "실사용 데이터" : source === "fallback" ? "미리보기 데이터" : "프리뷰 데이터";

  return (
    <AppShell area="consultations">
      <ResourcePage
        title="상담 관리"
        description={`문의 접수부터 후속 연락, 등록 전환까지 상담 상태를 관리합니다. 현재 표시: ${sourceLabel}${error ? ` · 연결 오류: ${error}` : ""}`}
        headers={["학생", "보호자", "연락처", "경로", "상태", "후속 연락", "우선순위"]}
        rows={data.consultations.map((item) => [item.studentName, item.guardianName, item.phone, item.channel, <Badge key={item.id}>{item.status}</Badge>, item.followUpDate, item.priority])}
        emptyTitle="상담 기록이 없습니다"
        emptyDescription="실사용 데이터에 상담 기록이 없으면 이곳에 빈 상태가 표시됩니다."
        onSubmit={(values) => saveAction.run("createConsultation", { consultation: values })}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "상담 저장"}
        submitHelp="Apps Script 로그인 세션이 있으면 상담 시트에 저장됩니다. preview 모드에서는 저장되지 않고 안내 메시지를 표시합니다."
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
