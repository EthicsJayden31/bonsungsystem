"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { roomName, useOperationsData } from "@/lib/operations-data";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function PracticeRoomsPage() {
  const role = usePreviewRole();
  const { data, source } = useOperationsData(role);

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
        fields={[
          { label: "공간", name: "room" },
          { label: "예약자", name: "requester" },
          { label: "사용일", name: "date", type: "date" },
          { label: "예약 상태", name: "status", type: "select", options: ["예약", "사용완료", "취소", "노쇼"] },
          { label: "노쇼/취소 메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
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
