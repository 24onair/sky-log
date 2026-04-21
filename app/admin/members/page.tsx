"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import { ChevronLeft, UserCheck, UserX, User } from "lucide-react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";

interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  nickname: string | null;
  wing_brand: string | null;
  wing_name: string | null;
  wing_grade: string | null;
  is_active: boolean | null;
  created_at: string;
}

const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

export default function AdminMembersPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "active">("all");

  useEffect(() => {
    const init = async () => {
      const user = await getUser();
      if (!user) { router.push("/auth/login"); return; }
      if (user.email !== ADMIN_EMAIL) { router.push("/"); return; }
      await load();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "로드 실패");
      setProfiles(json as Profile[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (profile: Profile) => {
    const next = !profile.is_active;
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profile.id, is_active: next }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "업데이트 실패"); }
      setProfiles((prev) => prev.map((p) => p.id === profile.id ? { ...p, is_active: next } : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "업데이트 실패");
    }
  };

  const filtered = profiles.filter((p) => {
    if (filter === "pending") return !p.is_active;
    if (filter === "active") return p.is_active;
    return true;
  });

  const pendingCount = profiles.filter((p) => !p.is_active).length;

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
          <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}>
            <ChevronLeft size={15} strokeWidth={2} />관리자
          </Link>
          <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>회원 관리</span>
          {pendingCount > 0 && (
            <span style={{ marginLeft: 4, background: "#ff3b30", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 7px" }}>
              {pendingCount}
            </span>
          )}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "pending", "active"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
                background: filter === f ? "#1d1d1f" : "rgba(0,0,0,0.07)",
                color: filter === f ? "#fff" : "rgba(0,0,0,0.6)",
              }}
            >
              {{ all: `전체 ${profiles.length}`, pending: `미승인 ${pendingCount}`, active: `활성 ${profiles.length - pendingCount}` }[f]}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p>
          </div>
        )}

        {/* Member list */}
        <div className="sk-card" style={{ padding: "16px" }}>
          <p style={secHead}>회원 목록 ({filtered.length})</p>
          {filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", textAlign: "center", padding: "16px 0" }}>해당하는 회원이 없습니다</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((p) => (
                <div
                  key={p.id}
                  style={{
                    borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", padding: "12px 14px",
                    background: p.is_active ? "#fff" : "rgba(255,59,48,0.03)",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: p.is_active ? "rgba(52,199,89,0.12)" : "rgba(0,0,0,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <User size={16} strokeWidth={1.5} style={{ color: p.is_active ? "#34c759" : "rgba(0,0,0,0.3)" }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>{p.name || "–"}</span>
                      {p.nickname && <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>({p.nickname})</span>}
                      {!p.is_active && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#ff3b30", background: "rgba(255,59,48,0.1)", borderRadius: 4, padding: "1px 5px" }}>미승인</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</p>
                    {(p.wing_brand || p.wing_name) && (
                      <p style={{ fontSize: 11, color: "rgba(0,0,0,0.36)", margin: "2px 0 0" }}>
                        {[p.wing_brand, p.wing_name, p.wing_grade].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.28)", margin: "2px 0 0" }}>
                      {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      {p.phone && ` · ${p.phone}`}
                    </p>
                  </div>

                  {/* Toggle button */}
                  <button
                    onClick={() => handleToggle(p)}
                    title={p.is_active ? "비활성화" : "승인 (활성화)"}
                    style={{
                      flexShrink: 0, padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: p.is_active ? "rgba(255,59,48,0.08)" : "rgba(52,199,89,0.1)",
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 12, fontWeight: 500,
                      color: p.is_active ? "#ff3b30" : "#34c759",
                    }}
                  >
                    {p.is_active
                      ? <><UserX size={13} strokeWidth={1.5} />비활성</>
                      : <><UserCheck size={13} strokeWidth={1.5} />승인</>
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SQL hint */}
        <div style={{ background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.15)", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0071e3", letterSpacing: "0.06em", marginBottom: 6 }}>SUPABASE 설정 안내</p>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.56)", lineHeight: 1.6 }}>
            profiles 테이블에 <code style={{ background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "1px 4px" }}>is_active</code> 컬럼이 없다면 아래 SQL을 실행하세요.
          </p>
          <pre style={{ fontSize: 11, background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: "8px 10px", marginTop: 8, overflowX: "auto", color: "#1d1d1f", lineHeight: 1.5 }}>
{`alter table public.profiles
  add column if not exists is_active boolean default false;

-- 기존 회원 전원 활성화 (선택)
-- update public.profiles set is_active = true;

-- 관리자가 모든 프로필 조회·수정 가능하도록 policy 추가
create policy "admin_all" on public.profiles
  for all using (true) with check (true);`}
          </pre>
        </div>

      </div>
    </div>
  );
}
