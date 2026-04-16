"use client";

import { useState } from "react";
import { FlightLogInsert } from "@/lib/schemas/logbook";
import { IGCUploader } from "./IGCUploader";
import { formatDate, formatTime } from "@/lib/utils/format";

interface FlightLogFormProps {
  initialData?: FlightLogInsert;
  isSubmitting?: boolean;
  onSubmit: (data: FlightLogInsert) => Promise<void>;
  sites?: Array<{ id: string; name: string }>;
  isEditing?: boolean;
}

export function FlightLogForm({
  initialData,
  isSubmitting = false,
  onSubmit,
  sites = [],
  isEditing = false,
}: FlightLogFormProps) {
  const [formData, setFormData] = useState<FlightLogInsert>(
    initialData || {
      flight_date: new Date(),
      duration_sec: 0,
      site_id: "",
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.flight_date) {
      newErrors.flight_date = "Flight date is required";
    }
    if (!formData.duration_sec || formData.duration_sec <= 0) {
      newErrors.duration_sec = "Flight duration must be greater than 0";
    }
    if (!formData.site_id) {
      newErrors.site_id = "Takeoff site is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save flight log"
      );
    }
  };

  const handleInputChange = (
    field: keyof FlightLogInsert,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isEditing && <IGCUploader onParsed={(data) => setFormData((prev) => ({ ...prev, ...data }))} />}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 필수 필드 */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-lg font-semibold text-gray-900 px-2">
          Essential Information *
        </legend>

        {/* 비행 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Flight Date & Time *
          </label>
          <input
            type="datetime-local"
            value={formData.flight_date ? new Date(formData.flight_date).toISOString().slice(0, 16) : ""}
            onChange={(e) => {
              handleInputChange("flight_date", new Date(e.target.value));
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.flight_date ? "border-red-500" : "border-gray-300"
            }`}
            disabled={isSubmitting}
            required
          />
          {errors.flight_date && (
            <p className="text-sm text-red-600 mt-1">{errors.flight_date}</p>
          )}
        </div>

        {/* 비행시간 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Flight Duration (hours:minutes) *
          </label>
          <input
            type="text"
            placeholder="HH:MM"
            value={
              formData.duration_sec
                ? `${String(Math.floor(formData.duration_sec / 3600)).padStart(2, "0")}:${String(Math.floor((formData.duration_sec % 3600) / 60)).padStart(2, "0")}`
                : ""
            }
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(":").map(Number);
              const totalSeconds = (hours || 0) * 3600 + (minutes || 0) * 60;
              handleInputChange("duration_sec", totalSeconds);
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.duration_sec ? "border-red-500" : "border-gray-300"
            }`}
            disabled={isSubmitting}
            required
          />
          {errors.duration_sec && (
            <p className="text-sm text-red-600 mt-1">{errors.duration_sec}</p>
          )}
        </div>

        {/* 이륙장 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Takeoff Site *
          </label>
          <select
            value={formData.site_id || ""}
            onChange={(e) => handleInputChange("site_id", e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.site_id ? "border-red-500" : "border-gray-300"
            }`}
            disabled={isSubmitting}
            required
          >
            <option value="">Select a site...</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          {errors.site_id && (
            <p className="text-sm text-red-600 mt-1">{errors.site_id}</p>
          )}
        </div>
      </fieldset>

      {/* 거리 정보 */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-lg font-semibold text-gray-900 px-2">
          Distance Information
        </legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Straight (km)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.distance_straight_km || ""}
              onChange={(e) =>
                handleInputChange(
                  "distance_straight_km",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Track (km)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.distance_track_km || ""}
              onChange={(e) =>
                handleInputChange(
                  "distance_track_km",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              XContest (km)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.distance_xcontest_km || ""}
              onChange={(e) =>
                handleInputChange(
                  "distance_xcontest_km",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </fieldset>

      {/* 고도/써멀 */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-lg font-semibold text-gray-900 px-2">
          Altitude & Thermal
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Altitude (m)
            </label>
            <input
              type="number"
              value={formData.max_altitude_m || ""}
              onChange={(e) =>
                handleInputChange(
                  "max_altitude_m",
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Thermal (m/s)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.max_thermal_ms || ""}
              onChange={(e) =>
                handleInputChange(
                  "max_thermal_ms",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </fieldset>

      {/* 날씨 */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-lg font-semibold text-gray-900 px-2">
          Weather
        </legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wind Direction (°)
            </label>
            <input
              type="number"
              min="0"
              max="360"
              value={formData.wind_direction || ""}
              onChange={(e) =>
                handleInputChange(
                  "wind_direction",
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wind Speed (km/h)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.wind_speed_kmh || ""}
              onChange={(e) =>
                handleInputChange(
                  "wind_speed_kmh",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <input
              type="text"
              placeholder="Clear, cloudy, etc."
              value={formData.weather_condition || ""}
              onChange={(e) =>
                handleInputChange("weather_condition", e.target.value || null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </fieldset>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Notes
        </label>
        <textarea
          value={formData.memo || ""}
          onChange={(e) => handleInputChange("memo", e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={isSubmitting}
          placeholder="Add any notes about this flight..."
        />
      </div>

      {/* 제출 버튼 */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update Flight" : "Create Flight"}
        </button>
      </div>
    </form>
  );
}
