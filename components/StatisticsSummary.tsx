"use client";

import { formatDuration } from "@/lib/utils/format";
import { Wind, Clock, Navigation, TrendingUp } from "lucide-react";

interface StatisticsCard {
  totalFlights: number;
  totalDurationSec: number;
  totalXcDistanceKm: number;
  longestFlightSec: number;
  longestDistanceKm: number;
  highestAltitudeM: number;
  highestThermalMs: number;
}

const statCard = {
  background: "#fff",
  borderRadius: 12,
  padding: "20px 24px",
  boxShadow: "rgba(0,0,0,0.08) 0px 2px 16px 0px",
};

export function StatisticsSummary({ stats }: { stats: StatisticsCard }) {
  const items = [
    {
      icon: Wind,
      label: "총 비행",
      value: `${stats.totalFlights}회`,
      sub: null,
    },
    {
      icon: Clock,
      label: "총 비행 시간",
      value: formatDuration(stats.totalDurationSec),
      sub: `최장 ${formatDuration(stats.longestFlightSec)}`,
    },
    {
      icon: Navigation,
      label: "총 XC 거리",
      value: `${Math.round(stats.totalXcDistanceKm)} km`,
      sub: `최장 ${stats.longestDistanceKm.toFixed(1)} km`,
    },
    {
      icon: TrendingUp,
      label: "개인 기록",
      value: `${stats.highestAltitudeM.toLocaleString()} m`,
      sub: `최고 써멀 ${stats.highestThermalMs.toFixed(1)} m/s`,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}>
      {items.map(({ icon: Icon, label, value, sub }) => (
        <div key={label} style={statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon size={16} strokeWidth={1.5} style={{ color: "#0071e3" }} />
            <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.48)", letterSpacing: "0.02em" }}>{label}</p>
          </div>
          <p style={{ fontSize: 24, fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.5px", lineHeight: 1.1 }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginTop: 4 }}>{sub}</p>}
        </div>
      ))}
    </div>
  );
}
