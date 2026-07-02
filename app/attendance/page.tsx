"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { hasVersion3Permission } from "@/lib/access-policy";
import { studentName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function AttendancePage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();
  const canWriteAttendance = hasVersion3Permission(user ?? role, "writeLessonLogs") || hasVersion3Permission(user ?? role, "manageOperations");

  return (
    <AppShell area="attendance">
      <ResourcePage
        title="출결 관리"
        description={source === "server" || source === "test" ? "Version.3 서버의 출결 데이터를 표시합니다." : source === "live" ? "전환 세션의 수업/레슨노트 데이터에서 출결 상태를 계산해 표시합니다." : source === "fallback" ? "출결 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "Preview 데이터로 출결 화면을 점검합니다."}
        headers={["학생", "출결 상태", "보강 필요", "메모"]}
        rows={data.attendance.map((item) => [
          studentName(data, item.studentId),
          <Badge key={item.id} tone={item.status === "미처리" ? "warn" : item.status === "결석" || item.status === "취소" ? "danger" : "good"}>{item.status}</Badge>,
          item.makeupNeeded ? "예" : "아니오",
          item.memo || "-"
        ])}
        emptyTitle="표시할 출결 정보가 없습니다"
        emptyDescription="실사용 세션이 없거나 서버 응답의 수업 데이터가 비어 있으면 이곳이 비어 있을 수 있습니다."
        onSubmit={canWriteAttendance ? (values) => saveAction.run("updateAttendance", { attendance: mapAttendanceInput(values, data) }) : undefined}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "출결 저장"}
        submitHelp="수업 또는 학생은 이름/ID로 입력할 수 있습니다. 강사는 담당 수업의 출결만 저장할 수 있습니다."
        showForm={canWriteAttendance}
        fields={[
          { label: "수업", name: "lesson" },
          { label: "학생", name: "student" },
          { label: "출결 상태", name: "status", type: "select", options: ["출석", "지각", "결석", "취소"] },
          { label: "보강 필요 여부", name: "makeupNeeded", type: "select", options: ["예", "아니오"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function mapAttendanceInput(values: Record<string, string>, data: ReturnType<typeof useOperationsData>["data"]) {
  return {
    lesson_id: data.lessons.find((lesson) => lesson.id === values.lesson || lesson.startsAt === values.lesson)?.id || values.lesson,
    student_id: data.students.find((student) => student.id === values.student || student.name === values.student)?.id || values.student,
    status: values.status,
    makeup_needed: values.makeupNeeded === "예",
    memo: values.memo
  };
}
