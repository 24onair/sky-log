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
        background: "#fff",
        borderRadius: 12,
        padding: "20px 24px",
        boxShadow: "rgba(0,0,0,0.07) 0px 2px 12px 0px",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "rgba(0,0,0,0.14) 0px 4px 24px 0px")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "rgba(0,0,0,0.07) 0px 2px 12px 0px")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginBottom: 4, letterSpacing: "-0.1px" }}>
            {formatDate(new Date(log.flight_date))}
          </p>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.3px", lineHeight: 1.2, marginBottom: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {log.site_id ? log.site_id : "비행 기록"}
          </h3>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(0,0,0,0.56)" }}>
              <Clock size={13} strokeWidth={1.5} />
              {formatDuration(log.duration_sec)}
            </span>
            {log.distance_xcontest_km && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(0,0,0,0.56)" }}>
                <Navigation size={13} strokeWidth={1.5} />
                {log.distance_xcontest_km.toFixed(1)} km
              </span>
            )}
            {log.max_altitude_m && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(0,0,0,0.56)" }}>
                <MoveUp size={13} strokeWidth={1.5} />
                {log.max_altitude_m.toLocaleString()} m
              </span>
            )}
            {log.wind_speed_kmh && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(0,0,0,0.56)" }}>
                <Wind size={13} strokeWidth={1.5} />
                {log.wind_speed_kmh.toFixed(0)} km/h
              </span>
            )}
          </div>
        </div>

        {/* Right — XC distance badge + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {log.distance_xcontest_km ? (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 22, fontWeight: 600, color: "#0071e3", letterSpacing: "-0.5px", lineHeight: 1 }}>
                {log.distance_xcontest_km.toFixed(1)}
              </p>
              <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>km XC</p>
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
