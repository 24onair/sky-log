import { createClient } from "./client";
import {
  FlightLog,
  FlightLogInsert,
  FlightLogUpdate,
  flightLogSchema,
} from "@/lib/schemas/logbook";

export async function getFlightLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<FlightLog[]> {
  const supabase = createClient();

  let query = supabase
    .from("flight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("flight_date", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  if (options?.startDate) {
    query = query.gte("flight_date", options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte("flight_date", options.endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch flight logs: ${error.message}`);
  }

  return data?.map((log) => flightLogSchema.parse(log)) || [];
}

export async function getFlightLogById(
  userId: string,
  logId: string
): Promise<FlightLog | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flight_logs")
    .select("*")
    .eq("id", logId)
    .eq("user_id", userId)
    .single();

  if (error?.code === "PGRST116") {
    return null; // Not found
  }

  if (error) {
    throw new Error(`Failed to fetch flight log: ${error.message}`);
  }

  return flightLogSchema.parse(data);
}

export async function createFlightLog(
  userId: string,
  input: FlightLogInsert
): Promise<FlightLog> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flight_logs")
    .insert([
      {
        user_id: userId,
        ...input,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create flight log: ${error.message}`);
  }

  return flightLogSchema.parse(data);
}

export async function updateFlightLog(
  userId: string,
  logId: string,
  input: FlightLogUpdate
): Promise<FlightLog> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flight_logs")
    .update(input)
    .eq("id", logId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update flight log: ${error.message}`);
  }

  return flightLogSchema.parse(data);
}

export async function deleteFlightLog(
  userId: string,
  logId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("flight_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete flight log: ${error.message}`);
  }
}

export async function getFlightLogStats(userId: string): Promise<{
  totalFlights: number;
  totalDurationSec: number;
  totalXcDistanceKm: number;
  longestFlightSec: number;
  longestDistanceKm: number;
  highestAltitudeM: number;
  highestThermalMs: number;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flight_logs")
    .select(
      "duration_sec, distance_xcontest_km, max_altitude_m, max_thermal_ms"
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to fetch flight stats: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      totalFlights: 0,
      totalDurationSec: 0,
      totalXcDistanceKm: 0,
      longestFlightSec: 0,
      longestDistanceKm: 0,
      highestAltitudeM: 0,
      highestThermalMs: 0,
    };
  }

  return {
    totalFlights: data.length,
    totalDurationSec: data.reduce((sum, log) => sum + (log.duration_sec || 0), 0),
    totalXcDistanceKm: data.reduce(
      (sum, log) => sum + (log.distance_xcontest_km || 0),
      0
    ),
    longestFlightSec: Math.max(...data.map((log) => log.duration_sec || 0)),
    longestDistanceKm: Math.max(
      ...data.map((log) => log.distance_xcontest_km || 0)
    ),
    highestAltitudeM: Math.max(...data.map((log) => log.max_altitude_m || 0)),
    highestThermalMs: Math.max(...data.map((log) => log.max_thermal_ms || 0)),
  };
}
