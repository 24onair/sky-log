"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import { ChevronLeft, Image, Users, MapPin } from "lucide-react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await getUser();
      if (!user) { router.push("/auth/login"); return; }
      if (user.email !== ADMIN_EMAIL) { router.push("/"); return; }
      setLoading(false);
      // 미승인 회원 수 조회
      try {
        const res = await fetch("/api/admin/members");
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.filter((p: { is_active: boolean | null }) => !p.is_active).length);
        }
      } catch { /* ignore */ }
      try {
        const res = await fetch("/api/admin/tasks");
        if (res.ok) { const data = await res.json(); setTaskCount(data.length); }
      } catch { /* ignore */ }
    };
    init();
  }, [router]);

  if (loading) return (
    <div style={{ minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "20px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/tasks" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}>
            <ChevronLeft size={15} strokeWidth={2} />타스크
          </Link>
          <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>관리자</span>
        </div>

        {/* Menu */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/admin/members" style={{ textDecoration: "none" }}>
            <div className="sk-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(52,199,89,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users size={20} strokeWidth={1.5} style={{ color: "#34c759" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>회원 관리</p>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", margin: "2px 0 0" }}>신청 확인 및 계정 활성화</p>
              </div>
              {pendingCount !== null && pendingCount > 0 && (
                <span style={{ background: "#ff3b30", color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 12, padding: "3px 9px" }}>
                  {pendingCount}
                </span>
              )}
            </div>
          </Link>

          <Link href="/admin/tasks" style={{ textDecoration: "none" }}>
            <div className="sk-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,149,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MapPin size={20} strokeWidth={1.5} style={{ color: "#ff9500" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>타스크 관리</p>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", margin: "2px 0 0" }}>전체 타스크 조회 및 삭제</p>
              </div>
              {taskCount !== null && (
                <span style={{ fontSize: 12, color: "rgba(0,0,0,0.35)", fontWeight: 500 }}>{taskCount}개</span>
              )}
            </div>
          </Link>

          <Link href="/admin/banners" style={{ textDecoration: "none" }}>
            <div className="sk-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,113,227,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Image size={20} strokeWidth={1.5} style={{ color: "#0071e3" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>배너 광고 관리</p>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", margin: "2px 0 0" }}>광고 이미지 등록 및 노출 관리</p>
              </div>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
