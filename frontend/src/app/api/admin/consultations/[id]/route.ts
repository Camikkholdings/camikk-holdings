import { NextRequest, NextResponse } from "next/server";
import { adminDataStore } from "@/lib/adminData";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Intentar actualizar en backend
    try {
      const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await fetch(`${backendUrl}/api/admin/consultations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // Ignorar si backend está offline
    }

    const updated = adminDataStore.updateConsultation(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, consultation: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar cita" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    adminDataStore.deleteConsultation(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar cita" },
      { status: 500 }
    );
  }
}
