import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "본성뮤직 통합 관리 시스템 Version.3",
  description: "대표, 매니저, 강사, 수강생을 위한 본성뮤직 실제 운영 관리 시스템"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
