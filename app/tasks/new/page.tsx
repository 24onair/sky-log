"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import { getUser } from "@/lib/supabase/auth";
import { createTask } from "@/lib/supabase/tasks";
import { Waypoint, TaskInsert, TaskType } from "@/lib/schemas/task";
import {
  calculateTaskDistance,
  assignWaypointTypes,
  defaultRadius,
  autoName,
  waypointColor,
  exportToCUP,
  exportToXCTrack,
  downloadBlob,
} from "@/lib/utils/taskUtils";

interface GeoResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lon, lat]
}
import {
  ChevronLeft, Plus, Minus, Trash2, Lock, Globe,
  Navigation, Download, QrCode, ChevronUp, ChevronDown,
  MapPin, CheckCircle2, Search, X,
} from "lucide-react";
import QRCodeLib from "qrcode";

const TaskMap = dynamic(
  () => import("@/components/TaskMap").then((m) => m.TaskMap),
  { ssr: false }
);

// ── style helpers ──────────────────────────────────────────────────────────
const label = { fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.48)", display: "block", marginBottom: 5 } as React.CSSProperties;
const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

const TASK_TYPES: TaskType[] = ["RACE", "CLASSIC", "FAI"];
const RADIUS_PRESETS = [200, 400, 1000, 2000, 3000, 5000];

// ── default task state ─────────────────────────────────────────────────────
const blankTask = (): TaskInsert => ({
  name: "새 타스크",
  task_date: new Date().toISOString().slice(0, 10),
  task_type: "RACE",
  is_public: false,
  waypoints: [],
  distance_km: null,
});

