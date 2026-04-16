"use client";

import { useState } from "react";
import { parseIGC } from "@/lib/igc/parser";
import { FlightLogInsert } from "@/lib/schemas/logbook";

interface IGCUploaderProps {
  onParsed?: (data: Partial<FlightLogInsert>) => void;
}

export function IGCUploader({ onParsed }: IGCUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".igc")) {
      setError("Please upload an IGC file");
      return;
    }

    setIsLoading(true);
    setError(null);

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
      });
    } catch (err) {
      setError(`Failed to parse IGC file: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <div
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <label className="cursor-pointer block">
          <input
            type="file"
            accept=".igc"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
            disabled={isLoading}
          />
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">📁</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isLoading ? "Processing..." : "Drag and drop IGC file or click to upload"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                IGC files are automatically parsed
              </p>
            </div>
          </div>
        </label>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
