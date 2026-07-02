"use client";

import { FormEvent, MouseEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { DataTable } from "@/components/ui/table";
import { hasVersion3Permission } from "@/lib/access-policy";
import { roleLabel, useAccountsData } from "@/lib/accounts-data";
import { redirectToAppPath } from "@/lib/client-session";
import { useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";
import { hasVersion3TestSession, reviewVersion3TestAccountRequest } from "@/lib/version3-test-mode";
import { callVersion3Server, hasVersion3ServerSession } from "@/lib/version3-server-client";
import { ENABLE_PREVIEW_LOGIN } from "@/lib/version3-runtime-flags";
import { version3AccountRoles, version3PermissionGroups, version3PermissionKeys, version3ServerEntities, type Version3Account, type Version3AccountHistory, type Version3AccountInput, type Version3Permissions } from "@/lib/version3-server-contract";
import type { Role } from "@/lib/auth-shared";
import type { AccountRequest } from "@/lib/demo-data";

const accountSourceLabel = {
  loading: "계정 확인 중",
  server: "Version.3 서버 계정",
  live: "실사용 계정",
  test: "Version.3 서버 계정",
  preview: "Version.3 Preview",
  fallback: "계정 연결 실패"
};

const permissionLabels = Object.fromEntries(
  version3PermissionGroups.flatMap((group) => group.items.map((item) => [item.key, item.label]))
) as Record<(typeof version3PermissionKeys)[number], string>;

export default function AccountsPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const accountState = useAccountsData();
  const operations = useOperationsData(role);
  const [message, setMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("student");
  const prefillStudentId = readAccountPrefillStudentId();
  const returnToPath = readAccountReturnToPath();
  const [pendingAccountId, setPendingAccountId] = useState("");
  const [permissionAccountId, setPermissionAccountId] = useState("");
  const [permissionDraft, setPermissionDraft] = useState<Version3Permissions>({});
  const [requestPendingId, setRequestPendingId] = useState("");
  const accessUser = user ?? role;
  const canCreateAccount = hasVersion3Permission(accessUser, "manageAccounts");
  const canManageAccount = hasVersion3Permission(accessUser, "manageAccounts");
  const canEditPermissions = hasVersion3Permission(accessUser, "managePermissions");
  const canReviewAccountRequests = hasVersion3Permission(accessUser, "reviewAccountRequests");
  const canSubmitAccount = canCreateAccount && (accountState.hasLiveSession || ENABLE_PREVIEW_LOGIN);
  const accountWriteModeLabel = accountState.hasLiveSession ? "계정 생성" : ENABLE_PREVIEW_LOGIN ? "Preview 초안 추가" : "서버 로그인 필요";
  const linkedStudentCount = useMemo(
    () => accountState.accounts.filter((account) => account.role === "student" && account.linkedStudentId).length,
    [accountState.accounts]
  );
  const linkedStudentIds = useMemo(
    () => new Set(accountState.accounts.filter((account) => account.role === "student" && account.linkedStudentId).map((account) => account.linkedStudentId)),
    [accountState.accounts]
  );
  const availableStudents = useMemo(
    () => operations.data.students.filter((student) => !linkedStudentIds.has(student.id)),
    [linkedStudentIds, operations.data.students]
  );
  const requestedStudent = useMemo(
    () => operations.data.students.find((student) => student.id === prefillStudentId),
    [operations.data.students, prefillStudentId]
  );
  const prefillStudent = useMemo(
    () => availableStudents.find((student) => student.id === prefillStudentId),
    [availableStudents, prefillStudentId]
  );
  const accountPrefill = useMemo(
    () => prefillStudent
      ? {
        name: `${prefillStudent.name} 수강생`,
        loginId: suggestedStudentLoginId(prefillStudent.id),
        linkedStudentId: prefillStudent.id
      }
      : { name: "", loginId: "", linkedStudentId: "" },
    [prefillStudent]
  );
  const recentAccountHistory = useMemo(() => accountState.accountHistory.slice(0, 8), [accountState.accountHistory]);
  const resetCandidates = useMemo(
    () => accountState.accounts.filter((account) => account.status !== "invited" && account.id !== accountState.currentAccountId),
    [accountState.accounts, accountState.currentAccountId]
  );
  const permissionCandidates = resetCandidates;
  const selectedPermissionAccount = useMemo(
    () => permissionCandidates.find((account) => account.id === permissionAccountId) || permissionCandidates[0],
    [permissionAccountId, permissionCandidates]
  );
  const effectivePermissionDraft = permissionAccountId === selectedPermissionAccount?.id ? permissionDraft : selectedPermissionAccount?.permissions || {};

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const input: Version3AccountInput = {
      loginId: values.loginId?.trim() ?? "",
      name: values.name?.trim() ?? "",
      role: selectedRole,
      email: values.email?.trim() ?? "",
      phone: values.phone?.trim() ?? "",
      linkedStudentId: values.linkedStudentId ?? "",
      initialPassword: values.initialPassword ?? ""
    };

    if (!input.loginId || !input.name || !input.initialPassword) {
      setMessage("이름, 로그인 ID, 초기 비밀번호를 입력해 주세요.");
      return;
    }
    if (input.initialPassword.length < 8) {
      setMessage("초기 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (input.role === "student" && !input.linkedStudentId) {
      setMessage("수강생 계정은 연결할 학생을 선택해야 합니다.");
      return;
    }
    if (input.role === "student" && linkedStudentIds.has(input.linkedStudentId)) {
      setMessage("이미 수강생 계정과 연결된 학생입니다. 다른 학생을 선택해 주세요.");
      return;
    }

    try {
      await accountState.createAccount(input);
      form.reset();
      setSelectedRole("student");
      setMessage(accountState.hasLiveSession ? "계정 생성 요청이 완료되었습니다." : "Preview 초안을 추가했습니다. 서버 저장은 Version.3 세션에서 처리합니다.");
      if (returnToPath) redirectToAppPath(returnToPath);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "계정을 저장하지 못했습니다.");
    }
  }

  async function toggleAccount(account: Version3Account) {
    if (!canEditPermissions) {
      setMessage("계정 중지와 재개는 대표 권한에서만 진행합니다.");
      return;
    }
    if (account.id === accountState.currentAccountId) {
      setMessage("현재 로그인한 계정은 이 화면에서 중지할 수 없습니다.");
      return;
    }
    const active = account.status === "paused";
    setPendingAccountId(account.id);
    try {
      await accountState.updateAccountStatus(account.id, active);
      setMessage(accountState.hasLiveSession ? `${account.name} 계정을 ${active ? "재개" : "중지"}했습니다.` : `Preview에서 ${account.name} 계정을 ${active ? "재개" : "중지"}했습니다.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "계정 상태를 변경하지 못했습니다.");
    } finally {
      setPendingAccountId("");
    }
  }

  async function submitPasswordReset(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!canManageAccount) {
      setMessage("비밀번호 초기화는 대표 권한에서만 진행합니다.");
      return;
    }
    const form = event.currentTarget.form;
    if (!form) return;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const accountId = values.resetAccountId || resetCandidates[0]?.id || "";
    const password = values.resetPassword || "";
    const account = accountState.accounts.find((item) => item.id === accountId);

    if (!accountId || !account) {
      setMessage("초기화할 계정을 선택해 주세요.");
      return;
    }
    if (password.length < 8) {
      setMessage("임시 비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setPendingAccountId(accountId);
    try {
      await accountState.resetAccountPassword(accountId, password);
      const passwordInput = form.elements.namedItem("resetPassword") as HTMLInputElement | null;
      if (passwordInput) passwordInput.value = "";
      setMessage(accountState.hasLiveSession ? `${account.name} 계정의 비밀번호를 초기화했습니다.` : `Preview에서 ${account.name} 계정의 비밀번호 초기화를 확인했습니다.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "비밀번호를 초기화하지 못했습니다.");
    } finally {
      setPendingAccountId("");
    }
  }

  async function submitPermissions(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!canManageAccount) {
      setMessage("권한 상세 편집은 대표 권한에서만 진행합니다.");
      return;
    }
    if (!selectedPermissionAccount) {
      setMessage("권한을 수정할 계정을 선택해 주세요.");
      return;
    }
    setPendingAccountId(selectedPermissionAccount.id);
    try {
      await accountState.updateAccountPermissions(selectedPermissionAccount.id, effectivePermissionDraft);
      setMessage(accountState.hasLiveSession ? `${selectedPermissionAccount.name} 계정의 권한을 저장했습니다.` : `Preview에서 ${selectedPermissionAccount.name} 계정의 권한 변경을 확인했습니다.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "권한을 저장하지 못했습니다.");
    } finally {
      setPendingAccountId("");
    }
  }

  function togglePermission(key: keyof Version3Permissions) {
    if (!selectedPermissionAccount) return;
    setPermissionAccountId(selectedPermissionAccount.id);
    setPermissionDraft({ ...effectivePermissionDraft, [key]: !Boolean(effectivePermissionDraft[key]) });
  }

  function selectPermissionAccount(accountId: string) {
    const account = permissionCandidates.find((item) => item.id === accountId);
    setPermissionAccountId(accountId);
    setPermissionDraft(account?.permissions || {});
  }

  async function submitAccountRequestReview(event: FormEvent<HTMLFormElement>, request: AccountRequest) {
    event.preventDefault();
    if (!canReviewAccountRequests) {
      setMessage("계정 요청 승인은 대표 권한에서만 진행합니다.");
      return;
    }
    if (!hasVersion3ServerSession() && !hasVersion3TestSession()) {
      setMessage("계정 요청 승인은 Version.3 서버 또는 테스트모드 로그인 세션에서만 진행합니다.");
      return;
    }
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const decision = submitter?.value || "approve";
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const initialPassword = values.initialPassword || "";
    const linkedStudentId = values.linkedStudentId || request.linkedStudentId || "";

    if (decision === "approve" && initialPassword.length < 8) {
      setMessage("승인할 계정의 초기 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (decision === "approve" && request.requestedRole === "student" && !linkedStudentId) {
      setMessage("수강생 계정 요청은 연결할 학생을 선택해야 승인할 수 있습니다.");
      return;
    }

    setRequestPendingId(request.id);
    try {
      if (hasVersion3TestSession()) {
        reviewVersion3TestAccountRequest(request.id, {
          decision,
          initialPassword,
          linkedStudentId,
          memo: values.memo || ""
        });
      } else {
        await callVersion3Server(`/account-requests/${encodeURIComponent(request.id)}/review`, {
          method: "PATCH",
          body: {
            decision,
            initialPassword,
            linkedStudentId,
            memo: values.memo || ""
          }
        });
      }
      setMessage(decision === "approve" ? `${request.name} 계정 요청을 승인했습니다. 새로고침 후 계정 목록에 반영됩니다.` : `${request.name} 계정 요청을 반려했습니다.`);
      form.reset();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "계정 요청을 처리하지 못했습니다.");
    } finally {
      setRequestPendingId("");
    }
  }

  return (
    <AppShell area="accounts">
      <Section
        title="계정 관리"
        description="Version.3의 대표, 매니저, 강사, 수강생 계정을 한 기준으로 정리합니다. 수강생 계정은 학생 기록과 연결되어야 합니다."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard label="계정 소스" value={accountSourceLabel[accountState.source]} helper={accountState.source === "server" || accountState.source === "test" ? "별도 서버 연결" : accountState.source === "live" ? "전환 연결층 사용" : accountState.source === "preview" ? "점검용 Preview" : "서버 세션 필요"} />
              <SummaryCard label="전체 계정" value={accountState.accounts.length} helper="대표/매니저/강사/수강생 합계" />
              <SummaryCard label="연결 가능 학생" value={availableStudents.length} helper={`연결됨 ${linkedStudentCount}명`} />
            </div>

            {accountState.error ? (
              <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4 text-sm leading-6 text-accent">
                계정 연결 오류: {accountState.error}
              </div>
            ) : null}

            {canReviewAccountRequests ? (
              <div className="rounded-[24px] border border-line bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-ink">계정 요청 승인</h2>
                    <p className="mt-1 text-sm leading-6 text-muted">계정 요청을 검토한 뒤 초기 비밀번호와 학생 연결을 지정해 실제 계정으로 전환합니다.</p>
                  </div>
                  <Badge tone={operations.data.accountRequests.filter((item) => item.status === "대기").length ? "warn" : "good"}>
                    대기 {operations.data.accountRequests.filter((item) => item.status === "대기").length}건
                  </Badge>
                </div>
                {operations.data.accountRequests.length ? (
                  <div className="mt-4 grid gap-3">
                    {operations.data.accountRequests.map((request) => (
                      <form className="rounded-2xl border border-line bg-surface-muted p-4" key={request.id} onSubmit={(event) => submitAccountRequestReview(event, request)}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-extrabold text-ink">{request.name} · {request.loginId}</p>
                            <p className="mt-1 text-xs leading-5 text-muted">{roleLabel(request.requestedRole)} 요청 · {request.phone || request.email || "연락처 없음"}</p>
                            {request.message ? <p className="mt-2 text-sm leading-6 text-muted">{request.message}</p> : null}
                          </div>
                          <Badge tone={request.status === "대기" ? "warn" : request.status === "승인" ? "good" : "danger"}>{request.status}</Badge>
                        </div>
                        {request.status === "대기" ? (
                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <label className="block">
                              <span className="text-xs font-bold text-ink">연결 학생</span>
                              <select className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" defaultValue={request.linkedStudentId} disabled={request.requestedRole !== "student" || requestPendingId === request.id} name="linkedStudentId">
                                <option value="">학생 선택</option>
                                {availableStudents.map((student) => (
                                  <option value={student.id} key={student.id}>{student.name}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="text-xs font-bold text-ink">초기 비밀번호</span>
                              <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={requestPendingId === request.id} name="initialPassword" placeholder="8자 이상" type="password" />
                            </label>
                            <label className="block lg:col-span-2">
                              <span className="text-xs font-bold text-ink">검토 메모</span>
                              <input className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={requestPendingId === request.id} name="memo" />
                            </label>
                            <div className="flex flex-wrap gap-2 lg:col-span-2">
                              <button className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/45" disabled={requestPendingId === request.id} name="decision" type="submit" value="approve">
                                승인
                              </button>
                              <button className="rounded-xl border border-accent/30 bg-white px-4 py-2 text-sm font-bold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60" disabled={requestPendingId === request.id} name="decision" type="submit" value="reject">
                                반려
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-muted">검토자: {request.reviewedByName || "-"} · 검토일: {formatAccountHistoryTime(request.reviewedAt)}</p>
                        )}
                      </form>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="계정 요청이 없습니다" description="로그인 전 계정 요청이 들어오면 이곳에서 승인하거나 반려합니다." />
                )}
              </div>
            ) : null}

            {accountState.accounts.length ? (
              <>
                <div className="grid gap-3 lg:hidden">
                  {accountState.accounts.map((account) => (
                    <AccountCard account={account} canManage={canManageAccount} isCurrent={account.id === accountState.currentAccountId} isPending={pendingAccountId === account.id} key={account.id} onToggle={toggleAccount} />
                  ))}
                </div>
                <div className="hidden lg:block">
                  <DataTable
                    headers={["이름", "로그인 ID", "권한", "학생 연결", "상태", "최근 로그인", "관리"]}
                    rows={accountState.accounts.map((account) => [
                      account.name,
                      account.loginId,
                      <Badge key={`${account.id}-role`}>{roleLabel(account.role)}</Badge>,
                      account.role === "student" ? account.linkedStudentName || account.linkedStudentId || "미연결" : "-",
                      statusBadge(account),
                      account.lastLoginAt || "-",
                      <AccountActions account={account} canManage={canManageAccount} isCurrent={account.id === accountState.currentAccountId} isPending={pendingAccountId === account.id} key={`${account.id}-actions`} onToggle={toggleAccount} />
                    ])}
                  />
                </div>
              </>
            ) : (
              <EmptyState title="계정 데이터가 없습니다" description="실사용 계정 연결 또는 preview 계정 초안이 표시됩니다." />
            )}

            <div className="rounded-[24px] border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-ink">최근 계정 변경 이력</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">계정 생성, 중지/재개, 비밀번호 초기화처럼 운영에 영향을 주는 변경을 남깁니다.</p>
                </div>
                <Badge tone={accountState.hasLiveSession ? "good" : "warn"}>{accountState.hasLiveSession ? "실사용 이력" : "Preview 이력"}</Badge>
              </div>
              {recentAccountHistory.length ? (
                <div className="mt-4 grid gap-2">
                  {recentAccountHistory.map((item) => (
                    <AccountHistoryRow item={item} key={item.id} />
                  ))}
                </div>
              ) : (
                <EmptyState title="계정 변경 이력이 없습니다" description="계정 저장 또는 상태 변경이 일어나면 이곳에 최근 이력이 표시됩니다." />
              )}
            </div>

            <div className="rounded-[24px] border border-line bg-white p-5 shadow-card">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">별도 서버 전환 기준</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                이 화면의 계정 계약은 이전 시트 구조를 그대로 복사하기보다, Version.3 서버가 가져야 할 최종 엔티티와 권한명을 기준으로 둡니다.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {version3ServerEntities.map((entity) => (
                  <div className="rounded-2xl border border-line bg-surface-muted p-3" key={entity.name}>
                    <p className="text-sm font-extrabold text-ink">{entity.label}</p>
                    <p className="mt-1 text-xs text-muted">담당: {entity.owner}</p>
                    <p className="mt-2 text-xs leading-5 text-muted">{entity.keyFields.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form className="scroll-mt-28 rounded-[24px] border border-line bg-white p-5 shadow-card" id="create-account" key={`create-account-${selectedRole}-${accountPrefill.linkedStudentId}`} onSubmit={submitAccount}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-ink">계정 입력</h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  대표 계정은 Version.3 서버에 계정을 생성합니다. Preview 점검 모드에서만 초안으로 목록에 추가됩니다.
                </p>
              </div>
              <Badge tone={canCreateAccount ? "good" : "warn"}>{canCreateAccount ? "생성 가능" : "대표 권한 필요"}</Badge>
            </div>

            {prefillStudent ? (
              <p className="mb-4 rounded-xl border border-brand/15 bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">
                {prefillStudent.name} 학생의 수강생 계정 초안을 바로 만들 수 있도록 연결 학생과 기본 이름을 채웠습니다.
              </p>
            ) : requestedStudent ? (
              <p className="mb-4 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-xs leading-5 text-accent">
                {requestedStudent.name} 학생은 이미 수강생 계정과 연결되어 있어 새 계정 후보에서 제외되었습니다.
              </p>
            ) : null}

            <label className="block">
              <span className="text-xs font-bold text-ink">권한</span>
              <select
                className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as Role)}
                  disabled={!canSubmitAccount}
              >
                {version3AccountRoles.map((item) => (
                  <option value={item.role} key={item.role}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-ink">이름</span>
              <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="name" placeholder="예: 이도윤" defaultValue={accountPrefill.name} disabled={!canSubmitAccount} />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-ink">로그인 ID</span>
              <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="loginId" placeholder="영문/숫자 기반 ID" defaultValue={accountPrefill.loginId} disabled={!canSubmitAccount} />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-ink">초기 비밀번호</span>
              <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="initialPassword" type="password" placeholder="8자 이상" disabled={!canSubmitAccount} />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-ink">이메일</span>
              <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="email" type="email" placeholder="name@example.com" disabled={!canSubmitAccount} />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-ink">연락처</span>
              <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="phone" placeholder="010-0000-0000" disabled={!canSubmitAccount} />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-ink">연결 학생</span>
              <select className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="linkedStudentId" defaultValue={accountPrefill.linkedStudentId} disabled={selectedRole !== "student" || !canSubmitAccount}>
                <option value="">학생 선택</option>
                {availableStudents.map((student) => (
                  <option value={student.id} key={student.id}>{student.name}</option>
                ))}
              </select>
              {selectedRole === "student" && !availableStudents.length ? (
                <span className="mt-2 block rounded-xl bg-accent/10 px-3 py-2 text-xs leading-5 text-accent">연결 가능한 학생 기록이 없습니다. 먼저 학생을 등록하거나 기존 수강생 계정 연결을 정리해야 합니다.</span>
              ) : null}
            </label>
            <button className="mt-4 w-full rounded-xl bg-brand px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/45" disabled={!canSubmitAccount} type="submit">
              {accountWriteModeLabel}
            </button>
            {message ? <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">{message}</p> : null}
            {!canCreateAccount ? (
              <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-xs leading-5 text-accent">계정 생성은 대표 권한에서만 진행합니다.</p>
            ) : !accountState.hasLiveSession && !ENABLE_PREVIEW_LOGIN ? (
              <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-xs leading-5 text-accent">Version.3 서버 로그인 세션이 있어야 계정을 생성할 수 있습니다.</p>
            ) : null}

            <div className="mt-5 border-t border-line pt-5">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">비밀번호 초기화</h2>
              <p className="mt-1 text-xs leading-5 text-muted">선택한 계정은 다음 로그인 때 비밀번호 변경이 필요합니다.</p>
              <div className="mt-3 grid gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-ink">초기화 대상</span>
                  <select className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageAccount || !resetCandidates.length} name="resetAccountId">
                    {resetCandidates.map((account) => (
                      <option value={account.id} key={account.id}>{account.name} · {account.loginId}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-ink">임시 비밀번호</span>
                  <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" disabled={!canManageAccount || !resetCandidates.length} name="resetPassword" placeholder="8자 이상" type="password" />
                </label>
                <button className="rounded-xl border border-brand bg-white px-3 py-3 text-sm font-bold text-brand transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:border-line disabled:text-muted" disabled={!canManageAccount || !resetCandidates.length || Boolean(pendingAccountId)} onClick={submitPasswordReset} type="button">
                  비밀번호 초기화
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">권한 상세 편집</h2>
              <p className="mt-1 text-xs leading-5 text-muted">선택한 계정의 세부 권한을 조정하고 변경 이력에 남깁니다.</p>
              <label className="mt-3 block">
                <span className="text-xs font-bold text-ink">권한 대상</span>
                <select
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                  disabled={!canEditPermissions || !permissionCandidates.length}
                  onChange={(event) => selectPermissionAccount(event.target.value)}
                  value={selectedPermissionAccount?.id || ""}
                >
                  {permissionCandidates.map((account) => (
                    <option value={account.id} key={account.id}>{account.name} · {account.loginId}</option>
                  ))}
                </select>
              </label>
              <div className="mt-4 grid gap-4">
                {version3PermissionGroups.map((group) => (
                  <fieldset className="rounded-2xl border border-line bg-surface-muted p-3" disabled={!canEditPermissions || !selectedPermissionAccount} key={group.group}>
                    <legend className="px-1 text-xs font-extrabold text-ink">{group.group}</legend>
                    <div className="mt-2 grid gap-2">
                      {group.items.map((item) => (
                        <label className="flex items-start gap-3 rounded-xl bg-white px-3 py-2 text-sm" key={item.key}>
                          <input
                            checked={Boolean(effectivePermissionDraft[item.key])}
                            className="mt-1 h-4 w-4 accent-brand"
                            onChange={() => togglePermission(item.key)}
                            type="checkbox"
                          />
                          <span>
                            <span className="block font-bold text-ink">{item.label}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-muted">{item.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <button
                className="mt-4 w-full rounded-xl border border-brand bg-white px-3 py-3 text-sm font-bold text-brand transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
                disabled={!canEditPermissions || !selectedPermissionAccount || Boolean(pendingAccountId)}
                onClick={submitPermissions}
                type="button"
              >
                권한 저장
              </button>
            </div>
          </form>
        </div>
      </Section>
    </AppShell>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
    </div>
  );
}

function AccountCard({ account, canManage, isCurrent, isPending, onToggle }: { account: Version3Account; canManage: boolean; isCurrent: boolean; isPending: boolean; onToggle: (account: Version3Account) => void }) {
  return (
    <article className="rounded-[22px] border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-extrabold text-ink">{account.name}</p>
          <p className="mt-1 text-sm text-muted">{account.loginId}</p>
        </div>
        <Badge>{roleLabel(account.role)}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted">
        <p className="rounded-xl bg-surface-muted px-3 py-2">학생 연결: {account.role === "student" ? account.linkedStudentName || account.linkedStudentId || "미연결" : "-"}</p>
        <p className="rounded-xl bg-surface-muted px-3 py-2">상태: {statusText(account)}</p>
        <p className="rounded-xl bg-surface-muted px-3 py-2">최근 로그인: {account.lastLoginAt || "-"}</p>
      </div>
      <AccountActions account={account} canManage={canManage} isCurrent={isCurrent} isPending={isPending} onToggle={onToggle} />
    </article>
  );
}

function AccountActions({ account, canManage, isCurrent, isPending, onToggle }: { account: Version3Account; canManage: boolean; isCurrent: boolean; isPending: boolean; onToggle: (account: Version3Account) => void }) {
  if (account.status === "invited") {
    return <span className="text-xs font-bold text-muted">초안 계정</span>;
  }
  if (isCurrent) {
    return <span className="text-xs font-bold text-muted">현재 계정</span>;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2 lg:mt-0">
      <button
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${account.status === "paused" ? "border-brand bg-brand text-white hover:bg-brand-dark" : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15"}`}
        disabled={!canManage || isPending}
        onClick={() => onToggle(account)}
        type="button"
      >
        {isPending ? "처리 중" : account.status === "paused" ? "재개" : "중지"}
      </button>
    </div>
  );
}

function AccountHistoryRow({ item }: { item: Version3AccountHistory }) {
  const permissionDetail = accountPermissionChangeSummary(item);
  return (
    <div className="grid gap-2 rounded-2xl border border-line bg-surface-muted p-3 text-sm sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
      <div className="min-w-0">
        <p className="font-extrabold text-ink">{accountActionLabel(item.action)}</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          {item.accountName || item.accountId || "계정"} · 처리자 {item.actorName || item.actorId || "-"}
        </p>
        {permissionDetail ? <p className="mt-1 text-xs leading-5 text-muted">{permissionDetail}</p> : null}
      </div>
      <p className="text-xs font-bold text-muted sm:text-right">{formatAccountHistoryTime(item.occurredAt)}</p>
    </div>
  );
}

function statusBadge(account: Version3Account) {
  if (account.status === "paused") return <Badge tone="danger">중지</Badge>;
  if (account.status === "invited") return <Badge tone="warn">초안</Badge>;
  if (account.mustChangePassword) return <Badge tone="warn">비밀번호 변경 필요</Badge>;
  return <Badge tone="good">활성</Badge>;
}

function accountActionLabel(action: string) {
  if (action === "create_account") return "계정 생성";
  if (action === "activate_account") return "계정 재개";
  if (action === "pause_account") return "계정 중지";
  if (action === "deactivate_account") return "계정 중지";
  if (action === "reset_password") return "비밀번호 초기화";
  if (action === "update_account") return "계정 정보 변경";
  if (action === "update_permissions") return "권한 변경";
  if (action === "approve_account_request") return "계정 요청 승인";
  if (action === "reject_account_request") return "계정 요청 반려";
  if (action === "bootstrap_admin") return "초기 대표 계정 생성";
  return action || "계정 변경";
}

function accountPermissionChangeSummary(item: Version3AccountHistory) {
  if (item.action !== "update_permissions") return "";
  const before = item.beforePermissions || {};
  const after = item.afterPermissions || {};
  const changed = version3PermissionKeys
    .filter((key) => Boolean(before[key]) !== Boolean(after[key]))
    .map((key) => `${permissionLabels[key]} ${after[key] ? "허용" : "제한"}`);
  if (!changed.length) return "권한 변경값 없음";
  return changed.length > 4 ? `${changed.slice(0, 4).join(" · ")} 외 ${changed.length - 4}개` : changed.join(" · ");
}

function formatAccountHistoryTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function readAccountPrefillStudentId() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("student") || params.get("linkedStudentId") || "";
}

function readAccountReturnToPath() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || "";
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) return "";
  if (/^\/(?:login|accounts)(?:\/|\?|#|$)/.test(returnTo)) return "";
  return returnTo;
}

function suggestedStudentLoginId(studentId: string) {
  const suffix = studentId.match(/\d+$/)?.[0] || studentId.replace(/[^a-zA-Z0-9]/g, "").slice(-6);
  return suffix ? `student${suffix}` : "student";
}

function statusText(account: Version3Account) {
  if (account.status === "paused") return "중지";
  if (account.status === "invited") return "초안";
  if (account.mustChangePassword) return "비밀번호 변경 필요";
  return "활성";
}
