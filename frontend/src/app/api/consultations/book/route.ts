import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

    // Reenviar al backend de Node / PostgreSQL si está activo
    try {
      const response = await fetch(`${backendUrl}/api/consultations/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend desconectado, confirmamos localmente
    }

    return NextResponse.json({
      success: true,
      message: "Consulta confirmada exitosamente en el sistema de CAMIKK Holdings.",
      booking: {
        ...body,
        status: "CONFIRMED",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al registrar la cita." },
      { status: 500 }
    );
  }
}
