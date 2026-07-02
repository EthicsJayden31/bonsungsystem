"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { hasVersion3Permission } from "@/lib/access-policy";
import type { Notice } from "@/lib/demo-data";
import { useOperationAction, useOperationsData } from "@/lib/operations-data";
import { version3RoleLabels } from "@/lib/version3-server-contract";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function NoticesPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const { data, source, error } = useOperationsData(role);
  const saveAction = useOperationAction();
  const sourceLabel = source === "server" || source === "test" ? "Version.3 서버 데이터" : source === "live" ? "전환 데이터" : source === "fallback" ? "연결 실패" : "프리뷰 데이터";
  const accessUser = user ?? role;
  const accessRole = typeof accessUser === "string" ? accessUser : accessUser?.role;
  const canWriteNotice = (accessRole === "owner" || accessRole === "manager") && hasVersion3Permission(accessUser, "manageNotices");
  const visibleNotices = [...data.notices].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <AppShell area="notices">
      <ResourcePage
        title="공지/문서"
        description={`대표와 매니저가 작성한 공지를 모든 계정이 확인합니다. 현재 표시: ${sourceLabel}${error ? ` · 연결 오류: ${error}` : ""}`}
        headers={["제목", "분류", "대상", "작성자", "수정일", "내용"]}
        rows={visibleNotices.map((notice) => [notice.pinned ? `${notice.title} · 고정` : notice.title, notice.category, noticeTargetLabel(notice), notice.author, notice.updatedAt, notice.body])}
        emptyTitle="공지 문서가 없습니다"
        emptyDescription="실사용 데이터에 등록된 공지나 문서가 없으면 이곳에 빈 상태가 표시됩니다."
        onSubmit={canWriteNotice ? (values) => saveAction.run("createNotice", { notice: values }) : undefined}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "공지 저장"}
        submitHelp="공지 작성 권한은 Version.3 기준 대표와 매니저에게만 부여합니다."
        showForm={canWriteNotice}
        fields={[
          { label: "제목", name: "title" },
          { label: "분류", name: "category", type: "select", options: ["공지", "운영규정", "강사매뉴얼", "환불기준", "출결기준"] },
          { label: "대상", name: "targetRoles", type: "select", options: ["전체", "대표/매니저", "강사", "수강생"] },
          { label: "상단 고정", name: "pinned", type: "select", options: ["아니오", "예"] },
          { label: "내용", name: "body", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function noticeTargetLabel(notice: Notice) {
  if (notice.targetRoles.length === 4) return "전체";
  return notice.targetRoles.map((targetRole) => version3RoleLabels[targetRole as keyof typeof version3RoleLabels]).join(", ");
}
