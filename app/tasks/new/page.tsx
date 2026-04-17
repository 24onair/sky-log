"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import { getUser } from "@/lib/supabase/auth";
import { createTask } from "@/lib/supabase/tasks";
import { Waypoint, TaskInsert, TaskType } from "@/lib/schemas/task";
import {
  calculateTaskDistance,
  calculateCenterDistance,
  assignWaypointTypes,
  waypointLabel,
  waypointRoleLabel,
  waypointRoleColor,
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
const SLIDER_MAX = 5000; // slider covers up to 5 km; beyond → direct input

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
  /** True when name was auto-generated (should be overwritten on position change) */
  const isAutoName = (name: string) =>
    !name ||
    ["Take Off", "SSS", "ESS", "Landing"].includes(name) ||
    /^TP\d+$/.test(name);

  /** Re-label all waypoints by position; preserves user-custom TP names */
  const applyLabels = useCallback((wps: Waypoint[]) =>
    wps.map((wp, i) => ({
      ...wp,
      name: isAutoName(wp.name) ? waypointLabel(i, wps.length) : wp.name,
    })), []);

  const addWaypoint = useCallback((lat: number, lon: number) => {
    setTask((prev) => {
      const draft: Waypoint[] = [
        ...prev.waypoints,
        { id: uuid(), name: "", lat, lon, altitude: 0, radius: 400, type: "T" },
      ];
      const assigned = applyLabels(assignWaypointTypes(draft));
      return { ...prev, waypoints: assigned, distance_km: calculateTaskDistance(assigned) };
    });
    // stay in add mode — user clicks continuously until pressing "완료"
  }, [applyLabels]);

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
      const wps = applyLabels(assignWaypointTypes(prev.waypoints.filter((wp) => wp.id !== id)));
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

  const centerKm = task.waypoints.length >= 2
    ? calculateCenterDistance(task.waypoints)
    : null;
  const optimumKm = task.distance_km != null && task.waypoints.length >= 2
    ? task.distance_km
    : null;

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
        .radius-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px; border-radius: 2px;
          background: rgba(0,0,0,0.1); outline: none; cursor: pointer;
        }
        .radius-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: #0071e3; border: 2.5px solid #fff;
          box-shadow: 0 1px 6px rgba(0,113,227,0.4); cursor: grab;
        }
        .radius-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #0071e3; border: 2.5px solid #fff;
          box-shadow: 0 1px 6px rgba(0,113,227,0.4); cursor: grab;
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
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>{task.name}</p>
              {task.waypoints.length >= 2 ? (
                <div style={{ display: "flex", gap: 12 }}>
                  {/* Center-to-center */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.06em", marginBottom: 1 }}>중심간</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#636366", letterSpacing: "-0.5px", lineHeight: 1 }}>
                      {centerKm != null ? `${centerKm.toFixed(1)}` : "—"}
                      <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2 }}>km</span>
                    </p>
                  </div>
                  <div style={{ width: 1, background: "rgba(0,0,0,0.1)", alignSelf: "stretch" }} />
                  {/* Optimum (edge-to-edge) */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.06em", marginBottom: 1 }}>최단거리</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#0071e3", letterSpacing: "-0.5px", lineHeight: 1 }}>
                      {optimumKm != null ? `${optimumKm.toFixed(1)}` : "—"}
                      <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2 }}>km</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "rgba(0,0,0,0.35)" }}>포인트를 추가하세요</p>
              )}
            </div>
          </div>

          {/* Add mode hint banner — top just below search */}
          {isAddMode && (
            <div style={{
              position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)",
              background: "rgba(0,113,227,0.92)", backdropFilter: "blur(8px)",
              borderRadius: 20, padding: "7px 18px", pointerEvents: "none", whiteSpace: "nowrap",
            }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>
                클릭하여 포인트 추가 · 드래그하여 이동
              </p>
            </div>
          )}

          {/* FAB: start adding / finish adding */}
          {isAddMode ? (
            <button
              className="fab-add"
              onClick={() => setIsAddMode(false)}
              style={{
                position: "absolute", bottom: 16, right: 16,
                height: 48, padding: "0 22px",
                borderRadius: 24,
                background: "#34c759",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(52,199,89,0.4)",
                transition: "all 0.2s", zIndex: 10,
              }}
            >
              <CheckCircle2 size={18} strokeWidth={2} style={{ color: "#fff" }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>완료</span>
            </button>
          ) : (
            <button
              className="fab-add"
              onClick={() => setIsAddMode(true)}
              style={{
                position: "absolute", bottom: 16, right: 16,
                width: 52, height: 52,
                borderRadius: "50%",
                background: "#0071e3",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.24)",
                transition: "all 0.2s", zIndex: 10,
              }}
            >
              <Plus size={22} strokeWidth={2.5} style={{ color: "#fff" }} />
            </button>
          )}

          {/* Legend */}
          {task.waypoints.length > 0 && (
            <div style={{ position: "absolute", bottom: 16, left: 12, display: "flex", gap: 6, flexWrap: "wrap", pointerEvents: "none" }}>
              {[
                { color: "#34c759", label: "Take Off" },
                { color: "#ff9500", label: "SSS" },
                { color: "#0071e3", label: "TP" },
                { color: "#bf5af2", label: "ESS" },
                { color: "#ff3b30", label: "Landing" },
              ].map(({ color, label: lbl }) => (
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
              {task.waypoints.length >= 2 && (
                <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", fontWeight: 500 }}>
                  중심 <span style={{ color: "#636366", fontWeight: 600 }}>{centerKm?.toFixed(1)}</span>
                  {" / "}
                  최단 <span style={{ color: "#0071e3", fontWeight: 600 }}>{optimumKm?.toFixed(1)}</span> km
                </span>
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
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 6,
                    fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
                    background: isAddMode ? "rgba(52,199,89,0.12)" : "rgba(0,113,227,0.1)",
                    color: isAddMode ? "#34c759" : "#0071e3",
                  }}
                >
                  {isAddMode
                    ? <><CheckCircle2 size={12} />추가 완료</>
                    : <><MapPin size={12} />지도에서 추가</>}
                </button>
              </div>

              {task.waypoints.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>지도를 탭하거나 + 버튼을 눌러 웨이포인트를 추가하세요</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {task.waypoints.map((wp, i) => (
                    <WaypointRow
                      key={wp.id}
                      wp={wp}
                      index={i}
                      total={task.waypoints.length}
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
  wp, index, total, isEditing, onToggleEdit, onNameChange, onRadiusChange, onDelete,
}: {
  wp: Waypoint;
  index: number;
  total: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onNameChange: (n: string) => void;
  onRadiusChange: (r: number) => void;
  onDelete: () => void;
}) {
  const color = waypointRoleColor(index, total);
  const roleLabel = waypointRoleLabel(index, total);

  // Local input state so user can type freely; committed on blur / Enter
  const [inputVal, setInputVal] = useState(String(wp.radius));
  useEffect(() => { setInputVal(String(wp.radius)); }, [wp.radius]);

  const commitInput = () => {
    const v = parseInt(inputVal, 10);
    if (!isNaN(v) && v >= 50) onRadiusChange(v);
    else setInputVal(String(wp.radius));
  };

  // Slider progress background (fills left of thumb in blue)
  const sliderPct = useMemo(
    () => Math.round((Math.min(wp.radius, SLIDER_MAX) / SLIDER_MAX) * 100),
    [wp.radius]
  );
  const sliderBg = `linear-gradient(to right, #0071e3 ${sliderPct}%, rgba(0,0,0,0.1) ${sliderPct}%)`;

  const displayRadius = wp.radius >= 1000
    ? `${(wp.radius / 1000 % 1 === 0 ? wp.radius / 1000 : (wp.radius / 1000).toFixed(1))} km`
    : `${wp.radius} m`;

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
      {/* Header row */}
      <div
        onClick={onToggleEdit}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#fff", cursor: "pointer" }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#fff",
          background: color, borderRadius: 6,
          padding: "2px 6px", flexShrink: 0, letterSpacing: "0.03em",
        }}>{roleLabel}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#1d1d1f", flex: 1 }}>{wp.name}</span>
        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginRight: 2 }}>{displayRadius}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.28)", flexShrink: 0 }}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Expanded edit section */}
      {isEditing && (
        <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.02)", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Name */}
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

          {/* Radius */}
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={label}>반경</label>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0071e3" }}>{displayRadius}</span>
            </div>

            {/* Slider — 100 m to 5 km */}
            <input
              type="range"
              className="radius-slider"
              min={100}
              max={SLIDER_MAX}
              step={50}
              value={Math.min(wp.radius, SLIDER_MAX)}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              style={{ background: sliderBg }}
            />

            {/* Scale labels */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, marginBottom: 8 }}>
              {["100m", "1km", "2km", "3km", "4km", "5km"].map((t) => (
                <span key={t} style={{ fontSize: 9, color: "rgba(0,0,0,0.3)" }}>{t}</span>
              ))}
            </div>

            {/* Direct input for exact / > 5 km */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", flexShrink: 0 }}>직접 입력</span>
              <input
                type="number"
                min={50}
                step={50}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={commitInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { commitInput(); (e.target as HTMLInputElement).blur(); }
                  e.stopPropagation();
                }}
                style={{
                  flex: 1, padding: "5px 8px", borderRadius: 7,
                  border: "1px solid rgba(0,0,0,0.14)", fontSize: 13,
                  fontWeight: 500, textAlign: "right", outline: "none",
                  background: "#fff", color: "#1d1d1f",
                }}
              />
              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", flexShrink: 0 }}>m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
