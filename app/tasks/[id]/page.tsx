"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import { getUser } from "@/lib/supabase/auth";
import { getTaskById, updateTask, deleteTask } from "@/lib/supabase/tasks";
import { Task, Waypoint, TaskType, TaskInsert } from "@/lib/schemas/task";
import {
  calculateTaskDistance, assignWaypointTypes, defaultRadius,
  autoName, waypointColor, exportToCUP, exportToXCTrack,
  downloadBlob, circlePolygon,
} from "@/lib/utils/taskUtils";
const TaskElevationProfile = dynamic(
  () => import("@/components/TaskElevationProfile").then(m => m.TaskElevationProfile),
  { ssr: false }
);
import {
  ChevronLeft, Plus, Minus, Trash2, Lock, Globe,
  Navigation, Download, QrCode, ChevronUp, ChevronDown,
  MapPin, CheckCircle2, Pencil,
} from "lucide-react";
import QRCodeLib from "qrcode";

const TaskMap = dynamic(
  () => import("@/components/TaskMap").then((m) => m.TaskMap),
  { ssr: false }
);

// Re-use the same radius presets and task types
const TASK_TYPES: TaskType[] = ["RACE", "CLASSIC", "FAI"];
const RADIUS_PRESETS = [200, 400, 1000, 2000, 3000, 5000];

const label = { fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.48)", display: "block", marginBottom: 5 } as React.CSSProperties;
const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

interface PageProps { params: Promise<{ id: string }>; }

