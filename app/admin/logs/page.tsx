"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import { ChevronLeft, Trash2, ExternalLink, Clock, Navigation } from "lucide-react";
import { formatDuration } from "@/lib/utils/format";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";

interface AdminLog {
  id: string;
  user_id: string;
  flight_date: string;
  duration_sec: number;
  distance_xcontest_km: number | null;
  distance_straight_km: number | null;
  site_id: string | null;
  memo: string | null;
  igc_parsed: boolean;
  created_at: string;
  profiles: { email: string; name: string } | null;
}

const secHead = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
  color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10,
};

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const res = await fetch("/api/admin/logs");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "로드 실패");
      setLogs(json as AdminLog[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (log: AdminLog) => {
    const memberName = log.profiles?.name ?? log.user_id.slice(0, 8);
    if (!confirm(`${memberName}의 ${log.flight_date} 비행 로그를 삭제하시겠습니까?`)) return;
    setDeletingId(log.id);
    try {
      const res = await fetch("/api/admin/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: log.id }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "삭제 실패"); }
      setLogs((prev) => prev.filter((l) => l.id !== log.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.profiles?.name ?? "").toLowerCase().includes(q) ||
      (l.profiles?.email ?? "").toLowerCase().includes(q) ||
      l.flight_date.includes(q)
    );
  });

  if (loading) return (
    <div style={{ minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "20px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}>
            <ChevronLeft size={15} strokeWidth={2} />관리자
          </Link>
          <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>로그 관리</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(0,0,0,0.4)" }}>총 {logs.length}개</span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="회원 이름 / 이메일 / 날짜 검색"
          className="sk-input"
          style={{ background: "#fff" }}
        />

        {error && (
          <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p>
          </div>
        )}

        {/* Log list */}
        <div className="sk-card" style={{ padding: "16px" }}>
          <p style={secHead}>비행 로그 목록 ({filtered.length})</p>
          {filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", textAlign: "center", padding: "16px 0" }}>로그가 없습니다</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map((l) => (
                <div
                  key={l.id}
                  style={{
                    borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)",
                    padding: "11px 14px", background: "#fff",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
                        {l.flight_date}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                        <Clock size={11} strokeWidth={1.5} />
                        {formatDuration(l.duration_sec)}
                      </span>
                      {l.distance_xcontest_km != null && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                          <Navigation size={11} strokeWidth={1.5} />
                          {l.distance_xcontest_km.toFixed(1)} km
                        </span>
                      )}
                      {l.igc_parsed && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#34c759", background: "rgba(52,199,89,0.1)", borderRadius: 4, padding: "1px 5px" }}>
                          IGC
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", margin: 0 }}>
                      {l.profiles?.name ?? "–"} ({l.profiles?.email ?? l.user_id.slice(0, 8)})
                    </p>
                  </div>

                  {/* Open link */}
                  <Link
                    href={`/logbook/${l.id}`}
                    target="_blank"
                    style={{ flexShrink: 0, padding: 6, borderRadius: 6, display: "flex", alignItems: "center", color: "rgba(0,0,0,0.3)", textDecoration: "none" }}
                  >
                    <ExternalLink size={14} strokeWidth={1.5} />
                  </Link>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(l)}
                    disabled={deletingId === l.id}
                    style={{
                      flexShrink: 0, padding: 6, borderRadius: 6, border: "none",
                      background: "rgba(255,59,48,0.07)", cursor: "pointer",
                      display: "flex", alignItems: "center",
                      opacity: deletingId === l.id ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={14} strokeWidth={1.5} style={{ color: "#ff3b30" }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
