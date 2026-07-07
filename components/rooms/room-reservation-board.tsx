"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { OperationsData } from "@/lib/operations-data";

export type RoomReservationSelection = {
  roomId: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  reservationId?: string;
  status: "available" | "reserved";
};

type RoomReservationBoardProps = {
  data: Pick<OperationsData, "rooms" | "reservations" | "students">;
  date?: string;
  roomMode?: "all" | "lesson" | "practice";
  startHour?: number;
  endHour?: number;
  onSelectionChange?: (selection: RoomReservationSelection | null) => void;
};

type Slot = {
  roomId: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  reservationId?: string;
  reserved: boolean;
  label: string;
  detail: string;
};

const CANCELED_STATUSES = new Set(["취소", "canceled", "cancelled", "cancel"]);

export function RoomReservationBoard({
  data,
  date,
  roomMode = "all",
  startHour = 9,
  endHour = 22,
  onSelectionChange
}: RoomReservationBoardProps) {
  const [selectedDate, setSelectedDate] = useState(date ?? todayInSeoul());
  const [selectedRoomMode, setSelectedRoomMode] = useState(roomMode);
  const [timeFilter, setTimeFilter] = useState<"all" | "morning" | "afternoon" | "evening">("all");
  const visibleRooms = useMemo(() => filterRooms(data.rooms, selectedRoomMode), [data.rooms, selectedRoomMode]);
  const hours = useMemo(() => filterHours(buildHours(startHour, endHour), timeFilter), [startHour, endHour, timeFilter]);
  const reservationsByRoomTime = useMemo(() => indexReservations(data), [data]);
  const [selected, setSelected] = useState<RoomReservationSelection | null>(null);

  function clearSelection() {
    setSelected(null);
    onSelectionChange?.(null);
  }

  function selectSlot(slot: Slot) {
    const nextSelection: RoomReservationSelection = {
      roomId: slot.roomId,
      roomName: slot.roomName,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      reservationId: slot.reservationId,
      status: slot.reserved ? "reserved" : "available"
    };

    setSelected(nextSelection);
    onSelectionChange?.(nextSelection);
  }

  return (
    <section className="space-y-4" aria-label="강의실 및 연습실 예약 보드">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-ink">공간 시간표</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {selectedDate} 기준입니다. 방 카드와 시간 슬롯을 눌러 예약 가능 여부를 확인합니다.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-success">예약 가능</span>
          <span className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-brand">예약됨</span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 shadow-card lg:hidden">
        <div className="grid gap-3">
          <label>
            <span className="text-xs font-extrabold text-muted">사용일</span>
            <input
              className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm font-bold outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                clearSelection();
              }}
            />
          </label>
          <SegmentedControl
            label="공간"
            options={[
              { value: "all", label: "전체" },
              { value: "lesson", label: "강의실" },
              { value: "practice", label: "연습실" }
            ]}
            value={selectedRoomMode}
            onChange={(value) => {
              setSelectedRoomMode(value as typeof selectedRoomMode);
              clearSelection();
            }}
          />
          <SegmentedControl
            label="시간대"
            options={[
              { value: "all", label: "전체" },
              { value: "morning", label: "오전" },
              { value: "afternoon", label: "오후" },
              { value: "evening", label: "저녁" }
            ]}
            value={timeFilter}
            onChange={(value) => {
              setTimeFilter(value as typeof timeFilter);
              clearSelection();
            }}
          />
        </div>
      </div>

      {visibleRooms.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleRooms.map((room) => {
          const roomSlots = hours.map((hour) => {
            const reservation = reservationsByRoomTime.get(slotKey(room.id, selectedDate, hour));
            const requester = reservation ? reservation.requester || reservation.studentName || studentName(data, reservation.studentId) : "";
            return {
              roomId: room.id,
              roomName: room.name,
              date: selectedDate,
              startTime: hour,
              endTime: nextHour(hour),
              reservationId: reservation?.id,
              reserved: Boolean(reservation),
              label: reservation ? reservation.memo || "예약됨" : "예약 가능",
              detail: reservation ? requester || reservation.status || "-" : `${hour} 시작`
            };
          });

          const reservedCount = roomSlots.filter((slot) => slot.reserved).length;

          return (
            <article key={room.id} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <button
                className="flex w-full items-start justify-between gap-3 bg-surface-muted px-4 py-4 text-left transition hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-brand/20"
                onClick={() => {
                  const firstOpenSlot = roomSlots.find((slot) => !slot.reserved) ?? roomSlots[0];
                  selectSlot(firstOpenSlot);
                }}
                type="button"
              >
                <span>
                  <span className="block text-base font-extrabold text-ink">{room.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {room.location || "위치 미등록"} · 정원 {room.capacity || 1}명 · {room.status || "상태 미등록"}
                  </span>
                </span>
                <Badge tone={reservedCount ? "warn" : "good"}>{reservedCount}건</Badge>
              </button>

              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                {roomSlots.map((slot) => {
                  const active = selected?.roomId === slot.roomId && selected.date === slot.date && selected.startTime === slot.startTime;
                  return (
                    <button
                      className={[
                        "min-h-20 rounded-xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-brand/20",
                        slot.reserved
                          ? "border-brand/15 bg-brand/5 text-brand hover:bg-brand/10"
                          : "border-success/20 bg-success/10 text-success hover:bg-success/15",
                        active ? "ring-2 ring-brand/25" : ""
                      ].join(" ")}
                      key={`${room.id}-${slot.startTime}`}
                      onClick={() => selectSlot(slot)}
                      type="button"
                    >
                      <time className="block text-sm font-extrabold">{slot.startTime}</time>
                      <span className="mt-1 block truncate text-xs font-bold">{slot.label}</span>
                      <span className="mt-1 block truncate text-[11px] opacity-80">{slot.detail}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
          })}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-muted">
          <p className="font-bold text-ink">표시할 강의실 또는 연습실이 없습니다.</p>
          <p className="mt-2">위의 날짜, 공간, 시간대 필터는 그대로 사용할 수 있습니다. 다른 조건을 선택해 다시 확인해 주세요.</p>
        </section>
      )}

      <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
        <p className="text-sm font-extrabold text-ink">선택 내용</p>
        {selected ? (
          <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2 lg:grid-cols-4">
            <SelectionItem label="공간" value={selected.roomName} />
            <SelectionItem label="날짜" value={selected.date} />
            <SelectionItem label="시간" value={`${selected.startTime} ~ ${selected.endTime}`} />
            <SelectionItem label="상태" value={selected.status === "reserved" ? "예약됨" : "예약 가능"} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">방 카드 또는 시간 슬롯을 선택하면 여기에 표시합니다.</p>
        )}
      </div>

      {selected ? (
        <div className="sticky bottom-[5.75rem] z-20 rounded-2xl border border-brand/15 bg-white p-3 shadow-[0_16px_40px_rgba(60,6,8,0.14)] lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-ink">{selected.roomName}</p>
              <p className="text-xs font-bold text-muted">
                {selected.startTime} ~ {selected.endTime} · {selected.status === "reserved" ? "예약됨" : "예약 가능"}
              </p>
            </div>
            {selected.status === "available" ? (
              <a className="shrink-0 rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white" href="#reservation-form">
                입력
              </a>
            ) : (
              <span className="shrink-0 rounded-xl bg-brand/5 px-3 py-2 text-xs font-extrabold text-brand">불가</span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold text-muted">{label}</p>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            className={`rounded-xl border px-3 py-2 text-xs font-extrabold ${value === option.value ? "border-brand bg-brand text-white" : "border-line bg-surface-muted text-muted"}`}
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-2">
      <span className="block text-[11px] font-bold text-muted">{label}</span>
      <span className="mt-1 block font-bold text-ink">{value}</span>
    </div>
  );
}

function filterRooms(dataRooms: OperationsData["rooms"], roomMode: "all" | "lesson" | "practice") {
  if (roomMode === "all") return dataRooms;
  const keywords = roomMode === "lesson" ? ["강의", "레슨", "보컬", "피아노", "합주", "lesson"] : ["연습", "practice"];
  return dataRooms.filter((room) => {
    const text = `${room.id} ${room.name} ${room.location}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  });
}

function indexReservations(data: Pick<OperationsData, "reservations">) {
  const map = new Map<string, OperationsData["reservations"][number]>();

  data.reservations.forEach((reservation) => {
    if (!isActiveReservation(reservation.status)) return;

    const date = datePart(reservation.startsAt);
    const time = timePart(reservation.startsAt);
    if (!reservation.roomId || !date || !time) return;

    map.set(slotKey(reservation.roomId, date, time), reservation);
  });

  return map;
}

function isActiveReservation(status: string) {
  return !CANCELED_STATUSES.has(status.trim().toLowerCase());
}

function studentName(data: Pick<OperationsData, "students">, studentId: string) {
  return data.students.find((student) => student.id === studentId)?.name || "";
}

function buildHours(startHour: number, endHour: number) {
  const start = Math.max(0, Math.min(23, Math.floor(startHour)));
  const end = Math.max(start + 1, Math.min(24, Math.floor(endHour)));
  return Array.from({ length: end - start }, (_, index) => formatHour(start + index));
}

function filterHours(hours: string[], timeFilter: "all" | "morning" | "afternoon" | "evening") {
  if (timeFilter === "all") return hours;
  return hours.filter((time) => {
    const hour = Number(time.slice(0, 2));
    if (timeFilter === "morning") return hour < 12;
    if (timeFilter === "afternoon") return hour >= 12 && hour < 18;
    return hour >= 18;
  });
}

function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function datePart(value: string) {
  return value.includes("T") ? value.slice(0, 10) : value;
}

function timePart(value: string) {
  if (!value) return "";
  const time = value.includes("T") ? value.split("T")[1] : value;
  return time ? time.slice(0, 5) : "";
}

function nextHour(value: string) {
  const hour = Number(value.slice(0, 2));
  return Number.isFinite(hour) ? formatHour(hour + 1) : value;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function slotKey(roomId: string, date: string, time: string) {
  return `${roomId}|${date}|${time}`;
}