export default function TaskDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [taskId, setTaskId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [task, setTask] = useState<TaskInsert | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [editingWpId, setEditingWpId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const init = async () => {
      const p = await params;
      setTaskId(p.id);
      const user = await getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      try {
        const loaded = await getTaskById(user.id, p.id);
        if (!loaded) { router.push("/tasks"); return; }
        setIsOwner(loaded.user_id === user.id);
        setTask({
          name: loaded.name, task_date: loaded.task_date, task_type: loaded.task_type,
          is_public: loaded.is_public, waypoints: loaded.waypoints, distance_km: loaded.distance_km,
        });
        setIsDirty(false);
      } catch { router.push("/tasks"); }
      finally { setLoading(false); }
    };
    init();
  }, [params, router]);

  const updateField = <K extends keyof TaskInsert>(k: K, v: TaskInsert[K]) => {
    setTask((p) => p ? { ...p, [k]: v } : p);
    setIsDirty(true);
  };

  const addWaypoint = useCallback((lat: number, lon: number) => {
    setTask((prev) => {
      if (!prev) return prev;
      const draft = [...prev.waypoints, { id: uuid(), name: "", lat, lon, altitude: 0, radius: 400, type: "T" as const }];
      const assigned = assignWaypointTypes(draft).map((wp, i) => ({
        ...wp, name: wp.name || autoName(wp.type, i),
        radius: wp.radius === 400 && wp.type === "T" ? defaultRadius("T") : wp.radius,
      }));
      return { ...prev, waypoints: assigned, distance_km: calculateTaskDistance(assigned) };
    });
    setIsDirty(true);
    setIsAddMode(false);
  }, []);

  const moveWaypoint = useCallback((id: string, lat: number, lon: number) => {
    setTask((prev) => {
      if (!prev) return prev;
      const wps = prev.waypoints.map((wp) => wp.id === id ? { ...wp, lat, lon } : wp);
      return { ...prev, waypoints: wps, distance_km: calculateTaskDistance(wps) };
    });
    setIsDirty(true);
  }, []);

  const removeWaypoint = (id: string) => {
    setTask((prev) => {
      if (!prev) return prev;
      const wps = assignWaypointTypes(prev.waypoints.filter((wp) => wp.id !== id));
      return { ...prev, waypoints: wps, distance_km: calculateTaskDistance(wps) };
    });
    setIsDirty(true);
  };

  const setWpRadius = (id: string, radius: number) => {
    setTask((prev) => {
      if (!prev) return prev;
      const wps = prev.waypoints.map((wp) => wp.id === id ? { ...wp, radius } : wp);
      return { ...prev, waypoints: wps, distance_km: calculateTaskDistance(wps) };
    });
    setIsDirty(true);
  };

  const setWpName = (id: string, name: string) => {
    setTask((prev) => prev ? { ...prev, waypoints: prev.waypoints.map((wp) => wp.id === id ? { ...wp, name } : wp) } : prev);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!userId || !task || !taskId) return;
    if (task.waypoints.length < 2) { setError("웨이포인트를 2개 이상 추가하세요"); return; }
    setIsSubmitting(true); setError(null);
    try {
      await updateTask(userId, taskId, task);
      setIsSaved(true);
      setIsDirty(false);
      setTimeout(() => router.push("/tasks"), 800);
    } catch (e) { setError(e instanceof Error ? e.message : "저장 실패"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!userId || !confirm("타스크를 삭제하시겠습니까?")) return;
    try { await deleteTask(userId, taskId); router.push("/tasks"); }
    catch (e) { setError(e instanceof Error ? e.message : "삭제 실패"); }
  };

  const handleShowQR = async () => {
    if (!task) return;
    try {
      const url = await QRCodeLib.toDataURL(exportToXCTrack(task, false), { width: 360, margin: 3, errorCorrectionLevel: "L", color: { dark: "#1d1d1f", light: "#ffffff" } });
      setQrDataUrl(url); setShowQr(true);
    } catch { setError("QR 생성 실패"); }
  };

  if (loading || !task) return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const distanceDisplay = task.distance_km != null && task.distance_km > 0
    ? `${task.distance_km.toFixed(1)} km` : task.waypoints.length >= 2 ? "0.0 km" : "—";

  return (
    <div style={{ height: "calc(100dvh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @media (min-width: 768px) {
          .task-layout { flex-direction: row !important; }
          .task-map-area { flex: 1 !important; height: 100% !important; min-height: 0 !important; }
          .task-sidebar { width: 380px !important; height: 100% !important; max-height: none !important; border-top: none !important; border-left: 1px solid rgba(0,0,0,0.08) !important; flex-shrink: 0 !important; }
          .sheet-toggle { display: none !important; }
        }
        @media (max-width: 767px) {
          .task-sidebar.collapsed { max-height: 88px !important; }
          .task-sidebar.expanded { max-height: 62vh !important; }
        }
      `}</style>

      <div className="task-layout" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* MAP */}
        <div className="task-map-area" style={{ flex: 1, position: "relative", minHeight: "40vh" }}>
          <TaskMap waypoints={task.waypoints} isAddMode={isAddMode} onMapClick={addWaypoint} onWaypointMove={moveWaypoint} onWaypointClick={setEditingWpId} />

          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
            <Link href="/tasks" style={{ pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "6px 12px 6px 8px", boxShadow: "0 1px 8px rgba(0,0,0,0.12)", fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}>
              <ChevronLeft size={14} strokeWidth={2} />타스크
            </Link>
            <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: 12, padding: "8px 14px", boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 2 }}>{task.name}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#0071e3", letterSpacing: "-0.5px", lineHeight: 1 }}>{distanceDisplay}<span style={{ fontSize: 11, fontWeight: 400, color: "rgba(0,0,0,0.4)", marginLeft: 4 }}>써클 경계 기준</span></p>
            </div>
          </div>

          {isAddMode && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,113,227,0.9)", borderRadius: 16, padding: "12px 20px", pointerEvents: "none" }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#fff", textAlign: "center" }}>지도를 탭하여 웨이포인트 추가</p>
            </div>
          )}

          {isOwner && (
            <button onClick={() => setIsAddMode((v) => !v)} style={{ position: "absolute", bottom: task.waypoints.length >= 2 ? 148 : 16, right: 16, width: 52, height: 52, borderRadius: "50%", background: isAddMode ? "#ff3b30" : "#0071e3", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.24)", transition: "background 0.2s, bottom 0.3s", zIndex: 10 }}>
              {isAddMode ? <Minus size={22} strokeWidth={2.5} style={{ color: "#fff" }} /> : <Plus size={22} strokeWidth={2.5} style={{ color: "#fff" }} />}
            </button>
          )}

          {task.waypoints.length > 0 && (
            <div style={{ position: "absolute", bottom: task.waypoints.length >= 2 ? 148 : 16, left: 12, display: "flex", gap: 8, flexWrap: "wrap", pointerEvents: "none" }}>
              {[{ color: "#34c759", label: "이륙" }, { color: "#0071e3", label: "전환점" }, { color: "#ff3b30", label: "도착" }].map(({ color, label: lbl }) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "4px 9px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} /><span style={{ fontSize: 11, fontWeight: 500, color: "#1d1d1f" }}>{lbl}</span>
                </div>
              ))}
            </div>
          )}

          {/* Terrain elevation profile */}
          <TaskElevationProfile waypoints={task.waypoints} />
        </div>

        {/* SIDEBAR */}
        <div className={`task-sidebar ${sheetExpanded ? "expanded" : "collapsed"}`} style={{ background: "#f5f5f7", overflowY: "auto", borderTop: "1px solid rgba(0,0,0,0.1)", transition: "max-height 0.3s ease" }}>
          <button className="sheet-toggle" onClick={() => setSheetExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Navigation size={14} strokeWidth={1.5} style={{ color: "#0071e3" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>{task.waypoints.length}개 웨이포인트</span>
              {task.distance_km != null && task.distance_km > 0 && <span style={{ fontSize: 13, color: "#0071e3", fontWeight: 500 }}>{task.distance_km.toFixed(1)} km</span>}
            </div>
            {sheetExpanded ? <ChevronDown size={16} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.4)" }} /> : <ChevronUp size={16} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.4)" }} />}
          </button>

          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <p style={secHead}>타스크 정보</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={label}>타스크 이름</label>
                  <input type="text" value={task.name} onChange={(e) => updateField("name", e.target.value)} className="sk-input" disabled={!isOwner} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={label}>날짜</label>
                    <input type="date" value={task.task_date} onChange={(e) => updateField("task_date", e.target.value)} className="sk-input" disabled={!isOwner} />
                  </div>
                  <div>
                    <label style={label}>타입</label>
                    <select value={task.task_type} onChange={(e) => updateField("task_type", e.target.value as TaskType)} className="sk-input" style={{ cursor: "pointer" }} disabled={!isOwner}>
                      {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {isOwner && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {[false, true].map((pub) => (
                      <button key={String(pub)} onClick={() => updateField("is_public", pub)} style={{ flex: 1, padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: task.is_public === pub ? "#1d1d1f" : "#fff", color: task.is_public === pub ? "#fff" : "rgba(0,0,0,0.56)", boxShadow: task.is_public !== pub ? "rgba(0,0,0,0.08) 0 1px 6px" : "none", transition: "all 0.15s" }}>
                        {pub ? <><Globe size={13} strokeWidth={1.5} />공개</> : <><Lock size={13} strokeWidth={1.5} />나만 보기</>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={secHead}>웨이포인트</p>
                {isOwner && (
                  <button onClick={() => setIsAddMode((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: isAddMode ? "rgba(255,59,48,0.1)" : "rgba(0,113,227,0.1)", color: isAddMode ? "#ff3b30" : "#0071e3" }}>
                    {isAddMode ? <><Minus size={12} />추가 취소</> : <><MapPin size={12} />지도에서 추가</>}
                  </button>
                )}
              </div>
              {task.waypoints.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", textAlign: "center", padding: "12px 0" }}>웨이포인트가 없습니다</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {task.waypoints.map((wp) => (
                    <WaypointRow key={wp.id} wp={wp} isEditing={editingWpId === wp.id} onToggleEdit={() => setEditingWpId((id) => id === wp.id ? null : wp.id)} onNameChange={(n) => setWpName(wp.id, n)} onRadiusChange={(r) => setWpRadius(wp.id, r)} onDelete={() => removeWaypoint(wp.id)} disabled={!isOwner} />
                  ))}
                </div>
              )}
            </div>

            {error && <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "10px 14px" }}><p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p></div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isOwner && (
                <button onClick={handleSave} disabled={isSubmitting || isSaved || !isDirty} className="sk-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, borderRadius: 12, opacity: (isSubmitting || !isDirty) ? 0.4 : 1, display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.2s" }}>
                  {isSaved ? <><CheckCircle2 size={16} strokeWidth={1.5} />저장됨</> : isSubmitting ? "저장 중..." : "변경사항 저장"}
                </button>
              )}

              {task.waypoints.length >= 2 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => downloadBlob(exportToCUP(task), `${task.name}.cup`, "text/plain")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "#fff", border: "none", cursor: "pointer", color: "#1d1d1f", boxShadow: "rgba(0,0,0,0.08) 0 1px 6px" }}>
                    <Download size={13} strokeWidth={1.5} />CUP
                  </button>
                  <button onClick={() => downloadBlob(exportToXCTrack(task), `${task.name}.xctsk`, "application/json")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "#fff", border: "none", cursor: "pointer", color: "#1d1d1f", boxShadow: "rgba(0,0,0,0.08) 0 1px 6px" }}>
                    <Download size={13} strokeWidth={1.5} />XCTrack
                  </button>
                  <button onClick={handleShowQR} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "#fff", border: "none", cursor: "pointer", color: "#0071e3", boxShadow: "rgba(0,0,0,0.08) 0 1px 6px" }}>
                    <QrCode size={13} strokeWidth={1.5} />QR
                  </button>
                </div>
              )}

              {isOwner && (
                <button onClick={handleDelete} style={{ width: "100%", padding: "9px", borderRadius: 10, fontSize: 13, background: "rgba(255,59,48,0.06)", color: "#ff3b30", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Trash2 size={13} strokeWidth={1.5} />타스크 삭제
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showQr && qrDataUrl && (
        <div onClick={() => setShowQr(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", textAlign: "center", maxWidth: 320, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>XCTrack QR</h3>
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.48)", marginBottom: 20 }}>XCTrack 앱으로 스캔하면 타스크가 바로 열립니다</p>
            <img src={qrDataUrl} alt="QR Code" style={{ width: 240, height: 240, borderRadius: 12, margin: "0 auto" }} />
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.36)", marginTop: 16 }}>{task.name}</p>
            <button onClick={() => setShowQr(false)} className="sk-btn-primary" style={{ marginTop: 20, width: "100%", justifyContent: "center", padding: "11px", borderRadius: 10, fontSize: 14 }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WaypointRow({ wp, isEditing, onToggleEdit, onNameChange, onRadiusChange, onDelete, disabled }: { wp: Waypoint; isEditing: boolean; onToggleEdit: () => void; onNameChange: (n: string) => void; onRadiusChange: (r: number) => void; onDelete: () => void; disabled?: boolean; }) {
  const color = waypointColor(wp.type);
  const typeLabel = wp.type === "D" ? "이륙" : wp.type === "G" ? "도착" : "전환";
  const [inputVal, setInputVal] = useState(String(wp.radius));

  useEffect(() => { setInputVal(String(wp.radius)); }, [wp.radius]);

  const handleInputCommit = (raw: string) => {
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 50 && v <= 50000) onRadiusChange(v);
    else setInputVal(String(wp.radius));
  };

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
      <div onClick={onToggleEdit} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", cursor: "pointer" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.04em", flexShrink: 0 }}>{typeLabel}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#1d1d1f", flex: 1 }}>{wp.name}</span>
        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>{wp.radius >= 1000 ? `${(wp.radius / 1000).toFixed(wp.radius % 1000 === 0 ? 0 : 1)}km` : `${wp.radius}m`}</span>
        {!disabled && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.28)", flexShrink: 0 }}><Trash2 size={13} strokeWidth={1.5} /></button>}
      </div>
      {isEditing && !disabled && (
        <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.02)", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ ...label, marginBottom: 4 }}>이름</label>
            <input type="text" value={wp.name} onChange={(e) => onNameChange(e.target.value)} className="sk-input" style={{ fontSize: 13 }} onClick={(e) => e.stopPropagation()} />
          </div>
          <div>
            <label style={{ ...label, marginBottom: 6 }}>반경</label>
            {/* Slider + number input */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
              <input
                type="range"
                min={50} max={10000} step={50}
                value={Math.min(wp.radius, 10000)}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#0071e3", cursor: "pointer" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <input
                  type="number"
                  value={inputVal}
                  min={50} max={50000} step={50}
                  onChange={(e) => setInputVal(e.target.value)}
                  onBlur={(e) => handleInputCommit(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInputCommit(inputVal); }}
                  onClick={(e) => e.stopPropagation()}
                  className="sk-input"
                  style={{ width: 72, fontSize: 13, textAlign: "right", padding: "5px 6px" }}
                />
                <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>m</span>
              </div>
            </div>
            {/* Preset chips */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {RADIUS_PRESETS.map((r) => (
                <button key={r} onClick={(e) => { e.stopPropagation(); onRadiusChange(r); }} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: wp.radius === r ? "#0071e3" : "rgba(0,0,0,0.06)", color: wp.radius === r ? "#fff" : "#1d1d1f", transition: "all 0.1s" }}>
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
