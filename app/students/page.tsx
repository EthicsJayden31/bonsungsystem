"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage, type MobileListCard } from "@/components/layout/resource-page";
import { StudentDetailPanel } from "@/components/students/student-detail-panel";
import { Badge } from "@/components/ui/badge";
import { teacherName, useOperationAction, useOperationsData, type DataSource } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function StudentsPage() {
  const role = usePreviewRole();
  const operations = useOperationsData(role);
  const saveAction = useOperationAction();
  const data = operations.data;
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedStudentId(params.get("student") ?? "");
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const selectedStudent = useMemo(
    () => data.students.find((student) => student.id === selectedStudentId),
    [data.students, selectedStudentId]
  );

  useEffect(() => {
    if (!selectedStudent) return;
    window.requestAnimationFrame(() => {
      document.getElementById("student-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedStudent]);

  function openStudentDetail(studentId: string) {
    setSelectedStudentId(studentId);
    const url = new URL(window.location.href);
    url.searchParams.set("student", studentId);
    url.hash = "student-detail";
    window.history.pushState({}, "", url);
  }

  function closeStudentDetail() {
    setSelectedStudentId("");
    const url = new URL(window.location.href);
    url.searchParams.delete("student");
    url.hash = "";
    window.history.pushState({}, "", url);
  }

  const mobileCards: MobileListCard[] = data.students.map((student) => {
    const teacher = student.teacherName || teacherName(data, student.teacherId);
    return {
      id: student.id,
      title: (
        <button className="text-left text-base font-extrabold text-brand" type="button" onClick={() => openStudentDetail(student.id)}>
          {student.name}
        </button>
      ),
      subtitle: `${student.major || "전공 미등록"} · 담당 ${teacher || "-"}`,
      status: <Badge>{student.status}</Badge>,
      meta: [
        <span key="phone">연락처: {role === "teacher" ? "권한 제한" : student.phone || "-"}</span>,
        <span key="memo">메모: {role === "teacher" ? maskTeacherMemo(student.memo) : student.memo || "-"}</span>
      ],
      action: (
        <button
          className="w-full rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-sm font-bold text-brand transition hover:bg-brand/10"
          type="button"
          onClick={() => openStudentDetail(student.id)}
        >
          상세 보기
        </button>
      )
    };
  });

  return (
    <AppShell area="students">
      <div className="space-y-5">
        {selectedStudent ? (
          <StudentDetailPanel
            data={data}
            role={role}
            studentId={selectedStudent.id}
            onClose={closeStudentDetail}
          />
        ) : null}

        <ResourcePage
          title="학생 관리"
          description="학생 목록, 상태, 보호자 연결, 수강 이력과 레슨 기록을 같은 화면 흐름에서 확인합니다. 모바일에서는 카드형 목록으로 표시합니다."
          sourceNote={<SourceNote source={operations.source} error={operations.error} />}
          headers={["이름", "전공", "상태", "담당", "연락처", "메모", "상세"]}
          mobileCards={mobileCards}
          rows={data.students.map((student) => [
            <button
              className="text-left font-bold text-brand underline-offset-4 hover:underline"
              key={`${student.id}-name`}
              type="button"
              onClick={() => openStudentDetail(student.id)}
            >
              {student.name}
            </button>,
            student.major || "-",
            <Badge key={`${student.id}-status`}>{student.status}</Badge>,
            student.teacherName || teacherName(data, student.teacherId),
            role === "teacher" ? "권한 제한" : student.phone || "-",
            role === "teacher" ? maskTeacherMemo(student.memo) : student.memo || "-",
            <button
              className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-brand/10"
              key={`${student.id}-detail`}
              type="button"
              onClick={() => openStudentDetail(student.id)}
            >
              상세 보기
            </button>
          ])}
          emptyTitle="학생 기록이 없습니다"
          emptyDescription="실사용 데이터 또는 preview 데이터에 학생 기록이 없으면 이 상태가 표시됩니다."
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
      </div>
    </AppShell>
  );
}

function SourceNote({ source, error }: { source: DataSource; error?: string }) {
  const text = source === "live"
    ? "Apps Script bootstrap의 실사용 데이터를 표시합니다."
    : "실사용 세션이 없거나 연결이 실패하면 같은 화면 구조에서 Next preview 데이터를 표시합니다.";

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ink">{text}</p>
        <Badge tone={source === "live" ? "good" : source === "fallback" ? "warn" : "default"}>
          {source === "live" ? "실사용 데이터" : "Preview"}
        </Badge>
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
  return memo ? "해당 수업 운영에 필요한 범위만 표시" : "-";
}