export default function NewTaskPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [task, setTask] = useState<TaskInsert>(blankTask());
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [editingWpId, setEditingWpId] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getUser().then((u) => {
      if (!u) router.push("/auth/login");
      else setUserId(u.id);
    });
  }, [router]);

  // ── search ─────────────────────────────────────────────────────────────
  const handleSearchInput = (q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&language=ko&limit=6&proximity=128.0,36.5`;
        const res = await fetch(url);
        const data = await res.json();
        const results: GeoResult[] = (data.features ?? []).map((f: { id: string; place_name: string; center: [number, number] }) => ({
          id: f.id,
          place_name: f.place_name,
          center: f.center,
        }));
        setSearchResults(results);
        // Auto-fly when exactly one result
        if (results.length === 1) {
          setFlyToTarget({ center: results[0].center, zoom: 13 });
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectResult = (r: GeoResult) => {
    setFlyToTarget({ center: r.center, zoom: 13 });
    setSearchQuery(r.place_name.split(",")[0].trim());
    setSearchResults([]);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };

  // ── waypoint actions ───────────────────────────────────────────────────
  const addWaypoint = useCallback((lat: number, lon: number) => {
    setTask((prev) => {
      const draft: Waypoint[] = [
        ...prev.waypoints,
        {
          id: uuid(),
          name: "",
          lat,
          lon,
          altitude: 0,
          radius: 400,
          type: "T",
        },
      ];
      const assigned = assignWaypointTypes(draft).map((wp, i) => ({
        ...wp,
        name: wp.name || autoName(wp.type, i),
        radius: wp.radius === 400 && wp.type === "T" ? defaultRadius("T") : wp.radius,
      }));
      return {
        ...prev,
        waypoints: assigned,
        distance_km: calculateTaskDistance(assigned),
      };
    });
    setIsAddMode(false); // exit add mode after each point on mobile
  }, []);

  const moveWaypoint = useCallback((id: string, lat: number, lon: number) => {
    setTask((prev) => {
      const wps = prev.waypoints.map((wp) =>
        wp.id === id ? { ...wp, lat, lon } : wp
      );
      return { ...prev, waypoints: wps, distance_km: calculateTaskDistance(wps) };
    });
  }, []);

  const removeWaypoint = (id: string) => {
    setTask((prev) => {
      const wps = assignWaypointTypes(
        prev.waypoints.filter((wp) => wp.id !== id)
      );
      return { ...prev, waypoints: wps, distance_km: calculateTaskDistance(wps) };
    });
  };

  const setWpRadius = (id: string, radius: number) => {
    setTask((prev) => {
      const wps = prev.waypoints.map((wp) =>
        wp.id === id ? { ...wp, radius } : wp
      );
      return { ...prev, waypoints: wps, distance_km: calculateTaskDistance(wps) };
    });
  };

  const setWpName = (id: string, name: string) => {
    setTask((prev) => ({
      ...prev,
      waypoints: prev.waypoints.map((wp) => (wp.id === id ? { ...wp, name } : wp)),
    }));
  };

  // ── save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!userId) { router.push("/auth/login"); return; }
    if (task.waypoints.length < 2) {
      setError("웨이포인트를 2개 이상 추가하세요");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createTask(userId, task);
      setIsSaved(true);
      setTimeout(() => router.push("/tasks"), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── export ─────────────────────────────────────────────────────────────
  const handleExportCUP = () => {
    downloadBlob(exportToCUP(task), `${task.name}.cup`, "text/plain");
  };

  const handleExportXCTrack = () => {
    downloadBlob(exportToXCTrack(task), `${task.name}.xctsk`, "application/json");
  };

  const handleShowQR = async () => {
    const json = exportToXCTrack(task);
    try {
      const url = await QRCodeLib.toDataURL(json, { width: 280, margin: 2, color: { dark: "#1d1d1f", light: "#ffffff" } });
      setQrDataUrl(url);
      setShowQr(true);
    } catch {
      setError("QR 생성 실패");
    }
  };

  const distanceDisplay =
    task.distance_km != null && task.distance_km > 0
      ? `${task.distance_km.toFixed(1)} km`
      : task.waypoints.length >= 2 ? "0.0 km" : "—";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "calc(100dvh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @media (min-width: 768px) {
          .task-layout { flex-direction: row !important; }
          .task-map-area { flex: 1 !important; height: 100% !important; min-height: 0 !important; }
          .task-sidebar { width: 380px !important; height: 100% !important; max-height: none !important; border-top: none !important; border-left: 1px solid rgba(0,0,0,0.08) !important; flex-shrink: 0 !important; }
          .sheet-toggle { display: none !important; }
          .fab-add { bottom: 32px !important; }
        }
        @media (max-width: 767px) {
          .task-sidebar.collapsed { max-height: 88px !important; }
          .task-sidebar.expanded { max-height: 62vh !important; }
        }
      `}</style>

      <div className="task-layout" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

        {/* ══ MAP AREA ══════════════════════════════════════════════════ */}
        <div className="task-map-area" style={{ flex: 1, position: "relative", minHeight: "40vh" }}>
          <TaskMap
            waypoints={task.waypoints}
            isAddMode={isAddMode}
            onMapClick={addWaypoint}
            onWaypointMove={moveWaypoint}
            onWaypointClick={setEditingWpId}
            flyToTarget={flyToTarget}
          />

          {/* Search overlay — top center */}
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 10, width: "min(300px, calc(100% - 200px))" }}>
            <div style={{ position: "relative" }}>
              <div style={{
                display: "flex", alignItems: "center",
                background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)",
                borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                border: searchOpen ? "1.5px solid rgba(0,113,227,0.4)" : "1.5px solid transparent",
                transition: "border-color 0.15s",
              }}>
                <Search size={14} strokeWidth={1.8} style={{ margin: "0 10px", color: "rgba(0,0,0,0.35)", flexShrink: 0 }} />
                <input
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  placeholder="지명 검색..."
                  style={{
                    flex: 1, border: "none", outline: "none", background: "transparent",
                    fontSize: 14, fontWeight: 500, color: "#1d1d1f",
                    padding: "10px 4px 10px 0",
                  }}
                />
                {isSearching && (
                  <div style={{ width: 14, height: 14, margin: "0 10px", border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite", flexShrink: 0 }} />
                )}
                {searchQuery && !isSearching && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); clearSearch(); }}
                    style={{ padding: "0 10px", background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center" }}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                )}
              </div>

              {/* Results dropdown */}
              {searchResults.length > 0 && searchOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0,
                  background: "#fff", borderRadius: 12,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
                  overflow: "hidden", zIndex: 20,
                }}>
                  {searchResults.map((r, i) => {
                    const [main, ...rest] = r.place_name.split(",");
                    return (
                      <button
                        key={r.id}
                        onMouseDown={() => handleSelectResult(r)}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "flex-start",
                          width: "100%", padding: "10px 14px", background: "none", border: "none",
                          cursor: "pointer", textAlign: "left",
                          borderBottom: i < searchResults.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,113,227,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{main.trim()}</span>
                        {rest.length > 0 && (
                          <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 1 }}>{rest.join(",").trim()}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Map top-left overlay: back + task name + distance */}
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
            <Link
              href="/tasks"
              style={{ pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "6px 12px 6px 8px", boxShadow: "0 1px 8px rgba(0,0,0,0.12)", fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}
            >
              <ChevronLeft size={14} strokeWidth={2} />
              타스크
            </Link>
            <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderRadius: 12, padding: "8px 14px", boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 2 }}>{task.name}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#0071e3", letterSpacing: "-0.5px", lineHeight: 1 }}>
                {distanceDisplay}
                <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(0,0,0,0.4)", marginLeft: 4 }}>써클 경계 기준</span>
              </p>
            </div>
          </div>

          {/* Add mode overlay hint */}
          {isAddMode && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,113,227,0.9)", borderRadius: 16, padding: "12px 20px", pointerEvents: "none" }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#fff", textAlign: "center" }}>지도를 탭하여 웨이포인트 추가</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 2 }}>취소하려면 아래 버튼을 다시 누르세요</p>
            </div>
          )}

          {/* FAB: add waypoint */}
          <button
            className="fab-add"
            onClick={() => setIsAddMode((v) => !v)}
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: isAddMode ? "#ff3b30" : "#0071e3",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,0.24)",
              transition: "background 0.2s",
              zIndex: 10,
            }}
          >
            {isAddMode
              ? <Minus size={22} strokeWidth={2.5} style={{ color: "#fff" }} />
              : <Plus size={22} strokeWidth={2.5} style={{ color: "#fff" }} />}
          </button>

          {/* Legend */}
          {task.waypoints.length > 0 && (
            <div style={{ position: "absolute", bottom: 16, left: 12, display: "flex", gap: 8, flexWrap: "wrap", pointerEvents: "none" }}>
              {[{ color: "#34c759", label: "이륙" }, { color: "#0071e3", label: "전환점" }, { color: "#ff3b30", label: "도착" }].map(({ color, label: lbl }) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "4px 9px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#1d1d1f" }}>{lbl}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══ SIDEBAR / BOTTOM SHEET ════════════════════════════════════ */}
        <div
          className={`task-sidebar ${sheetExpanded ? "expanded" : "collapsed"}`}
          style={{
            background: "#f5f5f7",
            overflowY: "auto",
            borderTop: "1px solid rgba(0,0,0,0.1)",
            transition: "max-height 0.3s ease",
          }}
        >
          {/* Mobile: sheet toggle handle */}
          <button
            className="sheet-toggle"
            onClick={() => setSheetExpanded((v) => !v)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Navigation size={14} strokeWidth={1.5} style={{ color: "#0071e3" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>
                {task.waypoints.length}개 웨이포인트
              </span>
              {task.distance_km != null && task.distance_km > 0 && (
                <span style={{ fontSize: 13, color: "#0071e3", fontWeight: 500 }}>{task.distance_km.toFixed(1)} km</span>
              )}
            </div>
            {sheetExpanded
              ? <ChevronDown size={16} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.4)" }} />
              : <ChevronUp size={16} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.4)" }} />}
          </button>

          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* ── Task meta ─────────────────────────────────────────── */}
            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <p style={secHead}>타스크 정보</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={label}>타스크 이름</label>
                  <input
                    type="text"
                    value={task.name}
                    onChange={(e) => setTask((p) => ({ ...p, name: e.target.value }))}
                    className="sk-input"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={label}>날짜</label>
                    <input
                      type="date"
                      value={task.task_date}
                      onChange={(e) => setTask((p) => ({ ...p, task_date: e.target.value }))}
                      className="sk-input"
                    />
                  </div>
                  <div>
                    <label style={label}>타입</label>
                    <select
                      value={task.task_type}
                      onChange={(e) => setTask((p) => ({ ...p, task_type: e.target.value as TaskType }))}
                      className="sk-input"
                      style={{ cursor: "pointer" }}
                    >
                      {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Public toggle */}
                <div style={{ display: "flex", gap: 6 }}>
                  {[false, true].map((pub) => (
                    <button
                      key={String(pub)}
                      onClick={() => setTask((p) => ({ ...p, is_public: pub }))}
                      style={{
                        flex: 1,
                        padding: "7px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        background: task.is_public === pub ? "#1d1d1f" : "#fff",
                        color: task.is_public === pub ? "#fff" : "rgba(0,0,0,0.56)",
                        boxShadow: task.is_public !== pub ? "rgba(0,0,0,0.08) 0 1px 6px" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {pub
                        ? <><Globe size={13} strokeWidth={1.5} />공개</>
                        : <><Lock size={13} strokeWidth={1.5} />나만 보기</>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Waypoints list ─────────────────────────────────────── */}
            <div className="sk-card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={secHead}>웨이포인트</p>
                <button
                  onClick={() => setIsAddMode((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: isAddMode ? "rgba(255,59,48,0.1)" : "rgba(0,113,227,0.1)",
                    color: isAddMode ? "#ff3b30" : "#0071e3",
                  }}
                >
                  {isAddMode ? <><Minus size={12} />추가 취소</> : <><MapPin size={12} />지도에서 추가</>}
                </button>
              </div>

              {task.waypoints.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>지도를 탭하거나 + 버튼을 눌러 웨이포인트를 추가하세요</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {task.waypoints.map((wp) => (
                    <WaypointRow
                      key={wp.id}
                      wp={wp}
                      isEditing={editingWpId === wp.id}
                      onToggleEdit={() => setEditingWpId((id) => id === wp.id ? null : wp.id)}
                      onNameChange={(n) => setWpName(wp.id, n)}
                      onRadiusChange={(r) => setWpRadius(wp.id, r)}
                      onDelete={() => removeWaypoint(wp.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Error ─────────────────────────────────────────────── */}
            {error && (
              <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p>
              </div>
            )}

            {/* ── Actions ───────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={isSubmitting || isSaved}
                className="sk-btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, borderRadius: 12, opacity: isSubmitting ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
              >
                {isSaved
                  ? <><CheckCircle2 size={16} strokeWidth={1.5} />저장됨</>
                  : isSubmitting ? "저장 중..." : "타스크 저장"}
              </button>

              {/* Export row */}
              {task.waypoints.length >= 2 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={handleExportCUP}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "#fff", border: "none", cursor: "pointer", color: "#1d1d1f", boxShadow: "rgba(0,0,0,0.08) 0 1px 6px" }}
                  >
                    <Download size={13} strokeWidth={1.5} />
                    CUP
                  </button>
                  <button
                    onClick={handleExportXCTrack}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "#fff", border: "none", cursor: "pointer", color: "#1d1d1f", boxShadow: "rgba(0,0,0,0.08) 0 1px 6px" }}
                  >
                    <Download size={13} strokeWidth={1.5} />
                    XCTrack
                  </button>
                  <button
                    onClick={handleShowQR}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "#fff", border: "none", cursor: "pointer", color: "#0071e3", boxShadow: "rgba(0,0,0,0.08) 0 1px 6px" }}
                  >
                    <QrCode size={13} strokeWidth={1.5} />
                    QR
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ QR Modal ══════════════════════════════════════════════════════ */}
      {showQr && qrDataUrl && (
        <div
          onClick={() => setShowQr(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", textAlign: "center", maxWidth: 320, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>XCTrack QR</h3>
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.48)", marginBottom: 20 }}>XCTrack 앱으로 스캔하면 타스크가 바로 열립니다</p>
            <img src={qrDataUrl} alt="QR Code" style={{ width: 240, height: 240, borderRadius: 12, margin: "0 auto" }} />
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.36)", marginTop: 16 }}>{task.name}</p>
            <button
              onClick={() => setShowQr(false)}
              className="sk-btn-primary"
              style={{ marginTop: 20, width: "100%", justifyContent: "center", padding: "11px", borderRadius: 10, fontSize: 14 }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Waypoint row component ───────────────────────────────────────────────────
function WaypointRow({
  wp, isEditing, onToggleEdit, onNameChange, onRadiusChange, onDelete,
}: {
  wp: Waypoint;
  isEditing: boolean;
  onToggleEdit: () => void;
  onNameChange: (n: string) => void;
  onRadiusChange: (r: number) => void;
  onDelete: () => void;
}) {
  const color = waypointColor(wp.type);
  const typeLabel = wp.type === "D" ? "이륙" : wp.type === "G" ? "도착" : "전환";

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
      {/* Header row */}
      <div
        onClick={onToggleEdit}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", cursor: "pointer" }}
      >
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.04em", flexShrink: 0 }}>{typeLabel}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#1d1d1f", flex: 1 }}>{wp.name}</span>
        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>
          {wp.radius >= 1000 ? `${wp.radius / 1000}km` : `${wp.radius}m`}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.28)", flexShrink: 0 }}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Expanded edit section */}
      {isEditing && (
        <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.02)", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={{ ...label, marginBottom: 4 }}>이름</label>
            <input
              type="text"
              value={wp.name}
              onChange={(e) => onNameChange(e.target.value)}
              className="sk-input"
              style={{ fontSize: 13 }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label style={{ ...label, marginBottom: 6 }}>반경</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {RADIUS_PRESETS.map((r) => (
                <button
                  key={r}
                  onClick={(e) => { e.stopPropagation(); onRadiusChange(r); }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background: wp.radius === r ? "#0071e3" : "rgba(0,0,0,0.06)",
                    color: wp.radius === r ? "#fff" : "#1d1d1f",
                    transition: "all 0.1s",
                  }}
                >
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
