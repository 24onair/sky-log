"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import { getUser } from "@/lib/supabase/auth";
import { createWaypointSet } from "@/lib/supabase/waypointSets";
import { Waypoint } from "@/lib/schemas/task";
import { parseCUP } from "@/lib/utils/parseCUP";
import { parseWPT } from "@/lib/utils/parseWPT";
import { assignWaypointTypes } from "@/lib/utils/taskUtils";
import { ChevronLeft, Upload, Globe, Lock, Trash2, CheckCircle2, MapPin, Plus } from "lucide-react";

const TaskMap = dynamic(() => import("@/components/TaskMap").then((m) => m.TaskMap), { ssr: false });

const label = { fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.48)", display: "block", marginBottom: 5 } as React.CSSProperties;
const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

export default function NewWaypointSetPage() {
  const router = useRouter();
  const [name, setName] = useState("새 웨이포인트 세트");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setParseError(null);
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    let parsed: Waypoint[] = [];
    if (ext === "cup") parsed = parseCUP(text);
    else if (ext === "wpt") parsed = parseWPT(text);
    else { setParseError("CUP 또는 WPT 파일을 선택하세요"); return; }
    if (parsed.length === 0) { setParseError("웨이포인트를 찾을 수 없습니다"); return; }
    // Assign types by position and merge
    const merged = assignWaypointTypes([...waypoints, ...parsed]);
    setWaypoints(merged);
    if (!name || name === "새 웨이포인트 세트") {
      setName(file.name.replace(/\.[^.]+$/, ""));
    }
    setSheetExpanded(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const addWaypoint = useCallback((lat: number, lon: number) => {
    setWaypoints((prev) => {
      const draft = [...prev, { id: uuid(), name: `WP${prev.length + 1}`, lat, lon, altitude: 0, radius: 400, type: "T" as const }];
      return assignWaypointTypes(draft);
    });
  }, []);

  const moveWaypoint = useCallback((id: string, lat: number, lon: number) => {
    setWaypoints((prev) => prev.map((wp) => wp.id === id ? { ...wp, lat, lon } : wp));
  }, []);

  const removeWaypoint = (id: string) => {
    setWaypoints((prev) => assignWaypointTypes(prev.filter((wp) => wp.id !== id)));
  };

  const handleSave = async () => {
    if (waypoints.length === 0) { setError("웨이포인트를 1개 이상 추가하세요"); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const user = await getUser();
      if (!user) { router.push("/auth/login"); return; }
      await createWaypointSet(user.id, { name, description: description || null, is_public: isPublic, waypoints });
      router.push("/waypoints");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ height: "calc(100dvh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @media (min-width: 768px) {
          .ws-layout { flex-direction: row !important; }
          .ws-map { flex: 1 !important; height: 100% !important; min-height: 0 !important; }
          .ws-sidebar { width: 360px !important; height: 100% !important; max-height: none !important; border-top: none !important; border-left: 1px solid rgba(0,0,0,0.08) !important; flex-shrink: 0 !important; }
          .ws-toggle { display: none !important; }
        }
        @media (max-width: 767px) {
          .ws-sidebar.collapsed { max-height: 72px !important; }
          .ws-sidebar.expanded { max-height: 65vh !important; }
        }
      `}</style>

      <div className="ws-layout" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Map */}
        <div className="ws-map" style={{ flex: 1, position: "relative", minHeight: "40vh" }}>
          <TaskMap
            waypoints={waypoints}
            isAddMode={isAddMode}
            onMapClick={addWaypoint}
            onWaypointMove={moveWaypoint}
          />
          {/* Back */}
          <div style={{ position: "absolute", top: 12, left: 12 }}>
            <Link href="/waypoints" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "6px 12px 6px 8px", boxShadow: "0 1px 8px rgba(0,0,0,0.12)", fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}>
              <ChevronLeft size={14} strokeWidth={2} />웨이포인트 세트
            </Link>
          </div>
          {/* Add mode hint */}
          {isAddMode && (
            <div style={{ position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, background: "rgba(0,113,227,0.92)", borderRadius: 20, padding: "7px 10px 7px 18px", whiteSpace: "nowrap", zIndex: 200 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>탭하여 포인트 추가</p>
              <button onClick={() => setIsAddMode(false)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "none", cursor: "pointer", borderRadius: 14, padding: "5px 12px", fontSize: 13, fontWeight: 600, color: "#0071e3" }}>
                <CheckCircle2 size={13} strokeWidth={2.5} />완료
              </button>
            </div>
          )}
          {/* FAB */}
          <button
            onClick={() => setIsAddMode((v) => !v)}
            style={{ position: "absolute", bottom: 16, right: 16, width: 52, height: 52, borderRadius: "50%", background: isAddMode ? "#34c759" : "#0071e3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.24)", zIndex: 200 }}
          >
            {isAddMode ? <CheckCircle2 size={20} strokeWidth={2} style={{ color: "#fff" }} /> : <Plus size={22} strokeWidth={2.5} style={{ color: "#fff" }} />}
          </button>
        </div>

        {/* Sidebar */}
        <div className={`ws-sidebar ${sheetExpanded ? "expanded" : "collapsed"}`} style={{ background: "#f5f5f7", overflowY: "auto", borderTop: "1px solid rgba(0,0,0,0.1)", transition: "max-height 0.3s ease" }}>
          <button className="ws-toggle" onClick={() => setSheetExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>{waypoints.length}개 웨이포인트</span>
            <span style={{ fontSize: 12, color: "#0071e3" }}>{sheetExpanded ? "접기" : "펼치기"}</span>
          </button>

          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Meta */}
            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <p style={secHead}>세트 정보</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={label}>세트 이름</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="sk-input" />
                </div>
                <div>
                  <label style={label}>설명 (선택)</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 문경 대회용 웨이포인트" className="sk-input" />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[false, true].map((pub) => (
                    <button key={String(pub)} onClick={() => setIsPublic(pub)} style={{ flex: 1, padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: isPublic === pub ? "#1d1d1f" : "#fff", color: isPublic === pub ? "#fff" : "rgba(0,0,0,0.56)", boxShadow: isPublic !== pub ? "rgba(0,0,0,0.08) 0 1px 6px" : "none", transition: "all 0.15s" }}>
                      {pub ? <><Globe size={13} strokeWidth={1.5} />공개</> : <><Lock size={13} strokeWidth={1.5} />나만 보기</>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* File import */}
            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <p style={secHead}>파일 가져오기</p>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{ border: "1.5px dashed rgba(0,113,227,0.35)", borderRadius: 10, padding: "20px", textAlign: "center", cursor: "pointer", background: "rgba(0,113,227,0.03)" }}
              >
                <Upload size={20} strokeWidth={1.5} style={{ color: "#0071e3", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13, color: "rgba(0,0,0,0.5)" }}>CUP / WPT 파일 드래그 또는 클릭</p>
                <p style={{ fontSize: 11, color: "rgba(0,0,0,0.3)", marginTop: 4 }}>기존 웨이포인트에 추가됩니다</p>
              </div>
              <input ref={fileRef} type="file" accept=".cup,.wpt" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              {parseError && <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 8 }}>{parseError}</p>}
            </div>

            {/* Waypoint list */}
            {waypoints.length > 0 && (
              <div className="sk-card" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={secHead}>웨이포인트 ({waypoints.length})</p>
                  <button onClick={() => setIsAddMode((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: isAddMode ? "#34c759" : "rgba(0,113,227,0.1)", color: isAddMode ? "#fff" : "#0071e3" }}>
                    <MapPin size={12} />지도에서 추가
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                  {waypoints.map((wp, i) => (
                    <div key={wp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#636366", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>{i + 1}</span>
                      <input
                        type="text"
                        value={wp.name}
                        onChange={(e) => setWaypoints((prev) => prev.map((w) => w.id === wp.id ? { ...w, name: e.target.value } : w))}
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#1d1d1f", fontWeight: 500 }}
                      />
                      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", flexShrink: 0 }}>{wp.radius}m</span>
                      <button onClick={() => removeWaypoint(wp.id)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.28)", flexShrink: 0 }}>
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "10px 14px" }}><p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p></div>}

            <button onClick={handleSave} disabled={isSubmitting} className="sk-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, borderRadius: 12, opacity: isSubmitting ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              {isSubmitting ? "저장 중..." : "세트 저장"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
