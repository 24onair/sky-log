import { NextResponse } from "next/server";

function sbFetch(path: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
  return fetch(url, {
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      "Content-Type": "application/json",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await sbFetch(`flight_logs?id=eq.${id}&limit=1`);
  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: 500 });
  const rows = JSON.parse(text);
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
