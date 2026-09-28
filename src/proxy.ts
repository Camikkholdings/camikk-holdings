import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-camikk-language", request.nextUrl.searchParams.get("lang") === "en" ? "en" : "es");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: "/" };
