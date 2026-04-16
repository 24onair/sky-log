export type WaypointType = "D" | "T" | "G"; // Departure / Turnpoint / Goal
export type TaskType = "RACE" | "CLASSIC" | "FAI";

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number; // meters (0 if unknown)
  radius: number;   // meters
  type: WaypointType;
}

export interface Task {
  id: string;
  user_id: string;
  name: string;
  task_date: string;   // YYYY-MM-DD
  task_type: TaskType;
  is_public: boolean;
  waypoints: Waypoint[];
  distance_km: number | null;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at" | "updated_at">;
export type TaskUpdate = Partial<TaskInsert>;
