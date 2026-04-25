"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import { getWaypointSetById, updateWaypointSet, deleteWaypointSet } from "@/lib/supabase/waypointSets";
import { waypointsToCUP } from "@/lib/utils/parseCUP";
import { assignWaypointTypes } from "@/lib/utils/taskUtils";
import { WaypointSet } from "@/lib/schemas/waypointSet";
import { Waypoint } from "@/lib/schemas/task";
import { ChevronLeft, Globe, Lock, Trash2, Download, CheckCircle2, MapPin, Plus, Save } from "lucide-react";

const TaskMap = dynamic(() => import("@/components/TaskMap").then((m) => m.TaskMap), { ssr: false });

const label = { fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.48)", display: "block", marginBottom: 5 } as React.CSSProperties;
const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

export default function WaypointSetDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [set, setSet] = useState<WaypointSet | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(true);

  useEffect(() => {
    getUser().then(async (u) => {
      if (!u) { router.push("/auth/login"); return; }
      setUserId(u.id);
      const data = await getWaypointSetById(u.id, id);
      if (!data) { router.push("/waypoints"); return; }
      setSet(data);
      setWaypoints(data.waypoints);
      setName(data.name);
      setDescription(data.description ?? "");
      setIsPublic(data.is_public);
      setLoading(false);
    });
  }, [id, router]);

  const isOwn = !!set && !!userId && set.user_id === userId;

  const markDirty = () => setIsDirty(true);

  const addWaypoint = useCallback((lat: number, lon: number) => {
    if (!isOwn) return;
    setWaypoints((prev) => {
      const draft = [...prev, { id: crypto.randomUUID(), name: `WP${prev.length + 1}`, lat, lon, altitude: 0, radius: 400, type: "T" as const }];
      return assignWaypointTypes(draft);
    });
    markDirty();
  }, [isOwn]);

  const moveWaypoint = useCallback((wpId: string, lat: number, lon: number) => {
    if (!isOwn) return;
    setWaypoints((prev) => prev.map((wp) => wp.id === wpId ? { ...wp, lat, lon } : wp));
    markDirty();
  }, [isOwn]);

  const removeWaypoint = (wpId: string) => {
    setWaypoints((prev) => assignWaypointTypes(prev.filter((wp) => wp.id !== wpId)));
    markDirty();
  };

  const handleSave = async () => {
    if (!userId || !set || !isOwn) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateWaypointSet(userId, set.id, { name, description: description || null, is_public: isPublic, waypoints });
      setIsDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !set || !isOwn) return;
    if (!confirm(`"${set.name}" 세트를 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    try {
      await deleteWaypointSet(userId, set.id);
      router.push("/waypoints");
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
      setIsDeleting(false);
    }
  };

  const handleDownloadCUP = () => {
    if (!set) return;
    const content = waypointsToCUP(name, waypoints);
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.cup`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return (
    <div style={{ minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ height: "calc(100dvh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @media (min-width: 768px) {
          .wsd-layout { flex-direction: row !important; }
          .wsd-map { flex: 1 !important; height: 100% !important; min-height: 0 !important; }
          .wsd-sidebar { width: 360px !important; height: 100% !important; max-height: none !important; border-top: none !important; border-left: 1px solid rgba(0,0,0,0.08) !important; flex-shrink: 0 !important; }
          .wsd-toggle { display: none !important; }
        }
        @media (max-width: 767px) {
          .wsd-sidebar.collapsed { max-height: 72px !important; }
          .wsd-sidebar.expanded { max-height: 65vh !important; }
        }
      `}</style>

      <div className="wsd-layout" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Map */}
        <div className="wsd-map" style={{ flex: 1, position: "relative", minHeight: "40vh" }}>
          <TaskMap
            waypoints={waypoints}
            isAddMode={isAddMode && isOwn}
            onMapClick={addWaypoint}
            onWaypointMove={moveWaypoint}
          />
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <Link href="/waypoints" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "6px 12px 6px 8px", boxShadow: "0 1px 8px rgba(0,0,0,0.12)", fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}>
              <ChevronLeft size={14} strokeWidth={2} />웨이포인트 세트
            </Link>
            <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: 12, padding: "8px 14px", boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{name}</p>
              <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>{waypoints.length}개 웨이포인트</p>
            </div>
          </div>
          {isOwn && isAddMode && (
            <div style={{ position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, background: "rgba(0,113,227,0.92)", borderRadius: 20, padding: "7px 10px 7px 18px", whiteSpace: "nowrap", zIndex: 200 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>탭하여 포인트 추가</p>
              <button onClick={() => setIsAddMode(false)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "none", cursor: "pointer", borderRadius: 14, padding: "5px 12px", fontSize: 13, fontWeight: 600, color: "#0071e3" }}>
                <CheckCircle2 size={13} strokeWidth={2.5} />완료
              </button>
            </div>
          )}
          {isOwn && (
            <button onClick={() => setIsAddMode((v) => !v)} style={{ position: "absolute", bottom: 16, right: 16, width: 52, height: 52, borderRadius: "50%", background: isAddMode ? "#34c759" : "#0071e3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.24)", zIndex: 200 }}>
              {isAddMode ? <CheckCircle2 size={20} strokeWidth={2} style={{ color: "#fff" }} /> : <Plus size={22} strokeWidth={2.5} style={{ color: "#fff" }} />}
            </button>
          )}
        </div>

        {/* Sidebar */}
        <div className={`wsd-sidebar ${sheetExpanded ? "expanded" : "collapsed"}`} style={{ background: "#f5f5f7", overflowY: "auto", borderTop: "1px solid rgba(0,0,0,0.1)", transition: "max-height 0.3s ease" }}>
          <button className="wsd-toggle" onClick={() => setSheetExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>{waypoints.length}개 웨이포인트{isDirty ? " •" : ""}</span>
            <span style={{ fontSize: 12, color: "#0071e3" }}>{sheetExpanded ? "접기" : "펼치기"}</span>
          </button>

          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Meta */}
            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <p style={secHead}>세트 정보</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isOwn ? (
                  <>
                    <div>
                      <label style={label}>세트 이름</label>
                      <input type="text" value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} className="sk-input" />
                    </div>
                    <div>
                      <label style={label}>설명 (선택)</label>
                      <input type="text" value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} placeholder="e.g. 문경 대회용 웨이포인트" className="sk-input" />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[false, true].map((pub) => (
                        <button key={String(pub)} onClick={() => { setIsPublic(pub); markDirty(); }} style={{ flex: 1, padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: isPublic === pub ? "#1d1d1f" : "#fff", color: isPublic === pub ? "#fff" : "rgba(0,0,0,0.56)", boxShadow: isPublic !== pub ? "rgba(0,0,0,0.08) 0 1px 6px" : "none", transition: "all 0.15s" }}>
                          {pub ? <><Globe size={13} strokeWidth={1.5} />공개</> : <><Lock size={13} strokeWidth={1.5} />나만 보기</>}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>{name}</p>
                    {description && <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginTop: 4 }}>{description}</p>}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, background: "rgba(0,113,227,0.08)", borderRadius: 6, padding: "3px 8px" }}>
                      <Globe size={11} strokeWidth={1.5} style={{ color: "#0071e3" }} />
                      <span style={{ fontSize: 11, color: "#0071e3", fontWeight: 600 }}>공개 세트</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Waypoint list */}
            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={secHead}>웨이포인트 ({waypoints.length})</p>
                {isOwn && (
                  <button onClick={() => setIsAddMode((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: isAddMode ? "#34c759" : "rgba(0,113,227,0.1)", color: isAddMode ? "#fff" : "#0071e3" }}>
                    <MapPin size={12} />지도에서 추가
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                {waypoints.map((wp, i) => (
                  <div key={wp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#636366", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>{i + 1}</span>
                    {isOwn ? (
                      <input
                        type="text"
                        value={wp.name}
                        onChange={(e) => { setWaypoints((prev) => prev.map((w) => w.id === wp.id ? { ...w, name: e.target.value } : w)); markDirty(); }}
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1d1d1f", fontWeight: 500 }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1d1d1f" }}>{wp.name}</span>
                    )}
                    <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", flexShrink: 0 }}>{wp.radius}m</span>
                    {isOwn && (
                      <button onClick={() => removeWaypoint(wp.id)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.28)", flexShrink: 0 }}>
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "10px 14px" }}><p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p></div>}

            {/* Actions */}
            <button onClick={handleDownloadCUP} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: "#fff", border: "none", cursor: "pointer", color: "#1d1d1f", boxShadow: "rgba(0,0,0,0.08) 0 1px 6px" }}>
              <Download size={14} strokeWidth={1.5} />CUP 다운로드
            </button>

            {isOwn && (
              <>
                <button onClick={handleSave} disabled={isSaving || !isDirty} className="sk-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, borderRadius: 12, opacity: (isSaving || !isDirty) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                  <Save size={15} strokeWidth={1.5} />
                  {isSaving ? "저장 중..." : "변경사항 저장"}
                </button>
                <button onClick={handleDelete} disabled={isDeleting} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: "rgba(255,59,48,0.07)", border: "none", cursor: "pointer", color: "#ff3b30", opacity: isDeleting ? 0.5 : 1 }}>
                  <Trash2 size={14} strokeWidth={1.5} />세트 삭제
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
