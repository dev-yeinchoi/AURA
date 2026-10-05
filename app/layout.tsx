import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * 제목·설명에 조건명이나 단계명을 넣지 않는다(CLAUDE.md 규칙 6).
 */
export const metadata: Metadata = {
  title: "AURA",
  description: "연구용 판단 과제",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
