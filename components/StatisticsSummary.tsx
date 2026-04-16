"use client";

import { formatDuration } from "@/lib/utils/format";

interface StatisticsCard {
  totalFlights: number;
  totalDurationSec: number;
  totalXcDistanceKm: number;
  longestFlightSec: number;
  longestDistanceKm: number;
  highestAltitudeM: number;
  highestThermalMs: number;
}

export function StatisticsSummary({
  stats,
}: {
  stats: StatisticsCard;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 누적 통계 */}
      <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4">
        <p className="text-sm text-blue-600 font-medium">Total Flights</p>
        <p className="text-3xl font-bold text-blue-900 mt-1">
          {stats.totalFlights}
        </p>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-4">
        <p className="text-sm text-green-600 font-medium">Total Flight Time</p>
        <p className="text-3xl font-bold text-green-900 mt-1">
          {formatDuration(stats.totalDurationSec)}
        </p>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-4">
        <p className="text-sm text-purple-600 font-medium">Total XC Distance</p>
        <p className="text-3xl font-bold text-purple-900 mt-1">
          {Math.round(stats.totalXcDistanceKm)} km
        </p>
      </div>

      {/* 개인 기록 */}
      <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-4">
        <p className="text-sm text-amber-600 font-medium">Personal Best</p>
        <div className="mt-2 space-y-1 text-sm">
          <p className="text-amber-900">
            Longest: {formatDuration(stats.longestFlightSec)}
          </p>
          <p className="text-amber-900">
            Highest: {stats.highestAltitudeM}m
          </p>
          <p className="text-amber-900">
            Thermal: {stats.highestThermalMs.toFixed(1)}m/s
          </p>
        </div>
      </div>
    </div>
  );
}
