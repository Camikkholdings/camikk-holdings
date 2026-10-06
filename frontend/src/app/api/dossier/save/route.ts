import { NextRequest, NextResponse } from "next/server";

// Simulación de persistencia en memoria/sesión (en producción se conecta a base de datos como Postgres/Prisma o CRM)
const dossierDrafts = new Map<string, unknown>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    
    // Si viene token, actualizar borrador en BD
    if (body.token) {
      const res = await fetch(`${backendUrl}/api/dossiers/${body.token}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body.draft || body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // Si no viene token, inicializar borrador en BD
    const res = await fetch(`${backendUrl}/api/dossiers/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.draft || body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al guardar borrador." },
      { status: 500 }
    );
  }
}
