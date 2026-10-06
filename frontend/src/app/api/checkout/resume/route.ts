import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.redirect(new URL("/comenzar-llc", req.nextUrl.origin));
    }

    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    const redirectUrl = `${backendUrl}/api/checkout/resume?token=${encodeURIComponent(
      token
    )}&siteUrl=${encodeURIComponent(req.nextUrl.origin)}`;

    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    console.error("Error in frontend resume route:", err);
    return NextResponse.redirect(new URL("/comenzar-llc", req.nextUrl.origin));
  }
}
