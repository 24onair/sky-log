import { Waypoint } from "./task";

export interface WaypointSet {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  waypoints: Waypoint[];
  created_at: string;
  updated_at: string;
}

export type WaypointSetInsert = Omit<WaypointSet, "id" | "user_id" | "created_at" | "updated_at">;
export type WaypointSetUpdate = Partial<WaypointSetInsert>;
