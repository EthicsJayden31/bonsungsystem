"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage, type MobileListCard } from "@/components/layout/resource-page";
import { RoomReservationBoard, type RoomReservationSelection } from "@/components/rooms/room-reservation-board";
import { Badge } from "@/components/ui/badge";
import { hasVersion3Permission } from "@/lib/access-policy";
import { roomName, useOperationAction, useOperationsData } from "@/lib/operations-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePreviewRole } from "@/lib/use-preview-role";

export default function PracticeRoomsPage() {
  const role = usePreviewRole();
  const user = useCurrentUser();
  const { data, source } = useOperationsData(role);
  const saveAction = useOperationAction();
  const accessUser = user ?? role;
  const canReserveRoom = hasVersion3Permission(accessUser, "reserveLessonRoom") || hasVersion3Permission(accessUser, "reservePracticeRoom");
  const [selection, setSelection] = useState<RoomReservationSelection | null>(null);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const reservationPurposeOptions = role === "student"
    ? ["연습"]
    : role === "teacher"
      ? ["레슨", "이론수업", "연습"]
      : ["레슨", "이론수업", "회의", "연습"];

  const reservationInitialValues = useMemo(() => {
    if (!selection || selection.status === "reserved") return undefined;
    return {
      room: selection.roomName,
      date: selection.date,
      startTime: selection.startTime,
      endTime: selection.endTime,
      purpose: "연습",
      memo: ""
    };
  }, [selection]);

  async function saveReservation(values: Record<string, string>) {
    await saveAction.run("createReservation", { reservation: mapReservationInput(values, data) });
    setSelection(null);
    setSelectionResetKey((value) => value + 1);
  }

  const mobileCards: MobileListCard[] = data.reservations.map((item) => ({
    id: item.id,
    title: item.roomName || roomName(data, item.roomId),
    subtitle: `${item.requester || item.studentName || "예약자 미등록"} · ${formatReservationTime(item.startsAt, item.endsAt)}`,
    status: <Badge>{item.status || "확인 필요"}</Badge>,
    meta: [<span key="memo">메모: {item.memo || "-"}</span>]
  }));

  return (
    <AppShell area="practice-rooms">
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="max-w-3xl">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">강의실/연습실 예약</h1>
            <p className="mt-2 text-[15px] leading-6 text-muted">
              방과 시간을 직접 눌러 예약 가능 여부를 확인합니다. 예약 가능한 슬롯을 선택하면 아래 등록 폼에 공간과 시간이 자동으로 채워집니다.
            </p>
          </div>
          <RoomReservationBoard data={data} onSelectionChange={setSelection} key={selectionResetKey} />
          {selection ? (
            <div className="rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 text-sm font-semibold text-brand">
              <p>
                선택됨: {selection.roomName} · {selection.date} {selection.startTime} ~ {selection.endTime} · {selection.status === "reserved" ? "예약됨" : "예약 가능"}
              </p>
              {selection.status === "available" && canReserveRoom ? (
                <a className="mt-3 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white" href="#reservation-form">
                  예약 정보 입력하기
                </a>
              ) : (
                <p className="mt-2 text-xs text-brand">이미 예약된 시간입니다. 다른 슬롯을 선택해주세요.</p>
              )}
            </div>
          ) : null}
        </section>

        <ResourcePage
          title="예약 목록과 등록"
          description={source === "server" || source === "test" ? "Version.3 서버의 공간/예약 데이터를 표시합니다." : source === "live" ? "전환 세션의 공간/예약 데이터를 표시합니다." : source === "fallback" ? "공간/예약 데이터를 불러오지 못했습니다. 서버 연결과 권한을 확인해야 합니다." : "Preview 데이터로 공간 예약 화면을 점검합니다."}
          headers={["공간", "예약자", "사용 시간", "상태", "메모"]}
          mobileCards={mobileCards}
          initialValues={reservationInitialValues}
          rows={data.reservations.map((item) => [
            item.roomName || roomName(data, item.roomId),
            item.requester || item.studentName || "-",
            formatReservationTime(item.startsAt, item.endsAt),
            <Badge key={item.id}>{item.status || "확인 필요"}</Badge>,
            item.memo || "-"
          ])}
          emptyTitle="표시할 예약 정보가 없습니다"
          emptyDescription="실사용 세션이 없거나 서버 응답에 예약 데이터가 없으면 이곳은 비어 있을 수 있습니다."
          onSubmit={canReserveRoom ? saveReservation : undefined}
          submitDisabled={saveAction.pending}
          submitLabel={saveAction.pending ? "저장 중" : "예약 저장"}
          submitHelp="공간은 이름 또는 ID로 입력할 수 있습니다. Version.3 서버는 같은 시간대 중복 예약을 거부합니다."
          formId="reservation-form"
          showForm={canReserveRoom}
          fields={[
            { label: "공간명 또는 ID", name: "room" },
            { label: "사용일", name: "date", type: "date" },
            { label: "시작 시간(HH:00)", name: "startTime" },
            { label: "종료 시간(HH:00)", name: "endTime" },
            { label: "목적", name: "purpose", type: "select", options: reservationPurposeOptions },
            { label: "메모", name: "memo", type: "textarea" }
          ]}
        />
      </div>
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
