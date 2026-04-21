"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import { ChevronLeft, Trash2, ExternalLink, Globe, Lock } from "lucide-react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";

interface AdminTask {
  id: string;
  name: string;
  task_date: string;
  task_type: string;
  is_public: boolean;
  distance_km: number | null;
  created_at: string;
  user_id: string;
  profiles: { email: string; name: string } | null;
}

const TYPE_LABEL: Record<string, string> = { RACE: "RACE", CLASSIC: "CLASSIC", FAI: "FAI" };
const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<AdminTask[]>([]);
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
      const res = await fetch("/api/admin/tasks");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "로드 실패");
      setTasks(json as AdminTask[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (task: AdminTask) => {
    if (!confirm(`"${task.name}" 타스크를 삭제하시겠습니까?`)) return;
    setDeletingId(task.id);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "삭제 실패"); }
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = tasks.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.profiles?.name ?? "").toLowerCase().includes(q) ||
      (t.profiles?.email ?? "").toLowerCase().includes(q)
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
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>타스크 관리</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(0,0,0,0.4)" }}>총 {tasks.length}개</span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="타스크명 / 회원 이름 / 이메일 검색"
          className="sk-input"
          style={{ background: "#fff" }}
        />

        {error && (
          <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p>
          </div>
        )}

        {/* Task list */}
        <div className="sk-card" style={{ padding: "16px" }}>
          <p style={secHead}>타스크 목록 ({filtered.length})</p>
          {filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", textAlign: "center", padding: "16px 0" }}>타스크가 없습니다</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map((t) => (
                <div
                  key={t.id}
                  style={{
                    borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)",
                    padding: "11px 14px", background: "#fff",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  {/* Public/Private icon */}
                  <div style={{ flexShrink: 0 }}>
                    {t.is_public
                      ? <Globe size={14} strokeWidth={1.5} style={{ color: "#0071e3" }} />
                      : <Lock size={14} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.25)" }} />
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.35)", background: "rgba(0,0,0,0.06)", borderRadius: 4, padding: "1px 5px" }}>{TYPE_LABEL[t.task_type]}</span>
                      {t.distance_km != null && (
                        <span style={{ flexShrink: 0, fontSize: 11, color: "rgba(0,0,0,0.4)" }}>{t.distance_km.toFixed(1)} km</span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", margin: 0 }}>
                      {t.task_date} · {t.profiles?.name ?? "–"} ({t.profiles?.email ?? t.user_id.slice(0, 8)})
                    </p>
                  </div>

                  {/* Open link */}
                  <Link
                    href={`/tasks/${t.id}`}
                    target="_blank"
                    style={{ flexShrink: 0, padding: 6, borderRadius: 6, display: "flex", alignItems: "center", color: "rgba(0,0,0,0.3)", textDecoration: "none" }}
                  >
                    <ExternalLink size={14} strokeWidth={1.5} />
                  </Link>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={deletingId === t.id}
                    style={{
                      flexShrink: 0, padding: 6, borderRadius: 6, border: "none",
                      background: "rgba(255,59,48,0.07)", cursor: "pointer",
                      display: "flex", alignItems: "center",
                      opacity: deletingId === t.id ? 0.5 : 1,
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
