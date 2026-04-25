"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import { getWaypointSets, deleteWaypointSet } from "@/lib/supabase/waypointSets";
import { waypointsToCUP } from "@/lib/utils/parseCUP";
import { WaypointSet } from "@/lib/schemas/waypointSet";
import { Globe, Lock, Plus, Trash2, Map, Download, Navigation } from "lucide-react";

const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

export default function WaypointsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sets, setSets] = useState<WaypointSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUser().then((u) => {
      if (!u) { router.push("/auth/login"); return; }
      setUserId(u.id);
      getWaypointSets(u.id)
        .then(setSets)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    });
  }, [router]);

  const handleDelete = async (set: WaypointSet) => {
    if (!userId) return;
    if (!confirm(`"${set.name}" 세트를 삭제하시겠습니까?`)) return;
    setDeletingId(set.id);
    try {
      await deleteWaypointSet(userId, set.id);
      setSets((prev) => prev.filter((s) => s.id !== set.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadCUP = (set: WaypointSet) => {
    const content = waypointsToCUP(set.name, set.waypoints);
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${set.name}.cup`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return (
    <div style={{ minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const mine = sets.filter((s) => s.user_id === userId);
  const others = sets.filter((s) => s.user_id !== userId);

  return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "20px 16px 40px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Navigation size={18} strokeWidth={1.5} style={{ color: "#0071e3" }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f" }}>웨이포인트 세트</h1>
          </div>
          <Link
            href="/waypoints/new"
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 20, fontSize: 13, background: "#0071e3", color: "#fff", textDecoration: "none", fontWeight: 600 }}
          >
            <Plus size={14} strokeWidth={2} />새 세트
          </Link>
        </div>

        {error && (
          <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p>
          </div>
        )}

        {/* My sets */}
        <div className="sk-card" style={{ padding: "16px" }}>
          <p style={secHead}>내 세트 ({mine.length})</p>
          {mine.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", marginBottom: 12 }}>아직 세트가 없습니다</p>
              <Link href="/waypoints/new" style={{ fontSize: 13, color: "#0071e3", fontWeight: 600, textDecoration: "none" }}>
                + 첫 세트 만들기
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mine.map((s) => (
                <SetCard
                  key={s.id}
                  set={s}
                  isOwn
                  isDeleting={deletingId === s.id}
                  onDelete={() => handleDelete(s)}
                  onDownload={() => handleDownloadCUP(s)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Public sets by others */}
        {others.length > 0 && (
          <div className="sk-card" style={{ padding: "16px" }}>
            <p style={secHead}>공개 세트 ({others.length})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {others.map((s) => (
                <SetCard
                  key={s.id}
                  set={s}
                  isOwn={false}
                  isDeleting={false}
                  onDelete={() => {}}
                  onDownload={() => handleDownloadCUP(s)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SetCard({ set, isOwn, isDeleting, onDelete, onDownload }: {
  set: WaypointSet;
  isOwn: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <div style={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", padding: "12px 14px", background: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
      {/* Public/Private */}
      <div style={{ flexShrink: 0 }}>
        {set.is_public
          ? <Globe size={14} strokeWidth={1.5} style={{ color: "#0071e3" }} />
          : <Lock size={14} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.25)" }} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{set.name}</p>
        <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>
          {set.waypoints.length}개 웨이포인트
          {set.description && ` · ${set.description}`}
        </p>
      </div>

      {/* Actions */}
      <Link
        href={`/waypoints/${set.id}`}
        style={{ flexShrink: 0, padding: 6, borderRadius: 6, display: "flex", alignItems: "center", color: "#0071e3", textDecoration: "none", background: "rgba(0,113,227,0.08)" }}
        title="지도에서 보기"
      >
        <Map size={14} strokeWidth={1.5} />
      </Link>
      <button
        onClick={onDownload}
        style={{ flexShrink: 0, padding: 6, borderRadius: 6, border: "none", background: "rgba(0,0,0,0.05)", cursor: "pointer", display: "flex", alignItems: "center" }}
        title="CUP 다운로드"
      >
        <Download size={14} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.5)" }} />
      </button>
      {isOwn && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          style={{ flexShrink: 0, padding: 6, borderRadius: 6, border: "none", background: "rgba(255,59,48,0.07)", cursor: "pointer", display: "flex", alignItems: "center", opacity: isDeleting ? 0.5 : 1 }}
          title="삭제"
        >
          <Trash2 size={14} strokeWidth={1.5} style={{ color: "#ff3b30" }} />
        </button>
      )}
    </div>
  );
}
