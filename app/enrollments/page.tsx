"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { hasStagePermission } from "@/lib/access-policy";
import { courseName, studentName, teacherName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { useCurrentRole } from "@/lib/use-current-role";

export default function EnrollmentsPage() {
  const role = useCurrentRole();
  const user = useCurrentUser();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();
  const canManageOperations = hasStagePermission(user ?? role, "manageOperations");

  return (
    <AppShell area="enrollments">
      <ResourcePage
        title="수강 관리"
        description={source === "server" ? "본성 스테이지 서버의 수강 데이터를 표시합니다." : source === "live" ? "전환 세션의 수강 데이터를 표시합니다." : source === "fallback" ? "수강 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "수강 데이터를 확인하고 있습니다."}
        headers={["학생", "과목", "강사", "시작일", "상태", "메모"]}
        rows={data.enrollments.map((item) => [
          item.studentName || studentName(data, item.studentId),
          courseName(data, item.courseId),
          item.teacherName || teacherName(data, item.teacherId),
          item.startDate || "-",
          <Badge key={item.id}>{item.status || "확인 필요"}</Badge>,
          item.memo || "-"
        ])}
        emptyTitle="표시할 수강 정보가 없습니다"
        emptyDescription="실사용 세션이 없거나 서버 응답에 수강 데이터가 없으면 이곳이 비어 있을 수 있습니다."
        onSubmit={canManageOperations ? (values) => saveAction.run("createEnrollment", { enrollment: mapEnrollmentInput(values, data) }) : undefined}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "수강 저장"}
        submitHelp="학생과 강사는 이름 또는 ID로 입력할 수 있습니다. 본성 스테이지 서버 세션에서는 수강 기록이 별도 서버에 저장됩니다."
        showForm={canManageOperations}
        fields={[
          { label: "학생명 또는 ID", name: "student" },
          { label: "과목/전공", name: "course" },
          { label: "담당 강사 계정 ID", name: "teacher" },
          { label: "시작일", name: "startDate", type: "date" },
          { label: "상태", name: "status", type: "select", options: ["active", "paused", "completed", "canceled"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function mapEnrollmentInput(values: Record<string, string>, data: ReturnType<typeof useOperationsData>["data"]) {
  return {
    student_id: findStudentId(data, values.student),
    teacher_id: findTeacherId(data, values.teacher),
    subject: values.course,
    start_date: values.startDate,
    status: values.status,
    memo: values.memo
  };
}

function findStudentId(data: ReturnType<typeof useOperationsData>["data"], value: string) {
  return data.students.find((student) => student.id === value || student.name === value)?.id || value;
}

function findTeacherId(data: ReturnType<typeof useOperationsData>["data"], value: string) {
  return data.teachers.find((teacher) => teacher.id === value || teacher.name === value)?.id || value;
}
