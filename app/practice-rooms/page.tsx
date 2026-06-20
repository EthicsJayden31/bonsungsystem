import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { Badge } from "@/components/ui/badge";
import { getStudentName, reservations, rooms } from "@/lib/demo-data";

export default function PracticeRoomsPage() {
  return (
    <AppShell area="practice-rooms">
      <ResourcePage
        title="연습실 예약"
        description="연습실 목록과 예약 시간, 예약 상태, 취소/노쇼 메모를 관리합니다."
        headers={["연습실", "예약자", "사용 시간", "상태", "메모"]}
        rows={reservations.map((item) => [rooms.find((room) => room.id === item.roomId)?.name ?? "-", getStudentName(item.studentId), `${new Date(item.startsAt).toLocaleString("ko-KR")} ~ ${new Date(item.endsAt).toLocaleTimeString("ko-KR")}`, <Badge key={item.id}>{item.status}</Badge>, item.memo || "-"])}
        fields={[
          { label: "연습실", name: "room" },
          { label: "예약자", name: "requester" },
          { label: "사용일", name: "date", type: "date" },
          { label: "예약 상태", name: "status", type: "select", options: ["예약", "사용완료", "취소", "노쇼"] },
          { label: "노쇼/취소 메모", name: "memo", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
