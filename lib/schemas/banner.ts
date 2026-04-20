export interface Banner {
  id: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type BannerInsert = Omit<Banner, "id" | "created_at">;
export type BannerUpdate = Partial<BannerInsert>;
