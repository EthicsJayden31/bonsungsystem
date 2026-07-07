"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { hasVersion3Permission } from "@/lib/access-policy";
import { updateServerSessionUser } from "@/lib/client-session";
import { useOperationAction, useOperationsData } from "@/lib/operations-data";
import { readPreferences, savePreferences, startPages, type Preferences } from "@/lib/preferences";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";
import { changeVersion3TestPassword, hasVersion3TestSession } from "@/lib/version3-test-mode";
import { changeVersion3ServerPassword, hasVersion3ServerSession } from "@/lib/version3-server-client";

export default function ProfileSettingsPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const operations = useOperationsData(role);
  const saveAction = useOperationAction();
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences());
  const [saved, setSaved] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const forcePasswordChange = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("forcePasswordChange") === "1";
  const canManagePublicSettings = hasVersion3Permission(user ?? role, "managePublicSettings");

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function save() {
    savePreferences(preferences);
    setSaved(true);
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const currentPassword = values.currentPassword || "";
    const newPassword = values.newPassword || "";
    const confirmPassword = values.confirmPassword || "";

    if (!hasVersion3ServerSession() && !hasVersion3TestSession()) {
      setPasswordMessage("Version.3 서버 또는 테스트모드 로그인 세션에서만 비밀번호를 변경할 수 있습니다.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setPasswordPending(true);
    setPasswordMessage("");
    try {
      if (hasVersion3TestSession()) {
        changeVersion3TestPassword(currentPassword, newPassword);
      } else {
        const result = await changeVersion3ServerPassword(currentPassword, newPassword);
        updateServerSessionUser(result.user);
      }
      form.reset();
      setPasswordMessage("비밀번호가 변경되었습니다.");
    } catch (caught) {
      setPasswordMessage(caught instanceof Error ? caught.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setPasswordPending(false);
    }
  }

  async function submitPublicSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (!canManagePublicSettings) {
      setSettingsMessage("운영 환경 설정은 대표 권한에서만 저장할 수 있습니다.");
      return;
    }
    try {
      await saveAction.run("updatePublicSettings", {
        publicSettings: {
          loginNotice: values.loginNotice,
          academyPhone: values.academyPhone,
          reservationGuide: values.reservationGuide
        }
      });
      setSettingsMessage("운영 환경 설정을 저장했습니다. 서버 데이터는 새로고침 후 화면에 반영됩니다.");
    } catch (caught) {
      setSettingsMessage(caught instanceof Error ? caught.message : "운영 환경 설정을 저장하지 못했습니다.");
    }
  }

  return (
    <AppShell area="profile-settings">
      <section className="space-y-6">
        <div className="max-w-3xl">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">개인화 설정</h1>
          <p className="mt-2 text-[15px] leading-6 text-muted">
            자주 쓰는 시작 화면과 화면 밀도, 모바일 메뉴 방식을 내 작업 흐름에 맞게 조정합니다.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {hasVersion3ServerSession() || hasVersion3TestSession() ? (
              <SettingCard
                title={user?.mustChangePassword || forcePasswordChange ? "비밀번호 변경 필요" : "Version.3 계정 보안"}
                description={user?.mustChangePassword || forcePasswordChange ? "임시 비밀번호로 로그인한 계정입니다. 새 비밀번호를 설정해야 다른 운영 화면을 계속 사용할 수 있습니다." : "서버 계정의 비밀번호를 변경합니다."}
              >
                <form className="grid gap-3 sm:grid-cols-3" onSubmit={submitPasswordChange}>
                  <label className="block">
                    <span className="text-xs font-bold text-ink">현재 비밀번호</span>
                    <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="currentPassword" type="password" autoComplete="current-password" disabled={passwordPending} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-ink">새 비밀번호</span>
                    <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="newPassword" type="password" autoComplete="new-password" disabled={passwordPending} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-ink">새 비밀번호 확인</span>
                    <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" name="confirmPassword" type="password" autoComplete="new-password" disabled={passwordPending} />
                  </label>
                  <button className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-3" disabled={passwordPending} type="submit">
                    {passwordPending ? "변경 중" : "비밀번호 변경"}
                  </button>
                </form>
                {passwordMessage ? <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs font-bold leading-5 text-muted">{passwordMessage}</p> : null}
              </SettingCard>
            ) : null}
            <SettingCard title="시작 화면" description="로그인 후 가장 먼저 확인하고 싶은 화면을 고릅니다.">
              <div className="grid gap-2 sm:grid-cols-2">
                {startPages.map((item) => (
                  <ChoiceButton
                    active={preferences.startPage === item.value}
                    key={item.value}
                    label={item.label}
                    onClick={() => update("startPage", item.value)}
                  />
                ))}
              </div>
            </SettingCard>

            <SettingCard title="화면 밀도" description="현장 데스크에서는 넓게, 모바일에서는 촘촘하게 볼 수 있도록 기준을 정합니다.">
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceButton active={preferences.density === "comfortable"} label="편안하게 보기" onClick={() => update("density", "comfortable")} />
                <ChoiceButton active={preferences.density === "compact"} label="촘촘하게 보기" onClick={() => update("density", "compact")} />
              </div>
            </SettingCard>

            <SettingCard title="모바일 메뉴" description="메뉴를 한 줄로 길게 보는 대신, 업무 단위별로 접어서 선택할 수 있습니다.">
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceButton active={preferences.mobileMenu === "grouped"} label="업무 그룹별 선택" onClick={() => update("mobileMenu", "grouped")} />
                <ChoiceButton active={preferences.mobileMenu === "expanded"} label="전체 메뉴 펼침" onClick={() => update("mobileMenu", "expanded")} />
              </div>
            </SettingCard>

            <SettingCard title="대시보드 우선순위" description="첫 화면에서 어떤 정보를 가장 위에 둘지 정합니다.">
              <div className="grid gap-2 sm:grid-cols-3">
                <ChoiceButton active={preferences.dashboardFocus === "operations"} label="운영 현황" onClick={() => update("dashboardFocus", "operations")} />
                <ChoiceButton active={preferences.dashboardFocus === "lessons"} label="오늘 수업" onClick={() => update("dashboardFocus", "lessons")} />
                <ChoiceButton active={preferences.dashboardFocus === "students"} label="학생 변화" onClick={() => update("dashboardFocus", "students")} />
              </div>
            </SettingCard>

            <SettingCard title="운영 환경 설정" description="로그인 안내, 학원 연락처, 공간 예약 안내처럼 시스템 전체에서 함께 쓰는 문구를 관리합니다.">
              <form className="grid gap-3" onSubmit={submitPublicSettings}>
                <label className="block">
                  <span className="text-xs font-bold text-ink">로그인 안내 문구</span>
                  <textarea className="mt-1 min-h-20 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" defaultValue={operations.data.publicSettings.loginNotice} disabled={!canManagePublicSettings || saveAction.pending} name="loginNotice" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-ink">학원 연락처</span>
                  <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" defaultValue={operations.data.publicSettings.academyPhone} disabled={!canManagePublicSettings || saveAction.pending} name="academyPhone" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-ink">공간 예약 안내</span>
                  <textarea className="mt-1 min-h-20 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" defaultValue={operations.data.publicSettings.reservationGuide} disabled={!canManagePublicSettings || saveAction.pending} name="reservationGuide" />
                </label>
                <button className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={!canManagePublicSettings || saveAction.pending} type="submit">
                  운영 환경 저장
                </button>
              </form>
              {settingsMessage ? <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs font-bold leading-5 text-muted">{settingsMessage}</p> : null}
            </SettingCard>
          </div>

          <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">설정 요약</h2>
              <Badge>{role === "owner" ? "대표" : role === "manager" ? "매니저" : role === "teacher" ? "강사" : "수강생"}</Badge>
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <Summary label="시작 화면" value={startPages.find((item) => item.value === preferences.startPage)?.label || preferences.startPage} />
              <Summary label="화면 밀도" value={preferences.density === "compact" ? "촘촘하게 보기" : "편안하게 보기"} />
              <Summary label="모바일 메뉴" value={preferences.mobileMenu === "grouped" ? "업무 그룹별 선택" : "전체 메뉴 펼침"} />
              <Summary label="대시보드" value={focusLabel(preferences.dashboardFocus)} />
            </dl>
            <button className="mt-5 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-dark" type="button" onClick={save}>
              설정 저장
            </button>
            <p className="mt-3 rounded-xl bg-brand/5 px-3 py-2 text-xs leading-5 text-muted">
              저장 후 다음 로그인부터 선택한 시작 화면으로 이동합니다. 모바일 메뉴와 화면 밀도는 현재 브라우저에서 바로 반영됩니다.
            </p>
            {saved ? <p className="mt-3 rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-xs font-bold text-success">설정이 저장되었습니다.</p> : null}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

function SettingCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChoiceButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
        active ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-surface-muted text-muted hover:border-brand/40 hover:text-brand"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-1 font-bold text-ink">{value}</dd>
    </div>
  );
}

function focusLabel(value: Preferences["dashboardFocus"]) {
  if (value === "lessons") return "오늘 수업";
  if (value === "students") return "학생 변화";
  return "운영 현황";
}

