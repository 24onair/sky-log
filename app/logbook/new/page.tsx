"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createFlightLog } from "@/lib/supabase/logbook";
import { getUser } from "@/lib/supabase/auth";
import { FlightLogInsert } from "@/lib/schemas/logbook";
import { AltitudeProfile } from "@/components/AltitudeProfile";
import { parseIGC } from "@/lib/igc/parser";
import {
  ChevronLeft, Upload, CheckCircle, AlertCircle,
  Clock, Navigation, MoveUp, Wind, ArrowUp,
} from "lucide-react";

// Mapbox GL only runs in browser
const FlightMap = dynamic(
  () => import("@/components/FlightMap").then((m) => m.FlightMap),
  { ssr: false }
);

// ─── style constants ──────────────────────────────────────────────
const label = {
  fontSize: 14,
  fontWeight: 600,
  color: "#1E2026",
  display: "block",
  marginBottom: 8,
  letterSpacing: "0.02em",
} as React.CSSProperties;

const secHead = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.10em",
  color: "#848E9C",
  textTransform: "uppercase" as const,
  marginBottom: 14,
};

// ─── blank form state ─────────────────────────────────────────────
const blank: FlightLogInsert = {
  flight_date: new Date(),
  duration_sec: 0,
  site_id: null,
  distance_straight_km: null,
  distance_track_km: null,
  distance_xcontest_km: null,
  max_altitude_m: null,
  max_thermal_ms: null,
  wind_direction: null,
  wind_speed_kmh: null,
  weather_condition: null,
  memo: null,
  igc_parsed: false,
};

