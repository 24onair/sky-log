import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

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
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5f5f7" }}>
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
      </body>
    </html>
  );
}
