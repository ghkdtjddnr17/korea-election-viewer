import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { localityIndex } from "@/lib/locality-index";

export const metadata: Metadata = {
  title: "2026 지방선거 — 후보·정당 정보",
  description:
    "제9회 전국동시지방선거(2026.06.03) 후보·정당 정보 정리. 선관위·NESDC·언론 1차 출처 기반.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const regions = localityIndex();
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header regions={regions} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
