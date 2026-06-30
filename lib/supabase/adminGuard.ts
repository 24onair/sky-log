import { NextResponse } from "next/server";
import { createClient } from "./server";

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
 * 본인 프로필 조회는 RLS(auth.uid() = id) 로 허용된다.
 * 운영자 추가/해제는 코드 수정 없이 profiles.role 값만 바꾸면 된다.
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
    .select("role")
    .eq("id", user.id)
    .single();

  if ((profile as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
