"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage, type MobileListCard } from "@/components/layout/resource-page";
import { StudentDetailPanel } from "@/components/students/student-detail-panel";
import { Badge } from "@/components/ui/badge";
import { hasVersion3Permission } from "@/lib/access-policy";
import { useAccountsData } from "@/lib/accounts-data";
import { teacherName, useOperationAction, useOperationsData, type DataSource } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";
import type { Version3Account } from "@/lib/version3-server-contract";

export default function StudentsPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const operations = useOperationsData(role);
  const accounts = useAccountsData();
  const saveAction = useOperationAction();
  const data = operations.data;
  const canManageStudents = hasVersion3Permission(user ?? role, "manageStudents") || role === "owner" || role === "manager";
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
  const studentAccounts = useMemo(() => {
    const map = new Map<string, Version3Account>();
    accounts.accounts
      .filter((account) => account.role === "student" && account.linkedStudentId)
      .forEach((account) => map.set(account.linkedStudentId, account));
    return map;
  }, [accounts.accounts]);

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

  async function saveStudentAndMaybeCreateAccount(values: Record<string, string>) {
    const created = await saveAction.run<Record<string, unknown>>("createStudent", { student: mapStudentInput(values) });
    if (values.createAccountAfter !== "on") return;
    const studentId = String(created.student_id || created.id || "");
    if (studentId) {
      window.location.assign(`/accounts?student=${encodeURIComponent(studentId)}#create-account`);
    }
  }

  const mobileCards: MobileListCard[] = data.students.map((student) => {
    const teacher = student.teacherName || teacherName(data, student.teacherId);
    const linkedAccount = studentAccounts.get(student.id);
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
        <span key="memo">메모: {role === "teacher" ? maskTeacherMemo(student.memo) : student.memo || "-"}</span>,
        canManageStudents ? <span key="account">계정: {studentAccountText(linkedAccount)}</span> : null
      ].filter(Boolean),
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
            account={studentAccounts.get(selectedStudent.id)}
            canManageStudents={canManageStudents}
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
          headers={canManageStudents ? ["이름", "전공", "상태", "담당", "연락처", "계정", "상세"] : ["이름", "전공", "상태", "담당", "연락처", "메모", "상세"]}
          mobileCards={mobileCards}
          rows={data.students.map((student) => studentRow({
            student,
            account: studentAccounts.get(student.id),
            canManageStudents,
            role,
            teacher: student.teacherName || teacherName(data, student.teacherId),
            onOpen: openStudentDetail
          }))}
          emptyTitle="학생 기록이 없습니다"
          emptyDescription="실사용 데이터 또는 preview 데이터에 학생 기록이 없으면 이 상태가 표시됩니다."
          onSubmit={canManageStudents ? saveStudentAndMaybeCreateAccount : undefined}
          submitDisabled={saveAction.pending}
          submitLabel={saveAction.pending ? "저장 중" : "학생 저장"}
          submitHelp="Version.3 서버 세션에서는 학생 기록이 별도 서버에 저장되고, 등록 후 수강생 계정 생성 흐름으로 바로 이어질 수 있습니다."
          showForm={canManageStudents}
          fields={[
            { label: "이름", name: "name" },
            { label: "생년월일", name: "birthDate", type: "date" },
            { label: "연락처", name: "phone" },
            { label: "전공/관심 분야", name: "major" },
            { label: "목표", name: "goal" },
            { label: "상태", name: "status", type: "select", options: ["상담중", "등록대기", "재원", "휴원", "퇴원"] },
            { label: "등록 후 수강생 계정 만들기", name: "createAccountAfter", type: "checkbox" },
            { label: "메모", name: "memo", type: "textarea" }
          ]}
        />
      </div>
    </AppShell>
  );
}

function SourceNote({ source, error }: { source: DataSource; error?: string }) {
  const text = source === "server"
    ? "Version.3 서버의 학생 데이터를 표시합니다."
    : source === "live"
      ? "전환 세션의 학생 데이터를 표시합니다."
      : source === "fallback"
        ? "학생 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다."
        : "Preview 점검 모드의 학생 데이터를 표시합니다.";

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-ink">{text}</p>
        <Badge tone={source === "server" || source === "live" ? "good" : source === "fallback" ? "warn" : "default"}>
          {source === "server" ? "서버 데이터" : source === "live" ? "전환 데이터" : source === "fallback" ? "연결 실패" : "Preview"}
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

function studentRow({
  student,
  account,
  canManageStudents,
  role,
  teacher,
  onOpen
}: {
  student: { id: string; name: string; major: string; status: string; phone: string; memo: string };
  account?: Version3Account;
  canManageStudents: boolean;
  role: string | null;
  teacher: string;
  onOpen: (studentId: string) => void;
}) {
  const common = [
    <button
      className="text-left font-bold text-brand underline-offset-4 hover:underline"
      key={`${student.id}-name`}
      type="button"
      onClick={() => onOpen(student.id)}
    >
      {student.name}
    </button>,
    student.major || "-",
    <Badge key={`${student.id}-status`}>{student.status}</Badge>,
    teacher,
    role === "teacher" ? "권한 제한" : student.phone || "-"
  ];

  if (canManageStudents) {
    return [
      ...common,
      <StudentAccountCell account={account} studentId={student.id} key={`${student.id}-account`} />,
      <StudentDetailButton studentId={student.id} onOpen={onOpen} key={`${student.id}-detail`} />
    ];
  }

  return [
    ...common,
    role === "teacher" ? maskTeacherMemo(student.memo) : student.memo || "-",
    <StudentDetailButton studentId={student.id} onOpen={onOpen} key={`${student.id}-detail`} />
  ];
}

function StudentAccountCell({ account, studentId }: { account?: Version3Account; studentId: string }) {
  if (!account) {
    return (
      <a className="inline-flex rounded-xl border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent/15" href={`/accounts?student=${studentId}#create-account`}>
        계정 필요
      </a>
    );
  }
  return <Badge tone={account.status === "paused" ? "danger" : account.status === "invited" || account.mustChangePassword ? "warn" : "good"}>{studentAccountText(account)}</Badge>;
}

function StudentDetailButton({ studentId, onOpen }: { studentId: string; onOpen: (studentId: string) => void }) {
  return (
    <button
      className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-brand/10"
      type="button"
      onClick={() => onOpen(studentId)}
    >
      상세 보기
    </button>
  );
}

function studentAccountText(account?: Version3Account) {
  if (!account) return "계정 필요";
  if (account.status === "paused") return "계정 중지";
  if (account.status === "invited") return "초안";
  if (account.mustChangePassword) return "비밀번호 변경 필요";
  return "연결됨";
}

function maskTeacherMemo(memo: string) {
  return memo ? "해당 수업 운영에 필요한 범위만 표시" : "-";
}
