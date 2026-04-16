"use client";

import { FlightLog } from "@/lib/schemas/logbook";
import Link from "next/link";
import { formatDuration, formatDate } from "@/lib/utils/format";

interface FlightLogCardProps {
  log: FlightLog;
}

export function FlightLogCard({ log }: FlightLogCardProps) {
  return (
    <Link
      href={`/logbook/${log.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {formatDate(new Date(log.flight_date))}
          </p>
          <h3 className="text-lg font-semibold text-gray-900 mt-1">
            {log.site_id ? `Site: ${log.site_id}` : "No site"}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-blue-600">
            {log.distance_xcontest_km ? `${log.distance_xcontest_km.toFixed(1)}km` : "—"}
          </p>
          <p className="text-sm text-gray-500">
            {formatDuration(log.duration_sec)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div>
          <p className="text-gray-400">Max Alt</p>
          <p className="font-semibold text-gray-900">
            {log.max_altitude_m ? `${log.max_altitude_m}m` : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Thermal</p>
          <p className="font-semibold text-gray-900">
            {log.max_thermal_ms ? `${log.max_thermal_ms.toFixed(1)}m/s` : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Wind</p>
          <p className="font-semibold text-gray-900">
            {log.wind_speed_kmh ? `${log.wind_speed_kmh.toFixed(0)}km/h` : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
