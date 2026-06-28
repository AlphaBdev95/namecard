import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "요청함",
  title: "요청함 — 팀 간 업무 요청 인박스",
  description: "전화·카톡으로 받던 요청이 사라지지 않게. 완료될 때까지 목록에 남습니다.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "요청함",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#EEF1F6",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