export default function NewFlightPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FlightLogInsert>(blank);
  const [trackPoints, setTrackPoints] = useState<[number, number, number][] | undefined>();
  const [altProfile, setAltProfile] = useState<number[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [igcError, setIgcError] = useState<string | null>(null);
  const [igcLoading, setIgcLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    getUser().then((u) => {
      if (!u) router.push("/auth/login");
      else setUserId(u.id);
    });
  }, [router]);

  const set = (field: keyof FlightLogInsert, value: unknown) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  // ── IGC file handler ──────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".igc")) {
      setIgcError("IGC 파일만 업로드할 수 있습니다");
      return;
    }
    setIgcLoading(true);
    setIgcError(null);
    setFileName(null);
    try {
      const text = await file.text();
      const parsed = parseIGC(text);
      setFormData((p) => ({
        ...p,
        flight_date: parsed.flightDate,
        duration_sec: parsed.durationSec,
        max_altitude_m: parsed.maxAltitudeM,
        max_thermal_ms: parsed.maxThermalMs,
        distance_straight_km: parsed.distanceStraightKm,
        distance_track_km: parsed.distanceTrackKm,
        distance_xcontest_km: parsed.distanceXcontestKm,
        igc_parsed: true,
      }));
      setTrackPoints(parsed.trackPoints);
      setAltProfile(parsed.altitudeProfile);
      setFileName(file.name);
    } catch (err) {
      setIgcError(err instanceof Error ? err.message : "파일 파싱에 실패했습니다");
    } finally {
      setIgcLoading(false);
    }
  };

  // ── submit ────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.flight_date) e.flight_date = "날짜를 입력하세요";
    if (!formData.duration_sec || formData.duration_sec <= 0)
      e.duration_sec = "비행 시간을 입력하세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!userId) { router.push("/auth/login"); return; }
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createFlightLog(userId, formData);
      router.push("/logbook");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const durationDisplay = formData.duration_sec
    ? `${String(Math.floor(formData.duration_sec / 3600)).padStart(2, "0")}:${String(
        Math.floor((formData.duration_sec % 3600) / 60)
      ).padStart(2, "0")}`
    : "";

  // ── stat card helper ──────────────────────────────────────────
  const StatPill = ({
    icon,
    label: lbl,
    value,
    unit,
    accent,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number | null;
    unit?: string;
    accent?: boolean;
  }) =>
    value != null ? (
      <div style={{ flex: 1, minWidth: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
          <span style={{ color: "rgba(0,0,0,0.36)" }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(0,0,0,0.36)", textTransform: "uppercase" }}>{lbl}</span>
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: accent ? "#0071e3" : "#1d1d1f", letterSpacing: "-0.4px", lineHeight: 1 }}>
          {value}
          {unit && <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(0,0,0,0.4)", marginLeft: 2 }}>{unit}</span>}
        </p>
      </div>
    ) : null;

  // ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        height: "calc(100vh - 48px)",
        display: "grid",
        gridTemplateColumns: "1fr 400px",
        overflow: "hidden",
      }}
    >
      {/* ══════════════ LEFT — MAP ══════════════ */}
      <div style={{ position: "relative", background: "#e8e8ed" }}>
        <FlightMap trackPoints={trackPoints} />

        {/* Legend overlay — top left */}
        {trackPoints && (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              pointerEvents: "none",
            }}
          >
            {[
              { color: "#34c759", label: "이륙" },
              { color: "#ff3b30", label: "착륙" },
            ].map(({ color, label: lbl }) => (
              <div
                key={lbl}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "rgba(255,255,255,0.88)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 20,
                  padding: "5px 10px 5px 7px",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, border: "1.5px solid #fff", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: "#1d1d1f" }}>{lbl}</span>
              </div>
            ))}
          </div>
        )}

        {/* Altitude profile — bottom overlay */}
        {altProfile.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(to top, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.7) 60%, transparent 100%)",
              backdropFilter: "blur(2px)",
              padding: "0 20px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(0,0,0,0.4)", textTransform: "uppercase" }}>
                고도 프로파일
              </span>
              <span style={{ fontSize: 11, color: "rgba(0,0,0,0.36)" }}>
                {formData.max_altitude_m?.toLocaleString()} m
              </span>
            </div>
            <div style={{ height: 52 }}>
              <AltitudeProfile altitudes={altProfile} maxAlt={formData.max_altitude_m ?? undefined} />
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {!trackPoints && (
          <div
            style={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.86)",
                backdropFilter: "blur(12px)",
                borderRadius: 20,
                padding: "10px 18px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Wind size={14} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.36)" }} />
              <span style={{ fontSize: 13, color: "rgba(0,0,0,0.48)" }}>
                IGC 파일을 업로드하면 비행 경로가 표시됩니다
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ RIGHT — SIDEBAR ══════════════ */}
      <div
        style={{
          background: "#f5f5f7",
          borderLeft: "1px solid rgba(0,0,0,0.08)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 20px 0",
            position: "sticky",
            top: 0,
            background: "#f5f5f7",
            zIndex: 10,
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            paddingBottom: 16,
          }}
        >
          <Link
            href="/logbook"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 13,
              color: "#0066cc",
              textDecoration: "none",
              marginBottom: 10,
            }}
          >
            <ChevronLeft size={15} strokeWidth={1.5} />
            로그북
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.4px", color: "#1d1d1f", lineHeight: 1.1 }}>
            새 비행 기록
          </h1>
        </div>

        <div style={{ flex: 1, padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ── IGC Upload ─────────────────────────────────── */}
          <div className="sk-card" style={{ padding: 0, overflow: "hidden" }}>
            <label
              style={{
                display: "block",
                padding: "20px 20px",
                cursor: igcLoading ? "default" : "pointer",
                background: isDragging ? "rgba(0,113,227,0.04)" : fileName ? "rgba(52,199,89,0.04)" : "#fff",
                transition: "background 0.2s",
                borderBottom: (igcError) ? "none" : "none",
              }}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <input
                type="file"
                accept=".igc"
                style={{ display: "none" }}
                disabled={igcLoading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {igcLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 22, height: 22, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: "rgba(0,0,0,0.56)" }}>IGC 분석 중...</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : fileName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle size={20} strokeWidth={1.5} style={{ color: "#34c759", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</p>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 1 }}>파싱 완료 · 다른 파일을 클릭하여 교체</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: "rgba(0,113,227,0.08)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Upload size={17} strokeWidth={1.5} style={{ color: "#0071e3" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#1d1d1f" }}>IGC 파일 업로드</p>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 1 }}>클릭 또는 드래그 — 데이터 자동 입력</p>
                  </div>
                </div>
              )}
            </label>

            {/* IGC parse error */}
            {igcError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "rgba(255,59,48,0.06)", borderTop: "1px solid rgba(255,59,48,0.12)" }}>
                <AlertCircle size={13} strokeWidth={1.5} style={{ color: "#ff3b30", flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "#ff3b30" }}>{igcError}</p>
              </div>
            )}
          </div>

          {/* ── Parsed stats (shown after IGC load) ────────── */}
          {formData.igc_parsed && (
            <div className="sk-card" style={{ padding: "16px 20px" }}>
              <p style={secHead}>IGC 기록</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <StatPill
                  icon={<Clock size={11} strokeWidth={1.5} />}
                  label="비행 시간"
                  value={durationDisplay}
                />
                <StatPill
                  icon={<Navigation size={11} strokeWidth={1.5} />}
                  label="XC 거리"
                  value={formData.distance_xcontest_km?.toFixed(1) ?? null}
                  unit="km"
                  accent
                />
                <StatPill
                  icon={<MoveUp size={11} strokeWidth={1.5} />}
                  label="최고 고도"
                  value={formData.max_altitude_m?.toLocaleString() ?? null}
                  unit="m"
                />
                <StatPill
                  icon={<ArrowUp size={11} strokeWidth={1.5} />}
                  label="최고 써멀"
                  value={formData.max_thermal_ms?.toFixed(1) ?? null}
                  unit="m/s"
                />
              </div>
            </div>
          )}

          {/* ── Required fields ─────────────────────────────── */}
          <div className="sk-card" style={{ padding: "16px 20px" }}>
            <p style={secHead}>필수 정보</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={label}>비행 날짜 및 시간 *</label>
                <input
                  type="datetime-local"
                  value={formData.flight_date ? new Date(formData.flight_date).toISOString().slice(0, 16) : ""}
                  onChange={(e) => set("flight_date", new Date(e.target.value))}
                  className={`sk-input${errors.flight_date ? " error" : ""}`}
                  disabled={isSubmitting}
                />
                {errors.flight_date && <p style={{ fontSize: 11, color: "#ff3b30", marginTop: 3 }}>{errors.flight_date}</p>}
              </div>
              <div>
                <label style={label}>비행 시간 (HH:MM) *</label>
                <input
                  type="text"
                  placeholder="01:30"
                  value={durationDisplay}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    set("duration_sec", (h || 0) * 3600 + (m || 0) * 60);
                  }}
                  className={`sk-input${errors.duration_sec ? " error" : ""}`}
                  disabled={isSubmitting}
                />
                {errors.duration_sec && <p style={{ fontSize: 11, color: "#ff3b30", marginTop: 3 }}>{errors.duration_sec}</p>}
              </div>
            </div>
          </div>

          {/* ── Distance (manual, hidden if IGC) ────────────── */}
          {!formData.igc_parsed && (
            <div className="sk-card" style={{ padding: "16px 20px" }}>
              <p style={secHead}>거리</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {(
                  [
                    ["distance_straight_km", "직선"],
                    ["distance_track_km", "경로"],
                    ["distance_xcontest_km", "XC"],
                  ] as const
                ).map(([field, lbl]) => (
                  <div key={field}>
                    <label style={label}>{lbl} (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData[field] ?? ""}
                      onChange={(e) => set(field, e.target.value ? parseFloat(e.target.value) : null)}
                      className="sk-input"
                      disabled={isSubmitting}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Weather ─────────────────────────────────────── */}
          <div className="sk-card" style={{ padding: "16px 20px" }}>
            <p style={secHead}>날씨</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={label}>풍향 (°)</label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={formData.wind_direction ?? ""}
                  onChange={(e) => set("wind_direction", e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="sk-input"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={label}>풍속 (km/h)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.wind_speed_kmh ?? ""}
                  onChange={(e) => set("wind_speed_kmh", e.target.value ? parseFloat(e.target.value) : null)}
                  className="sk-input"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label style={label}>날씨 상태</label>
              <input
                type="text"
                placeholder="맑음, 구름 조금..."
                value={formData.weather_condition ?? ""}
                onChange={(e) => set("weather_condition", e.target.value || null)}
                className="sk-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* ── Memo ─────────────────────────────────────────── */}
          <div className="sk-card" style={{ padding: "16px 20px" }}>
            <p style={secHead}>메모</p>
            <textarea
              value={formData.memo ?? ""}
              onChange={(e) => set("memo", e.target.value || null)}
              className="sk-input"
              rows={3}
              disabled={isSubmitting}
              placeholder="오늘 비행에 대한 메모..."
              style={{ resize: "vertical" }}
            />
          </div>

          {/* ── Submit error ─────────────────────────────────── */}
          {submitError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "10px 14px" }}>
              <AlertCircle size={13} strokeWidth={1.5} style={{ color: "#ff3b30", flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "#ff3b30" }}>{submitError}</p>
            </div>
          )}

          {/* ── Save button ──────────────────────────────────── */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="sk-btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "13px 20px",
              fontSize: 15,
              borderRadius: 12,
              opacity: isSubmitting ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {isSubmitting ? "저장 중..." : "비행 기록 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
