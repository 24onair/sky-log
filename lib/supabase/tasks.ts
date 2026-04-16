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
