"use client";

import { FlightLog } from "@/lib/schemas/logbook";
import Link from "next/link";
import { formatDuration, formatDate } from "@/lib/utils/format";
import { Clock, Navigation, MoveUp, Wind, ChevronRight } from "lucide-react";

interface FlightLogCardProps {
  log: FlightLog;
}

export function FlightLogCard({ log }: FlightLogCardProps) {
  return (
    <Link
      href={`/logbook/${log.id}`}
      style={{
        display: "block",
        background: "#FFFFFF",
        borderRadius: 12,
        padding: "24px 28px",
        boxShadow: "rgba(0,0,0,0.05) 0px 2px 12px 0px",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "rgba(0,0,0,0.08) 0px 4px 20px 0px";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "rgba(0,0,0,0.05) 0px 2px 12px 0px";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: "#848E9C", marginBottom: 6, letterSpacing: "-0.1px", fontWeight: 500 }}>
            {formatDate(new Date(log.flight_date))}
          </p>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E2026", letterSpacing: "-0.3px", lineHeight: 1.2, marginBottom: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {log.site_id ? log.site_id : "비행 기록"}
          </h3>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#32313A", fontWeight: 500 }}>
              <Clock size={14} strokeWidth={1.5} style={{ color: "#F0B90B" }} />
              {formatDuration(log.duration_sec)}
            </span>
            {log.distance_xcontest_km && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#32313A", fontWeight: 500 }}>
                <Navigation size={14} strokeWidth={1.5} style={{ color: "#F0B90B" }} />
                {log.distance_xcontest_km.toFixed(1)} km
              </span>
            )}
            {log.max_altitude_m && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#32313A", fontWeight: 500 }}>
                <MoveUp size={14} strokeWidth={1.5} style={{ color: "#F0B90B" }} />
                {log.max_altitude_m.toLocaleString()} m
              </span>
            )}
            {log.wind_speed_kmh && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#32313A", fontWeight: 500 }}>
                <Wind size={14} strokeWidth={1.5} style={{ color: "#F0B90B" }} />
                {log.wind_speed_kmh.toFixed(0)} km/h
              </span>
            )}
          </div>
        </div>

        {/* Right — XC distance badge + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {log.distance_xcontest_km ? (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#F0B90B", letterSpacing: "-0.5px", lineHeight: 1 }}>
                {log.distance_xcontest_km.toFixed(1)}
              </p>
              <p style={{ fontSize: 12, color: "#848E9C", marginTop: 4, fontWeight: 500 }}>km XC</p>
            </div>
          ) : null}
          <ChevronRight size={16} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.28)" }} />
        </div>
      </div>

      {log.igc_parsed && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34c759", flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>IGC 파일로 기록됨</p>
        </div>
      )}
    </Link>
  );
}
