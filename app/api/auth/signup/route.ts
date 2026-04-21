import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { email, password, name, phone, nickname, wing_brand, wing_name, wing_grade } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase
    .from("profiles")
    .update({ name, phone: phone || null, nickname: nickname || null, wing_brand: wing_brand || null, wing_name: wing_name || null, wing_grade: wing_grade || null, is_active: false })
    .eq("id", data.user.id);

  return NextResponse.json({ ok: true });
}
