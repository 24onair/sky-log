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

export async function GET() {
  const res = await sbFetch("profiles?select=*&order=created_at.desc", "GET");
  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: 500 });
  return NextResponse.json(JSON.parse(text));
}

export async function PATCH(req: Request) {
  const { id, is_active } = await req.json();
  const res = await sbFetch(`profiles?id=eq.${id}`, "PATCH", { is_active });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}
