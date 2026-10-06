import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const sessionId = req.nextUrl.searchParams.get("session_id") || "";
    const token = req.nextUrl.searchParams.get("token") || "";

    const origin =
      req.headers.get("origin") ||
      (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null) ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const res = await fetch(
      `${backendUrl}/api/checkout/verify-session?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}&site_url=${encodeURIComponent(origin)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    console.error("Error al verificar sesión en frontend:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al verificar la sesión." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const body = await req.json().catch(() => ({}));
    const origin =
      body.siteUrl ||
      req.headers.get("origin") ||
      (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null) ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const res = await fetch(`${backendUrl}/api/checkout/verify-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, siteUrl: origin }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    console.error("Error al verificar sesión en frontend (POST):", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al verificar la sesión." },
      { status: 500 }
    );
  }
}
