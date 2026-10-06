import { NextRequest, NextResponse } from "next/server";

export const STANDARD_SLOTS = [
  "08:00 AM",
  "08:45 AM",
  "09:30 AM",
  "10:15 AM",
  "11:00 AM",
  "11:45 AM",
  "01:15 PM",
  "02:00 PM",
  "02:45 PM",
  "03:30 PM",
  "04:15 PM",
];

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

    let bookedSlots: string[] = [];

    try {
      const response = await fetch(`${backendUrl}/api/consultations/slots?date=${date}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        bookedSlots = data.bookedSlots || [];
      }
    } catch {
      // Backend no disponible en este momento, fallback
    }

    return NextResponse.json({
      date,
      timeZone: "America/New_York",
      allSlots: STANDARD_SLOTS,
      bookedSlots,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener horarios." },
      { status: 500 }
    );
  }
}
