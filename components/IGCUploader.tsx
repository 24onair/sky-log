"use client";

import { useState } from "react";
import { parseIGC } from "@/lib/igc/parser";
import { FlightLogInsert } from "@/lib/schemas/logbook";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

interface IGCUploaderProps {
  onParsed?: (data: Partial<FlightLogInsert>) => void;
}

export function IGCUploader({ onParsed }: IGCUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".igc")) {
      setError("IGC 파일만 업로드할 수 있습니다");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName(null);

    try {
      const content = await file.text();
      const parsed = parseIGC(content);

      onParsed?.({
        flight_date: parsed.flightDate,
        duration_sec: parsed.durationSec,
        max_altitude_m: parsed.maxAltitudeM,
        max_thermal_ms: parsed.maxThermalMs,
        distance_straight_km: parsed.distanceStraightKm,
        distance_track_km: parsed.distanceTrackKm,
        distance_xcontest_km: parsed.distanceXcontestKm,
        igc_parsed: true,
        track_points: parsed.trackPoints,
      });

      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 파싱에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const borderColor = isDragging ? "#0071e3" : fileName ? "#34c759" : error ? "#ff3b30" : "rgba(0,0,0,0.12)";
  const bgColor = isDragging ? "rgba(0,113,227,0.04)" : fileName ? "rgba(52,199,89,0.04)" : "#fafafa";

  return (
    <div style={{ marginBottom: 24 }}>
      <label
        style={{
          display: "block",
          border: `1.5px dashed ${borderColor}`,
          borderRadius: 12,
          padding: "28px 20px",
          textAlign: "center",
          background: bgColor,
          cursor: isLoading ? "default" : "pointer",
          transition: "all 0.2s",
        }}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input
          type="file"
          accept=".igc"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          style={{ display: "none" }}
          disabled={isLoading}
        />

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ fontSize: 14, color: "rgba(0,0,0,0.56)" }}>파일 분석 중...</p>
          </div>
        ) : fileName ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <CheckCircle size={28} strokeWidth={1.5} style={{ color: "#34c759" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "#1d1d1f" }}>{fileName}</p>
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>파싱 완료 — 아래 내용을 확인하세요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Upload size={28} strokeWidth={1.5} style={{ color: "#0071e3" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "#1d1d1f" }}>IGC 파일 드래그 또는 클릭하여 업로드</p>
            <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>비행 데이터를 자동으로 입력합니다</p>
          </div>
        )}
      </label>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "10px 14px", background: "rgba(255,59,48,0.06)", borderRadius: 8 }}>
          <AlertCircle size={14} strokeWidth={1.5} style={{ color: "#ff3b30", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
