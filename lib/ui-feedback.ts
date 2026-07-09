"use client";

export type UiToastTone = "success" | "info" | "error";

export type UiToastDetail = {
  message: string;
  tone?: UiToastTone;
  id?: number;
};

export type UiLoadingDetail = {
  active: boolean;
  label?: string;
};

export const UI_TOAST_EVENT = "bonsung-ui-toast";
export const UI_LOADING_EVENT = "bonsung-ui-loading";

export function showUiToast(message: string, tone: UiToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UiToastDetail>(UI_TOAST_EVENT, {
    detail: { message, tone, id: Date.now() }
  }));
}

export function setGlobalLoading(active: boolean, label = "처리 중") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UiLoadingDetail>(UI_LOADING_EVENT, {
    detail: { active, label }
  }));
}

export function successMessageForAction(action: string) {
  if (action.includes("Reservation")) return "예약 완료";
  if (action.includes("Consultation")) return action.startsWith("create") ? "신청 완료" : "처리 완료";
  if (action.includes("Settings") || action.includes("Password")) return "설정 완료";
  if (action.includes("Attendance")) return "출결 입력 완료";
  if (action.includes("Notice")) return "공지 저장 완료";
  if (action.includes("Registration") || action.includes("Payment")) return "수납 저장 완료";
  return "저장 완료";
}

export function loadingMessageForAction(action: string) {
  if (action.includes("Reservation")) return "예약 처리 중";
  if (action.includes("Consultation")) return "상담요청 처리 중";
  if (action.includes("Settings") || action.includes("Password")) return "설정 저장 중";
  return "저장 중";
}
