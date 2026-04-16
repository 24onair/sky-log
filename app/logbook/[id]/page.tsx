"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getFlightLogById,
  updateFlightLog,
  deleteFlightLog,
} from "@/lib/supabase/logbook";
import { FlightLog, FlightLogInsert } from "@/lib/schemas/logbook";
import { getUser } from "@/lib/supabase/auth";
import { FlightLogForm } from "@/components/FlightLogForm";
import { formatDate, formatTime, formatDuration } from "@/lib/utils/format";
import { ChevronLeft, Clock, Navigation, MoveUp, Wind, AlertCircle, Pencil, Trash2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const sectionTitle = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(0,0,0,0.36)", textTransform: "uppercase" as const, marginBottom: 14 };
const statLabel = { fontSize: 12, color: "rgba(0,0,0,0.4)", marginBottom: 4 } as React.CSSProperties;
const statValue = { fontSize: 22, fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.5px", lineHeight: 1 } as React.CSSProperties;

export default function FlightDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [log, setLog] = useState<FlightLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      const p = await params;
      setId(p.id);
      try {
        setLoading(true);
        setError(null);
        const user = await getUser();
        if (!user) { router.push("/auth/login"); return; }
        setCurrentUserId(user.id);
        const data = await getFlightLogById(user.id, p.id);
        if (!data) setError("비행 기록을 찾을 수 없습니다");
        else setLog(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "불러오기에 실패했습니다");
      } finally {
        setLoading(false);
      }
    };
    resolveParams();
  }, [params, router]);

  const handleUpdate = async (data: FlightLogInsert) => {
    if (!log) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await updateFlightLog(currentUserId, id, data);
      setLog(updated);
      setIsEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "수정에 실패했습니다";
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await deleteFlightLog(currentUserId, id);
      router.push("/logbook");
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.4)" }}>불러오는 중...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error && !log) {
    return (
      <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Link href="/logbook" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, color: "#0066cc", textDecoration: "none", marginBottom: 24 }}>
            <ChevronLeft size={16} strokeWidth={1.5} />
            로그북으로
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "12px 16px" }}>
            <AlertCircle size={14} strokeWidth={1.5} style={{ color: "#ff3b30", flexShrink: 0 }} />
            <p style={{ fontSize: 14, color: "#ff3b30" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!log) return null;

  return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Back */}
        <Link href="/logbook" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, color: "#0066cc", textDecoration: "none", marginBottom: 24 }}>
          <ChevronLeft size={16} strokeWidth={1.5} />
          로그북으로
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", marginBottom: 4 }}>{formatDate(new Date(log.flight_date))}</p>
            <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.5px", color: "#1d1d1f", lineHeight: 1.1 }}>
              비행 상세
            </h1>
          </div>
          {!isEditing && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: "#fff", color: "#1d1d1f", border: "none", cursor: "pointer", boxShadow: "rgba(0,0,0,0.08) 0px 1px 6px 0px" }}
              >
                <Pencil size={14} strokeWidth={1.5} />
                수정
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: "rgba(255,59,48,0.08)", color: "#ff3b30", border: "none", cursor: "pointer" }}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                삭제
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
            <AlertCircle size={14} strokeWidth={1.5} style={{ color: "#ff3b30", flexShrink: 0 }} />
            <p style={{ fontSize: 14, color: "#ff3b30" }}>{error}</p>
          </div>
        )}

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <div style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 12, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#1d1d1f" }}>이 비행 기록을 삭제하시겠습니까?</p>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, background: "#fff", color: "#1d1d1f", border: "none", cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, background: "#ff3b30", color: "#fff", border: "none", cursor: "pointer", opacity: isDeleting ? 0.6 : 1 }}
              >
                {isDeleting ? "삭제 중..." : "삭제 확인"}
              </button>
            </div>
          </div>
        )}

        {isEditing ? (
          <div>
            <div className="sk-card" style={{ padding: 32, marginBottom: 12 }}>
              <FlightLogForm
                initialData={{
                  flight_date: new Date(log.flight_date),
                  duration_sec: log.duration_sec,
                  site_id: log.site_id,
                  distance_straight_km: log.distance_straight_km,
                  distance_track_km: log.distance_track_km,
                  distance_xcontest_km: log.distance_xcontest_km,
                  max_altitude_m: log.max_altitude_m,
                  max_thermal_ms: log.max_thermal_ms,
                  wind_direction: log.wind_direction,
                  wind_speed_kmh: log.wind_speed_kmh,
                  weather_condition: log.weather_condition,
                  memo: log.memo,
                  igc_parsed: log.igc_parsed,
                }}
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
                isEditing={true}
              />
            </div>
            <button
              onClick={() => setIsEditing(false)}
              style={{ fontSize: 14, color: "rgba(0,0,0,0.56)", background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}
            >
              취소
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>

            {/* Main */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Key stats */}
              <div className="sk-card" style={{ padding: "24px 28px" }}>
                <p style={sectionTitle}>핵심 지표</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  <div>
                    <p style={statLabel}><Clock size={11} strokeWidth={1.5} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />비행 시간</p>
                    <p style={statValue}>{formatDuration(log.duration_sec)}</p>
                  </div>
                  {log.distance_xcontest_km != null && (
                    <div>
                      <p style={statLabel}><Navigation size={11} strokeWidth={1.5} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />XC 거리</p>
                      <p style={{ ...statValue, color: "#0071e3" }}>{log.distance_xcontest_km.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.4)" }}>km</span></p>
                    </div>
                  )}
                  {log.max_altitude_m != null && (
                    <div>
                      <p style={statLabel}><MoveUp size={11} strokeWidth={1.5} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />최고 고도</p>
                      <p style={statValue}>{log.max_altitude_m.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.4)" }}>m</span></p>
                    </div>
                  )}
                  {log.max_thermal_ms != null && (
                    <div>
                      <p style={statLabel}><Wind size={11} strokeWidth={1.5} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />최고 써멀</p>
                      <p style={statValue}>{log.max_thermal_ms.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.4)" }}>m/s</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Distance */}
              {(log.distance_straight_km != null || log.distance_track_km != null || log.distance_xcontest_km != null) && (
                <div className="sk-card" style={{ padding: "24px 28px" }}>
                  <p style={sectionTitle}>거리 정보</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    <div>
                      <p style={statLabel}>직선 거리</p>
                      <p style={statValue}>{log.distance_straight_km != null ? `${log.distance_straight_km.toFixed(1)}` : "—"} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.4)" }}>{log.distance_straight_km != null ? "km" : ""}</span></p>
                    </div>
                    <div>
                      <p style={statLabel}>경로 거리</p>
                      <p style={statValue}>{log.distance_track_km != null ? `${log.distance_track_km.toFixed(1)}` : "—"} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.4)" }}>{log.distance_track_km != null ? "km" : ""}</span></p>
                    </div>
                    <div>
                      <p style={statLabel}>XC 거리</p>
                      <p style={{ ...statValue, color: log.distance_xcontest_km != null ? "#0071e3" : "#1d1d1f" }}>{log.distance_xcontest_km != null ? `${log.distance_xcontest_km.toFixed(1)}` : "—"} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.4)" }}>{log.distance_xcontest_km != null ? "km" : ""}</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Weather */}
              {(log.wind_direction != null || log.wind_speed_kmh != null || log.weather_condition) && (
                <div className="sk-card" style={{ padding: "24px 28px" }}>
                  <p style={sectionTitle}>날씨</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    {log.wind_direction != null && (
                      <div>
                        <p style={statLabel}>풍향</p>
                        <p style={statValue}>{log.wind_direction}° </p>
                      </div>
                    )}
                    {log.wind_speed_kmh != null && (
                      <div>
                        <p style={statLabel}>풍속</p>
                        <p style={statValue}>{log.wind_speed_kmh.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.4)" }}>km/h</span></p>
                      </div>
                    )}
                    {log.weather_condition && (
                      <div>
                        <p style={statLabel}>날씨 상태</p>
                        <p style={{ fontSize: 16, fontWeight: 500, color: "#1d1d1f" }}>{log.weather_condition}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Memo */}
              {log.memo && (
                <div className="sk-card" style={{ padding: "24px 28px" }}>
                  <p style={sectionTitle}>메모</p>
                  <p style={{ fontSize: 15, color: "#1d1d1f", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{log.memo}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="sk-card" style={{ padding: "20px 24px" }}>
                <p style={sectionTitle}>비행 정보</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <p style={{ ...statLabel, marginBottom: 2 }}>날짜</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#1d1d1f" }}>{formatDate(new Date(log.flight_date))}</p>
                  </div>
                  <div>
                    <p style={{ ...statLabel, marginBottom: 2 }}>이륙 시간</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#1d1d1f" }}>{formatTime(new Date(log.flight_date))}</p>
                  </div>
                  {log.igc_parsed && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 6, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34c759", flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>IGC 파일로 기록됨</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="sk-card" style={{ padding: "20px 24px" }}>
                <p style={sectionTitle}>메타</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <p style={{ ...statLabel, marginBottom: 2 }}>생성일</p>
                    <p style={{ fontSize: 13, color: "#1d1d1f" }}>{log.created_at ? new Date(log.created_at).toLocaleDateString("ko-KR") : "—"}</p>
                  </div>
                  {log.updated_at && log.updated_at !== log.created_at && (
                    <div>
                      <p style={{ ...statLabel, marginBottom: 2 }}>수정일</p>
                      <p style={{ fontSize: 13, color: "#1d1d1f" }}>{new Date(log.updated_at).toLocaleDateString("ko-KR")}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ ...statLabel, marginBottom: 2 }}>ID</p>
                    <p style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(0,0,0,0.36)", wordBreak: "break-all" }}>{log.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
