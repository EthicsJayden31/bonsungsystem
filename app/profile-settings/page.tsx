"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { hasVersion3Permission } from "@/lib/access-policy";
import { APPS_SCRIPT_SESSION_TOKEN_KEY, changeAppsScriptPassword } from "@/lib/apps-script-client";
import { updateLiveSessionUser, updateServerSessionUser } from "@/lib/client-session";
import { useOperationAction, useOperationsData } from "@/lib/operations-data";
import { readPreferences, savePreferences, startPages, type Preferences } from "@/lib/preferences";
import { setGlobalLoading, showUiToast } from "@/lib/ui-feedback";
import { useCurrentUser } from "@/lib/use-current-user";
import { useCurrentRole } from "@/lib/use-current-role";
import { changeVersion3ServerPassword, hasVersion3ServerSession } from "@/lib/version3-server-client";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const operations = useOperationsData(role);
  const saveAction = useOperationAction();
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences());
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const forcePasswordChange = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("forcePasswordChange") === "1";
  const hasPasswordSession = hasVersion3ServerSession() || (typeof window !== "undefined" && Boolean(window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY)));
  const canManagePublicSettings = hasVersion3Permission(user ?? role, "managePublicSettings");

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function save() {
    savePreferences(preferences);
    showUiToast("설정 완료");
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const currentPassword = values.currentPassword || "";
    const newPassword = values.newPassword || "";
    const confirmPassword = values.confirmPassword || "";

    const appsScriptToken = typeof window !== "undefined" ? window.localStorage.getItem(APPS_SCRIPT_SESSION_TOKEN_KEY) || "" : "";
    if (!hasVersion3ServerSession() && !appsScriptToken) {
      setPasswordMessage("로그인 세션에서만 비밀번호를 변경할 수 있습니다.");
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
    setGlobalLoading(true, "설정 저장 중");
    try {
      if (hasVersion3ServerSession()) {
        const result = await changeVersion3ServerPassword(currentPassword, newPassword);
        updateServerSessionUser({
          ...result.user,
          mustChangePassword: false,
          must_change_password: false
        });
      } else {
        const result = await changeAppsScriptPassword(appsScriptToken, currentPassword, newPassword);
        updateLiveSessionUser({
          ...(result.user ?? user ?? {}),
          mustChangePassword: false,
          must_change_password: false
        });
      }
      form.reset();
      setPasswordMessage("비밀번호가 변경되었습니다.");
      showUiToast("설정 완료");
      router.replace("/profile-settings");
    } catch (caught) {
      setPasswordMessage(caught instanceof Error ? caught.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setPasswordPending(false);
      setGlobalLoading(false);
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

        <div className="max-w-4xl space-y-5">
            {hasPasswordSession ? (
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

            <SettingCard title="설정 저장" description="선택한 시작 화면, 화면 밀도, 모바일 메뉴 방식을 현재 브라우저에 저장합니다.">
              <button className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-dark sm:w-auto sm:min-w-40" type="button" onClick={save}>
                설정 저장
              </button>
            </SettingCard>
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

function _Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-1 font-bold text-ink">{value}</dd>
    </div>
  );
}

function _focusLabel(value: Preferences["dashboardFocus"]) {
  if (value === "lessons") return "오늘 수업";
  if (value === "students") return "학생 변화";
  return "운영 현황";
}

