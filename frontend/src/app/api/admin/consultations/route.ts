import { NextRequest, NextResponse } from "next/server";
import { adminDataStore, type AdminConsultation } from "@/lib/adminData";

export async function GET() {
  try {
    try {
      const res = await fetch("http://localhost:4000/api/admin/consultations", {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Mapeamos desde Prisma
          const mapped: AdminConsultation[] = data.map((b: any) => ({
            id: b.id,
            orderId: b.orderId,
            clientName: b.clientName || b.client?.fullName || "Cliente",
            clientEmail: b.clientEmail || b.client?.email || "",
            clientPhone: b.clientPhone || b.client?.phone || "",
            topic: b.topic || "Consulta Empresarial",
            description: b.description || "",
            scheduledDate: b.scheduledDate ? String(b.scheduledDate).split("T")[0] : "",
            timeSlot: b.timeSlot || "10:15 AM",
            timeZone: b.timeZone || "America/New_York (EST)",
            durationMinutes: b.durationMinutes || 45,
            status: b.status || "CONFIRMED",
            meetingLink: b.meetingLink || "https://meet.google.com/new",
            notes: b.notes || "",
            totalPaid: Number(b.order?.totalAmount) || 50,
            stripeSessionId: b.order?.stripeSessionId || "",
            createdAt: b.createdAt || new Date().toISOString(),
          }));
          return NextResponse.json(mapped);
        }
      }
    } catch {
      // Backend no disponible
    }

    return NextResponse.json(adminDataStore.getConsultations());
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener citas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newConsultation: AdminConsultation = {
      id: `cs-${Date.now()}`,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      topic: body.topic || "Consulta Empresarial",
      description: body.description || "",
      scheduledDate: body.scheduledDate,
      timeSlot: body.timeSlot,
      timeZone: body.timeZone || "America/New_York (EST)",
      durationMinutes: 45,
      status: "CONFIRMED",
      meetingLink: body.meetingLink || `https://meet.google.com/cmk-${Date.now()}`,
      notes: body.notes || "",
      totalPaid: 50,
      createdAt: new Date().toISOString(),
    };

    adminDataStore.addConsultation(newConsultation);
    return NextResponse.json(newConsultation);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al crear cita" },
      { status: 500 }
    );
  }
}
