import { createClient } from "./client";
import { Announcement, AnnouncementInsert, AnnouncementUpdate } from "@/lib/schemas/announcement";

const BUCKET = "announcements";

export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return (data as Announcement) ?? null;
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Announcement[];
}

export async function uploadAnnouncementImage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createAnnouncement(a: AnnouncementInsert): Promise<Announcement> {
  const res = await fetch("/api/admin/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(a),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "등록 실패");
  return json as Announcement;
}

export async function updateAnnouncement(id: string, updates: AnnouncementUpdate): Promise<void> {
  const res = await fetch("/api/admin/announcements", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "업데이트 실패"); }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const res = await fetch("/api/admin/announcements", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "삭제 실패"); }
}
