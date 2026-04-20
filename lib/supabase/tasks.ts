import { createClient } from "./client";
import { Task, TaskInsert, TaskUpdate } from "@/lib/schemas/task";

export async function getTasks(userId: string): Promise<Task[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .order("task_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Task[];
}

export async function getTaskById(userId: string, taskId: string): Promise<Task | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .single();
  if (error) return null;
  return data as Task;
}

export async function createTask(userId: string, task: TaskInsert): Promise<Task> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: TaskUpdate
): Promise<Task> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function copyTask(userId: string, taskId: string): Promise<Task> {
  const source = await getTaskById(userId, taskId);
  if (!source) throw new Error("타스크를 찾을 수 없습니다");
  const { v4: uuid } = await import("uuid");
  const newTask: TaskInsert = {
    name: `${source.name} (복사)`,
    task_date: new Date().toISOString().slice(0, 10),
    task_type: source.task_type,
    is_public: false,
    waypoints: source.waypoints.map((wp) => ({ ...wp, id: uuid() })),
    distance_km: source.distance_km,
  };
  return createTask(userId, newTask);
}
