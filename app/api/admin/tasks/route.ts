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
  const tasksRes = await sbFetch(
    "tasks?select=id,name,task_date,task_type,is_public,distance_km,created_at,user_id&order=created_at.desc",
    "GET"
  );
  const tasksText = await tasksRes.text();
  if (!tasksRes.ok) return NextResponse.json({ error: tasksText }, { status: 500 });
  const tasks = JSON.parse(tasksText);

  const profilesRes = await sbFetch("profiles?select=id,email,name", "GET");
  const profiles: { id: string; email: string; name: string }[] =
    profilesRes.ok ? JSON.parse(await profilesRes.text()) : [];

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const merged = tasks.map((t: { user_id: string }) => ({
    ...t,
    profiles: profileMap[t.user_id] ?? null,
  }));

  return NextResponse.json(merged);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const res = await sbFetch(`tasks?id=eq.${id}`, "DELETE");
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}
