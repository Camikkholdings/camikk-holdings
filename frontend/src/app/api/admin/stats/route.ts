import { NextResponse } from "next/server";
import { adminDataStore } from "@/lib/adminData";

export async function GET() {
  try {
    // Intentar consultar al backend en localhost:4000
    try {
      const res = await fetch("http://localhost:4000/api/admin/stats", {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        // Si el backend tiene datos, combinamos
        if (data.consultations?.total > 0 || data.llcs?.total > 0) {
          return NextResponse.json(data);
        }
      }
    } catch {
      // Backend offline o no responde, usamos el store
    }

    const stats = adminDataStore.getStats();
    return NextResponse.json(stats);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
