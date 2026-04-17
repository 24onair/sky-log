import { z } from "zod";

export const flightLogSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  
  // 필수 필드
  flight_date: z.coerce.date(),
  duration_sec: z.number().int().positive(),
  site_id: z.string().uuid().nullable(),
  
  // 비행 거리
  distance_straight_km: z.number().positive().max(999.999).nullable(),
  distance_track_km: z.number().positive().max(999.999).nullable(),
  distance_xcontest_km: z.number().positive().max(999.999).nullable(),
  
  // 고도/써멀
  max_altitude_m: z.number().int().positive().nullable(),
  max_thermal_ms: z.number().max(99.9).nullable(),
  
  // 날씨
  wind_direction: z.number().int().min(0).max(360).nullable(),
  wind_speed_kmh: z.number().min(0).max(999.9).nullable(),
  weather_condition: z.string().nullable(),
  
  // 기타
  memo: z.string().nullable(),
  igc_parsed: z.boolean().default(false),
  // IGC track data: [lon, lat, alt][] sampled for map/playback
  track_points: z.array(z.tuple([z.number(), z.number(), z.number()])).nullable().optional(),
  
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const flightLogInsertSchema = flightLogSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

export const flightLogUpdateSchema = flightLogInsertSchema.partial();

export type FlightLog = z.infer<typeof flightLogSchema>;
export type FlightLogInsert = z.infer<typeof flightLogInsertSchema>;
export type FlightLogUpdate = z.infer<typeof flightLogUpdateSchema>;
