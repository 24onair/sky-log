import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import dynamic from "next/dynamic";

const AnnouncementPopup = dynamic(() => import("@/components/AnnouncementPopup"), { ssr: false });

export const metadata: Metadata = {
  title: "Sky Log — 패러글라이딩 비행 로그",
  description: "패러글라이딩 비행 기록을 관리하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" style={{ minHeight: "100%" }}>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FFFFFF" }}>
        <Navbar />
        <AnnouncementPopup />
        {/* On mobile, bottom tab bar is 60px + safe area — give content room */}
        <main style={{ flex: 1 }} className="sk-main-content">{children}</main>
        <style>{`
          @media (max-width: 767px) {
            .sk-main-content { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
          }
        `}</style>
      </body>
    </html>
  );
}
