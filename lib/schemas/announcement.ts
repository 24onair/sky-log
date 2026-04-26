export interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type AnnouncementInsert = Omit<Announcement, "id" | "created_at">;
export type AnnouncementUpdate = Partial<AnnouncementInsert>;
