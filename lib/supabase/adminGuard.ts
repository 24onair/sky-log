import { NextResponse } from "next/server";
import { createClient } from "./server";

// 전환기 폴백 — profiles.role 적용 + 소유자 승격 확인 후 제거 가능.
const ADMIN_EMAIL_FALLBACK = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";

/**
 * 어드민 API 라우트 가드 (실제 인가).
 * 쿠키 세션으로 요청자를 검증하고, profiles.role === 'admin' 인지 확인한다.
 * 어드민이 아니면 NextResponse(401/403)를 반환하고, 통과하면 null을 반환하므로
 * 핸들러 최상단에서:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 *
 * 형태로 사용한다. service role 키는 RLS를 우회하므로 이 가드 없이는
 * 누구나 어드민 API를 호출할 수 있다.
 *
 * role 컬럼이 아직 없거나 미승격이어도 잠기지 않도록 이메일 폴백을 둔다(전환기).
 * 본인 프로필 조회는 RLS(auth.uid() = id) 로 허용된다. select("*")로 방어 조회.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  const isAdmin = role === "admin" || user.email === ADMIN_EMAIL_FALLBACK;

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
