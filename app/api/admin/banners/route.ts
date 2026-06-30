import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminGuard";

function sbFetch(path: string, method: string, body?: unknown) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
  return fetch(url, {
    method,
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { image_url, link_url, is_active, sort_order, slot } = await req.json();
  const res = await sbFetch("banners", "POST", {
    image_url,
    link_url,
    is_active: is_active ?? true,
    sort_order: sort_order ?? 0,
    slot: slot ?? "all",
  });
  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: 500 });
  // return=representation → 삽입된 행 배열. 첫 행만 반환(라우트가 Banner로 사용)
  const rows = JSON.parse(text);
  return NextResponse.json(Array.isArray(rows) ? rows[0] : rows);
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id, ...updates } = await req.json();
  const res = await sbFetch(`banners?id=eq.${id}`, "PATCH", updates);
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await req.json();
  const res = await sbFetch(`banners?id=eq.${id}`, "DELETE");
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}
