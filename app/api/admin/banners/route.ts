import { NextResponse } from "next/server";

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
  const { image_url, link_url, is_active, sort_order } = await req.json();
  const res = await sbFetch("rpc/admin_insert_banner", "POST", {
    p_image_url: image_url,
    p_link_url: link_url,
    p_is_active: is_active,
    p_sort_order: sort_order,
  });
  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: 500 });
  return NextResponse.json(JSON.parse(text));
}

export async function PATCH(req: Request) {
  const { id, ...updates } = await req.json();
  const res = await sbFetch(`banners?id=eq.${id}`, "PATCH", updates);
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const res = await sbFetch(`banners?id=eq.${id}`, "DELETE");
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}
