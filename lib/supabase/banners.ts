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
  const supabase = createClient();
  const { data, error } = await supabase
    .from("banners")
    .insert(banner)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Banner;
}

export async function updateBanner(id: string, updates: BannerUpdate): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("banners").update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBanner(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
