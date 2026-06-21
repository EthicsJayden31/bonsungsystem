"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { teacherName, useOperationAction, useOperationsData, type DataSource } from "@/lib/operations-data";
import { guardians } from "@/lib/demo-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function StudentsPage() {
  const role = usePreviewRole();
  const operations = useOperationsData(role);
  const saveAction = useOperationAction();
  const data = operations.data;

  return (
    <AppShell area="students">
      <ResourcePage
        title="학생 관리"
        description="학생 목록, 상태, 보호자 연결, 등록 메모를 관리합니다."
        sourceNote={<SourceNote source={operations.source} error={operations.error} />}
        headers={["이름", "전공", "상태", "담당", "보호자", "메모"]}
        rows={data.students.map((student) => [
          student.name,
          student.major,
          <Badge key={student.id}>{student.status}</Badge>,
          student.teacherName || teacherName(data, student.teacherId),
          guardians.filter((guardian) => guardian.studentId === student.id).map((guardian) => guardian.name).join(", ") || (role === "teacher" ? "권한 제한" : "-"),
          role === "teacher" ? maskTeacherMemo(student.memo) : student.memo
        ])}
        emptyTitle="학생 기록이 없습니다"
        emptyDescription="실사용 데이터에 학생 기록이 없으면 이곳에 빈 상태가 표시됩니다."
        onSubmit={(values) => saveAction.run("createStudent", { student: mapStudentInput(values) })}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "학생 저장"}
        submitHelp="Apps Script 로그인 세션이 있으면 수강생 시트에 저장됩니다. preview 모드에서는 저장되지 않고 안내 메시지를 표시합니다."
        fields={[
          { label: "이름", name: "name" },
          { label: "생년월일", name: "birthDate", type: "date" },
          { label: "연락처", name: "phone" },
          { label: "전공/관심 분야", name: "major" },
          { label: "목표", name: "goal" },
          { label: "상태", name: "status", type: "select", options: ["상담중", "등록대기", "재원", "휴원", "퇴원"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function SourceNote({ source, error }: { source: DataSource; error?: string }) {
  const text = source === "live" ? "Apps Script bootstrap의 실사용 데이터를 표시합니다." : "실사용 세션이 없거나 연결에 실패해 Next preview 데이터를 표시합니다.";
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ink">{text}</p>
        <Badge tone={source === "live" ? "good" : source === "fallback" ? "warn" : "default"}>{source === "live" ? "실사용 데이터" : "Preview"}</Badge>
      </div>
      {error ? <p className="mt-2 text-xs text-muted">연결 오류: {error}</p> : null}
    </div>
  );
}


function mapStudentInput(values: Record<string, string>) {
  return {
    name: values.name,
    birth_date: values.birthDate,
    phone: values.phone,
    major: values.major,
    goal: values.goal,
    status: values.status,
    memo: values.memo
  };
}

function maskTeacherMemo(memo: string) {
  return memo ? "담당 수업에 필요한 범위만 표시" : "-";
}
