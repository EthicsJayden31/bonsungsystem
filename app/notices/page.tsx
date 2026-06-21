"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function NoticesPage() {
  const role = usePreviewRole();
  const { data, source, error } = useOperationsData(role);
  const sourceLabel = source === "live" ? "실사용 데이터" : source === "fallback" ? "미리보기 데이터" : "프리뷰 데이터";

  return (
    <AppShell area="notices">
      <ResourcePage
        title="공지/문서"
        description={`내부 공지, 강사 매뉴얼, 환불 기준, 출결 기준 같은 운영 문서를 관리합니다. 현재 표시: ${sourceLabel}${error ? ` · 연결 오류: ${error}` : ""}`}
        headers={["제목", "분류", "작성자", "수정일", "내용"]}
        rows={data.notices.map((notice) => [notice.title, notice.category, notice.author, notice.updatedAt, notice.body])}
        emptyTitle="공지 문서가 없습니다"
        emptyDescription="실사용 데이터에 등록된 공지나 문서가 없으면 이곳에 빈 상태가 표시됩니다."
        fields={[
          { label: "제목", name: "title" },
          { label: "분류", name: "category", type: "select", options: ["공지", "운영규정", "강사매뉴얼", "환불기준", "출결기준"] },
          { label: "내용", name: "body", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
