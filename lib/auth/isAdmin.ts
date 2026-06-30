"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * role 기반 어드민 판정 (클라이언트 UI 게이팅용).
 * profiles.role === 'admin' 이면 어드민. 본인 프로필 조회는 RLS(auth.uid() = id)로 허용.
 *
 * 주의: 이건 화면 노출용 UX 게이팅일 뿐, 실제 인가는 서버의 requireAdmin()이 한다.
 */
export async function checkIsAdmin(
  user: { id: string } | null
): Promise<boolean> {
  if (!user) return false;
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return (data as { role?: string } | null)?.role === "admin";
}
