import { NextResponse } from "next/server";
import { createClient } from "./server";

// 어드민 이메일 — 클라이언트 UI 게이팅과 동일 기준(NEXT_PUBLIC_ADMIN_EMAIL)을 서버에서 재확인.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";

/**
 * 어드민 API 라우트 가드.
 * 쿠키 세션으로 요청자를 검증하고, 어드민이 아니면 NextResponse(401/403)를 반환한다.
 * 통과하면 null을 반환하므로 핸들러 최상단에서:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 *
 * 형태로 사용한다. service role 키는 RLS를 우회하므로 이 가드 없이는
 * 누구나 어드민 API를 호출할 수 있다.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
