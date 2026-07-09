import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "본성 스테이지 | 통합 관리 시스템 본성 스테이지",
  description: "Admin, Manager, Coach, Artist를 위한 본성뮤직아카데미 운영 관리 시스템"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
