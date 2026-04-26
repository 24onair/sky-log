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
  const { title, body, image_url, is_active } = await req.json();
  const res = await sbFetch("announcements", "POST", { title, body, image_url, is_active });
  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: 500 });
  const rows = JSON.parse(text);
  return NextResponse.json(Array.isArray(rows) ? rows[0] : rows);
}

export async function PATCH(req: Request) {
  const { id, ...updates } = await req.json();
  const res = await sbFetch(`announcements?id=eq.${id}`, "PATCH", updates);
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const res = await sbFetch(`announcements?id=eq.${id}`, "DELETE");
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}
