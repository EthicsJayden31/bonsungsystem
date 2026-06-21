"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { roomName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function PracticeRoomsPage() {
  const role = usePreviewRole();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();

  return (
    <AppShell area="practice-rooms">
      <ResourcePage
        title="연습실 예약"
        description={source === "live" ? "Apps Script bootstrap의 공간/예약 데이터를 표시합니다." : "Preview 데이터로 연습실 예약 화면을 점검합니다."}
        headers={["공간", "예약자", "사용 시간", "상태", "메모"]}
        rows={data.reservations.map((item) => [
          item.roomName || roomName(data, item.roomId),
          item.requester || item.studentName || "-",
          formatReservationTime(item.startsAt, item.endsAt),
          <Badge key={item.id}>{item.status || "확인 필요"}</Badge>,
          item.memo || "-"
        ])}
        emptyTitle="표시할 예약 정보가 없습니다"
        emptyDescription="실사용 세션이 없거나 Apps Script 응답에 예약 데이터가 없으면 이곳이 비어 있을 수 있습니다."
        onSubmit={(values) => saveAction.run("createReservation", { reservation: mapReservationInput(values, data) })}
        submitDisabled={saveAction.pending}
        submitLabel={saveAction.pending ? "저장 중" : "예약 저장"}
        submitHelp="공간은 이름 또는 ID를 입력할 수 있습니다. Apps Script 정책상 정각부터 1시간 단위 예약만 저장됩니다."
        fields={[
          { label: "공간명 또는 ID", name: "room" },
          { label: "사용일", name: "date", type: "date" },
          { label: "시작 시간(HH:00)", name: "startTime" },
          { label: "종료 시간(HH:00)", name: "endTime" },
          { label: "목적", name: "purpose", type: "select", options: ["레슨", "이론수업", "회의", "연습"] },
          { label: "메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}

function mapReservationInput(values: Record<string, string>, data: ReturnType<typeof useOperationsData>["data"]) {
  return {
    room_id: data.rooms.find((room) => room.id === values.room || room.name === values.room)?.id || values.room,
    reservation_date: values.date,
    start_time: values.startTime,
    end_time: values.endTime,
    purpose: values.purpose,
    memo: values.memo
  };
}

function formatReservationTime(startsAt: string, endsAt: string) {
  const start = formatDateTime(startsAt);
  const end = formatDateTime(endsAt, true);
  if (start === "-") return "-";
  return end === "-" ? start : start + " ~ " + end;
}

function formatDateTime(value: string, timeOnly = false) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return timeOnly ? parsed.toLocaleTimeString("ko-KR") : parsed.toLocaleString("ko-KR");
}
