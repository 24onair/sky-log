import { createClient } from "./client";
import { Banner, BannerInsert, BannerUpdate } from "@/lib/schemas/banner";

const BUCKET = "banners";

export async function getActiveBanners(): Promise<Banner[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(4);
  if (error) return [];
  return data as Banner[];
}

export async function getAllBanners(): Promise<Banner[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Banner[];
}

export async function uploadBannerImage(file: File): Promise<string> {
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

export async function createBanner(banner: BannerInsert): Promise<Banner> {
  console.log("[createBanner] calling API route", banner);
  const res = await fetch("/api/admin/banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(banner),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "등록 실패");
  return json as Banner;
}

export async function updateBanner(id: string, updates: BannerUpdate): Promise<void> {
  const res = await fetch("/api/admin/banners", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "업데이트 실패"); }
}

export async function deleteBanner(id: string): Promise<void> {
  const res = await fetch("/api/admin/banners", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "삭제 실패"); }
}
