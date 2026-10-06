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
      await fetch(`${backendUrl}/api/admin/llcs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // Ignorar si backend está offline
    }

    const updated = adminDataStore.updateDossier(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Expediente no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, dossier: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar expediente" },
      { status: 500 }
    );
  }
}
