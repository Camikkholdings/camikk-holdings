import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Validaciones críticas de la Sección H (Certificaciones finales)
    if (!data.certifications?.accurate || !data.certifications?.authorized || !data.certifications?.signature?.trim()) {
      return NextResponse.json(
        { error: "Debe aceptar las certificaciones legales y firmar electrónicamente el formulario." },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    
    // Si viene con token
    if (data.token) {
      const res = await fetch(`${backendUrl}/api/dossiers/${data.token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return NextResponse.json(result, { status: res.status });
    }

    // Si no trae token, inicializar y luego radicar
    const initRes = await fetch(`${backendUrl}/api/dossiers/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const initData = await initRes.json();
    if (!initData.token) {
      throw new Error("No se pudo inicializar el expediente en la base de datos.");
    }

    const res = await fetch(`${backendUrl}/api/dossiers/${initData.token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return NextResponse.json(result, { status: res.status });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar el expediente." },
      { status: 500 }
    );
  }
}
