import { createClient } from "./client";
import { WaypointSet, WaypointSetInsert, WaypointSetUpdate } from "@/lib/schemas/waypointSet";

export async function getWaypointSets(userId: string): Promise<WaypointSet[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("waypoint_sets")
    .select("*")
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as WaypointSet[];
}

export async function getWaypointSetById(userId: string, id: string): Promise<WaypointSet | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("waypoint_sets")
    .select("*")
    .eq("id", id)
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .single();
  if (error) return null;
  return data as WaypointSet;
}

export async function createWaypointSet(userId: string, set: WaypointSetInsert): Promise<WaypointSet> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("waypoint_sets")
    .insert({ ...set, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WaypointSet;
}

export async function updateWaypointSet(userId: string, id: string, updates: WaypointSetUpdate): Promise<WaypointSet> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("waypoint_sets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WaypointSet;
}

export async function deleteWaypointSet(userId: string, id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("waypoint_sets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
