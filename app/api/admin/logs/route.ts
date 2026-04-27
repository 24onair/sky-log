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
  const logsRes = await sbFetch(
    "flight_logs?select=id,user_id,flight_date,duration_sec,distance_xcontest_km,distance_straight_km,site_id,memo,igc_parsed,created_at&order=flight_date.desc",
    "GET"
  );
  const logsText = await logsRes.text();
  if (!logsRes.ok) return NextResponse.json({ error: logsText }, { status: 500 });
  const logs = JSON.parse(logsText);

  const profilesRes = await sbFetch("profiles?select=id,email,name", "GET");
  const profiles: { id: string; email: string; name: string }[] =
    profilesRes.ok ? JSON.parse(await profilesRes.text()) : [];

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const merged = logs.map((l: { user_id: string }) => ({
    ...l,
    profiles: profileMap[l.user_id] ?? null,
  }));

  return NextResponse.json(merged);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const res = await sbFetch(`flight_logs?id=eq.${id}`, "DELETE");
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}
