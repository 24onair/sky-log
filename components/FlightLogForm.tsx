"use client";

import { useState } from "react";
import { FlightLogInsert } from "@/lib/schemas/logbook";
import { IGCUploader } from "./IGCUploader";
import { AlertCircle } from "lucide-react";

interface FlightLogFormProps {
  initialData?: FlightLogInsert;
  isSubmitting?: boolean;
  onSubmit: (data: FlightLogInsert) => Promise<void>;
  sites?: Array<{ id: string; name: string }>;
  isEditing?: boolean;
}

const label = { fontSize: 13, fontWeight: 500, color: "#1d1d1f", display: "block", marginBottom: 6 } as React.CSSProperties;
const section = { marginBottom: 28 } as React.CSSProperties;
const sectionTitle = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(0,0,0,0.36)", textTransform: "uppercase" as const, marginBottom: 14 };
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as React.CSSProperties;
const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } as React.CSSProperties;

export function FlightLogForm({ initialData, isSubmitting = false, onSubmit, sites = [], isEditing = false }: FlightLogFormProps) {
  const [formData, setFormData] = useState<FlightLogInsert>(
    initialData || {
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
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FlightLogInsert, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.flight_date) e.flight_date = "비행 날짜를 입력해주세요";
    if (!formData.duration_sec || formData.duration_sec <= 0) e.duration_sec = "비행 시간을 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다");
    }
  };

  const durationDisplay = formData.duration_sec
    ? `${String(Math.floor(formData.duration_sec / 3600)).padStart(2, "0")}:${String(Math.floor((formData.duration_sec % 3600) / 60)).padStart(2, "0")}`
    : "";

  return (
    <form onSubmit={handleSubmit}>
      {!isEditing && (
        <IGCUploader onParsed={(data) => setFormData((prev) => ({ ...prev, ...data }))} />
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
          <AlertCircle size={14} strokeWidth={1.5} style={{ color: "#ff3b30", flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: "#ff3b30" }}>{error}</p>
        </div>
      )}

      {/* 필수 정보 */}
      <div style={section}>
        <p style={sectionTitle}>필수 정보</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={grid2}>
            <div>
              <label style={label}>비행 날짜 및 시간 *</label>
              <input
                type="datetime-local"
                value={formData.flight_date ? new Date(formData.flight_date).toISOString().slice(0, 16) : ""}
                onChange={(e) => set("flight_date", new Date(e.target.value))}
                className={`sk-input${errors.flight_date ? " error" : ""}`}
                disabled={isSubmitting}
              />
              {errors.flight_date && <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 4 }}>{errors.flight_date}</p>}
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
              {errors.duration_sec && <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 4 }}>{errors.duration_sec}</p>}
            </div>
          </div>

          {sites.length > 0 && (
            <div>
              <label style={label}>이륙장</label>
              <select
                value={formData.site_id || ""}
                onChange={(e) => set("site_id", e.target.value || null)}
                className="sk-input"
                disabled={isSubmitting}
                style={{ cursor: "pointer" }}
              >
                <option value="">선택 안 함</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 거리 */}
      <div style={section}>
        <p style={sectionTitle}>거리 정보</p>
        <div style={grid3}>
          {([["distance_straight_km", "직선 거리 (km)"], ["distance_track_km", "경로 거리 (km)"], ["distance_xcontest_km", "XC 거리 (km)"]] as const).map(([field, lbl]) => (
            <div key={field}>
              <label style={label}>{lbl}</label>
              <input
                type="number" step="0.1" min="0"
                value={formData[field] ?? ""}
                onChange={(e) => set(field, e.target.value ? parseFloat(e.target.value) : null)}
                className="sk-input"
                disabled={isSubmitting}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 고도 & 써멀 */}
      <div style={section}>
        <p style={sectionTitle}>고도 & 써멀</p>
        <div style={grid2}>
          <div>
            <label style={label}>최고 고도 (m)</label>
            <input type="number" value={formData.max_altitude_m ?? ""} onChange={(e) => set("max_altitude_m", e.target.value ? parseInt(e.target.value, 10) : null)} className="sk-input" disabled={isSubmitting} />
          </div>
          <div>
            <label style={label}>최고 써멀 (m/s)</label>
            <input type="number" step="0.1" value={formData.max_thermal_ms ?? ""} onChange={(e) => set("max_thermal_ms", e.target.value ? parseFloat(e.target.value) : null)} className="sk-input" disabled={isSubmitting} />
          </div>
        </div>
      </div>

      {/* 날씨 */}
      <div style={section}>
        <p style={sectionTitle}>날씨</p>
        <div style={grid3}>
          <div>
            <label style={label}>풍향 (°)</label>
            <input type="number" min="0" max="360" value={formData.wind_direction ?? ""} onChange={(e) => set("wind_direction", e.target.value ? parseInt(e.target.value, 10) : null)} className="sk-input" disabled={isSubmitting} />
          </div>
          <div>
            <label style={label}>풍속 (km/h)</label>
            <input type="number" step="0.1" value={formData.wind_speed_kmh ?? ""} onChange={(e) => set("wind_speed_kmh", e.target.value ? parseFloat(e.target.value) : null)} className="sk-input" disabled={isSubmitting} />
          </div>
          <div>
            <label style={label}>날씨 상태</label>
            <input type="text" placeholder="맑음, 구름 조금..." value={formData.weather_condition ?? ""} onChange={(e) => set("weather_condition", e.target.value || null)} className="sk-input" disabled={isSubmitting} />
          </div>
        </div>
      </div>

      {/* 메모 */}
      <div style={{ marginBottom: 28 }}>
        <label style={label}>메모</label>
        <textarea
          value={formData.memo ?? ""}
          onChange={(e) => set("memo", e.target.value || null)}
          className="sk-input"
          rows={3}
          disabled={isSubmitting}
          placeholder="비행에 대한 메모를 남겨보세요..."
          style={{ resize: "vertical" }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="sk-btn-primary"
        style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 10, opacity: isSubmitting ? 0.6 : 1 }}
      >
        {isSubmitting ? "저장 중..." : isEditing ? "수정 완료" : "비행 기록 저장"}
      </button>
    </form>
  );
}
