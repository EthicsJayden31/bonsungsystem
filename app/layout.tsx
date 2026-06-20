import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "본성뮤직 인트라넷",
  description: "본성뮤직 아카데미 내부 운영 시스템"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
