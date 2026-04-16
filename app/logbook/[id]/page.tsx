"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getFlightLogById,
  updateFlightLog,
  deleteFlightLog,
} from "@/lib/supabase/logbook";
import { FlightLog, FlightLogUpdate, FlightLogInsert } from "@/lib/schemas/logbook";
import { FlightLogForm } from "@/components/FlightLogForm";
import { formatDate, formatTime, formatDuration } from "@/lib/utils/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FlightDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [log, setLog] = useState<FlightLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      const p = await params;
      setId(p.id);

      try {
        setLoading(true);
        setError(null);

        // TODO: 실제 user_id 가져오기 (auth context 필요)
        const userId = "placeholder-user-id";

        const data = await getFlightLogById(userId, p.id);
        if (!data) {
          setError("Flight not found");
        } else {
          setLog(data);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load flight"
        );
      } finally {
        setLoading(false);
      }
    };

    resolveParams();
  }, [params]);

  const handleUpdate = async (data: FlightLogInsert | FlightLogUpdate) => {
    if (!log) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // TODO: 실제 user_id 가져오기 (auth context 필요)
      const userId = "placeholder-user-id";

      const updated = await updateFlightLog(userId, id, data as FlightLogUpdate);
      setLog(updated);
      setIsEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update flight";
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this flight?")) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      // TODO: 실제 user_id 가져오기 (auth context 필요)
      const userId = "placeholder-user-id";

      await deleteFlightLog(userId, id);
      router.push("/logbook");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete flight"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-gray-600">Loading flight details...</p>
        </div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/logbook"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Logbook
          </Link>
          <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-700">{error || "Flight not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/logbook"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Logbook
          </Link>
          <div className="flex items-center justify-between mt-4">
            <h1 className="text-4xl font-bold text-gray-900">Flight Details</h1>
            {!isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {isEditing ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
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
              sites={[
                // TODO: 실제 sites 데이터 불러오기
                { id: "site-1", name: "Deo Bong" },
                { id: "site-2", name: "Soraesan" },
                { id: "site-3", name: "Cheonggyesan" },
              ]}
              isEditing={true}
            />
            <button
              onClick={() => setIsEditing(false)}
              className="mt-4 px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 상세 정보 */}
            <div className="lg:col-span-2 space-y-4">
              {/* 기본 정보 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Flight Information
                </h2>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-gray-600">Date</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatDate(new Date(log.flight_date))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Time</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatTime(new Date(log.flight_date))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Duration</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatDuration(log.duration_sec)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Site</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {log.site_id}
                    </dd>
                  </div>
                  {log.igc_parsed && (
                    <div>
                      <dt className="text-sm text-gray-600">Source</dt>
                      <dd className="text-lg font-semibold text-green-600">
                        IGC Parsed
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* 거리 정보 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Distance
                </h2>
                <dl className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <dt className="text-sm text-gray-600">Straight</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {log.distance_straight_km
                        ? `${log.distance_straight_km.toFixed(1)}km`
                        : "—"}
                    </dd>
                  </div>
                  <div className="text-center">
                    <dt className="text-sm text-gray-600">Track</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {log.distance_track_km
                        ? `${log.distance_track_km.toFixed(1)}km`
                        : "—"}
                    </dd>
                  </div>
                  <div className="text-center">
                    <dt className="text-sm text-gray-600">XContest</dt>
                    <dd className="text-2xl font-bold text-blue-600">
                      {log.distance_xcontest_km
                        ? `${log.distance_xcontest_km.toFixed(1)}km`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 고도 및 써멀 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Performance
                </h2>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600">Max Altitude</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {log.max_altitude_m ? `${log.max_altitude_m}m` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Max Thermal</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {log.max_thermal_ms
                        ? `${log.max_thermal_ms.toFixed(1)}m/s`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 날씨 */}
              {(log.wind_direction ||
                log.wind_speed_kmh ||
                log.weather_condition) && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Weather
                  </h2>
                  <dl className="space-y-3">
                    {log.wind_direction && (
                      <div>
                        <dt className="text-sm text-gray-600">Wind Direction</dt>
                        <dd className="text-lg font-semibold text-gray-900">
                          {log.wind_direction}°
                        </dd>
                      </div>
                    )}
                    {log.wind_speed_kmh && (
                      <div>
                        <dt className="text-sm text-gray-600">Wind Speed</dt>
                        <dd className="text-lg font-semibold text-gray-900">
                          {log.wind_speed_kmh.toFixed(1)}km/h
                        </dd>
                      </div>
                    )}
                    {log.weather_condition && (
                      <div>
                        <dt className="text-sm text-gray-600">Condition</dt>
                        <dd className="text-lg font-semibold text-gray-900">
                          {log.weather_condition}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* 메모 */}
              {log.memo && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Notes
                  </h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{log.memo}</p>
                </div>
              )}
            </div>

            {/* 사이드바 */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Metadata
                </h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-600">Created</dt>
                    <dd className="font-medium text-gray-900">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Updated</dt>
                    <dd className="font-medium text-gray-900">
                      {log.updated_at
                        ? new Date(log.updated_at).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Flight ID</dt>
                    <dd className="font-mono text-xs text-gray-700 break-all">
                      {log.id}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
