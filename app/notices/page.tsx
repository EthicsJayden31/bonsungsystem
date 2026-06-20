import { AppShell } from "@/components/layout/app-shell";
import { ResourcePage } from "@/components/layout/resource-page";
import { notices } from "@/lib/demo-data";

export default function NoticesPage() {
  return (
    <AppShell area="notices">
      <ResourcePage
        title="공지/문서"
        description="내부 공지, 강사 매뉴얼, 환불 기준, 출결 기준 같은 운영 문서를 관리합니다."
        headers={["제목", "분류", "작성자", "수정일", "내용"]}
        rows={notices.map((notice) => [notice.title, notice.category, notice.author, notice.updatedAt, notice.body])}
        fields={[
          { label: "제목", name: "title" },
          { label: "분류", name: "category", type: "select", options: ["공지", "운영규정", "강사매뉴얼", "환불기준", "출결기준"] },
          { label: "내용", name: "body", type: "textarea" }
        ]}
      />
    </AppShell>
  );
}
