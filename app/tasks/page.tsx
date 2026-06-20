import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { tasks } from "@/lib/demo-data";

export default function TasksPage() {
  return (
    <AppShell area="tasks">
      <ResourcePage
        title="내부 업무"
        description="운영 업무의 담당자, 마감일, 상태, 우선순위를 관리합니다."
        headers={["업무", "담당자", "마감일", "상태", "우선순위", "메모"]}
        rows={tasks.map((task) => [task.title, task.assignee, task.dueDate, <Badge key={task.id}>{task.status}</Badge>, task.priority, task.memo])}
        fields={[
          { label: "업무명", name: "title" },
          { label: "담당자", name: "assignee" },
          { label: "마감일", name: "dueDate", type: "date" },
          { label: "상태", name: "status", type: "select", options: ["할일", "진행중", "완료", "보류"] },
          { label: "우선순위", name: "priority", type: "select", options: ["높음", "보통", "낮음"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
