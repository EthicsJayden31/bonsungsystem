"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { hasVersion3Permission } from "@/lib/access-policy";
import { useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function TasksPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();
  const canManageOperations = hasVersion3Permission(user ?? role, "manageOperations");

  return (
    <AppShell area="tasks">
      <ResourcePage
        title="내부 업무"
        description={source === "server" ? "Version.3 서버의 내부 업무 데이터를 표시합니다." : source === "live" ? "전환 세션의 내 업무 데이터를 표시합니다." : source === "fallback" ? "내부 업무 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "Preview 데이터로 내부 업무 화면을 점검합니다."}
        headers={["업무", "담당자", "마감일", "상태", "우선순위", "메모"]}
        rows={data.tasks.map((task) => [task.title, task.assignee || "-", task.dueDate || "-", <Badge key={task.id}>{task.status || "할일"}</Badge>, task.priority || "보통", task.memo || "-"])}
        emptyTitle="표시할 업무가 없습니다"
        emptyDescription="실사용 세션이 없거나 서버 응답의 업무 데이터가 비어 있으면 이곳이 비어 있을 수 있습니다."
        onSubmit={canManageOperations ? (values) => saveAction.run("createTask", { task: mapTaskInput(values) }) : undefined}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "업무 저장"}
        submitHelp="담당자 ID를 비워두면 현재 로그인 계정의 업무로 저장됩니다."
        showForm={canManageOperations}
        fields={[
          { label: "업무명", name: "title" },
          { label: "담당자 ID", name: "assignee" },
          { label: "마감일", name: "dueDate", type: "date" },
          { label: "상태", name: "status", type: "select", options: ["할일", "진행중", "완료", "보류"] },
          { label: "우선순위", name: "priority", type: "select", options: ["높음", "보통", "낮음"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function mapTaskInput(values: Record<string, string>) {
  return {
    title: values.title,
    assignee_id: values.assignee,
    due_date: values.dueDate,
    status: values.status,
    priority: values.priority,
    memo: values.memo
  };
}
