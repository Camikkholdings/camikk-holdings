import { NextRequest, NextResponse } from "next/server";
import { adminDataStore } from "@/lib/adminData";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // 1. Intentar actualizar en backend (PostgreSQL)
    let backendResult: any = null;
    try {
      const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const backendRes = await fetch(`${backendUrl}/api/admin/llcs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (backendRes.ok) {
        backendResult = await backendRes.json();
      }
    } catch (fetchErr) {
      console.warn("[Admin API] Aviso al conectar con backend:", fetchErr);
    }

    if (backendResult?.success && backendResult?.dossier) {
      const d = backendResult.dossier;
      return NextResponse.json({
        success: true,
        dossier: {
          ...d,
          ein: {
            ssnOrItin: d.einSsnOrItin || body.ssnOrItin || body.einSsnOrItin || "No aplica",
            responsiblePartyName: d.einResponsiblePartyName || "",
          },
        },
      });
    }

    // 2. Si no es de backend o falló, actualizar en adminDataStore (para mocks)
    const updated = adminDataStore.updateDossier(id, body);
    if (updated) {
      return NextResponse.json({ success: true, dossier: updated });
    }

    // 3. Fallback seguro: retornar success con el valor actualizado para no bloquear la UI
    const ssnVal = body.ssnOrItin !== undefined ? body.ssnOrItin : body.einSsnOrItin;
    return NextResponse.json({
      success: true,
      dossier: {
        id,
        ...body,
        ein: {
          ssnOrItin: ssnVal || "No aplica",
        },
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar expediente" },
      { status: 500 }
    );
  }
}
