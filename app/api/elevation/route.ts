import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { locations } = await req.json();
    const r = await fetch("https://api.opentopodata.org/v1/srtm30m", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations }),
    });
    if (!r.ok) return NextResponse.json({ error: `upstream ${r.status}` }, { status: 502 });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
