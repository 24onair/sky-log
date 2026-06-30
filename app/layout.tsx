import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import AnnouncementPopup from "@/components/AnnouncementPopup";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://soarline.app"),
  title: "Soarline — 하늘에 라인을 긋다",
  description:
    "웨이포인트 없이도 자유롭게 비행 타스크를 그리고, 저장하고, 공유하세요. 그리고 당신의 모든 비행을 한 곳에 기록합니다.",
  openGraph: {
    title: "Soarline — Draw your line in the sky.",
    description: "패러글라이딩 비행 타스크를 그리고, 저장하고, 공유하고, 기록하세요.",
    url: "https://soarline.app",
    siteName: "Soarline",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={spaceGrotesk.variable} style={{ minHeight: "100%" }}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
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
