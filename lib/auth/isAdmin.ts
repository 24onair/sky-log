"use client";

import { createClient } from "@/lib/supabase/client";

// 전환기 폴백 — profiles.role 컬럼 적용 + 소유자 승격이 확인되면 제거 가능.
// (컬럼/승격이 운영 DB에 반영되기 전까지 어드민이 잠기는 사고를 막는다.)
const ADMIN_EMAIL_FALLBACK = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";

/**
 * role 기반 어드민 판정 (클라이언트 UI 게이팅용).
 * 주 기준은 profiles.role === 'admin'. role 컬럼이 아직 없거나 미승격이어도
 * 잠기지 않도록 이메일 폴백을 둔다(전환기). select("*")로 방어 조회 →
 * role 컬럼 부재 시에도 쿼리가 깨지지 않음.
 *
 * 주의: 이건 화면 노출용 UX 게이팅일 뿐, 실제 인가는 서버의 requireAdmin()이 한다.
 */
export async function checkIsAdmin(
  user: { id: string; email?: string | null } | null
): Promise<boolean> {
  if (!user) return false;
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const role = (data as { role?: string } | null)?.role;
  return role === "admin" || (!!user.email && user.email === ADMIN_EMAIL_FALLBACK);
}
