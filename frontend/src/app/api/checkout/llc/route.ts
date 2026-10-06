import { NextRequest, NextResponse } from "next/server";
import { createLlcCheckoutSession, type LlcCheckoutPayload } from "@/lib/stripe";
import { STATE_FEES } from "@/data/stateFees";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LlcCheckoutPayload;

    // Validaciones requeridas según documento (Página 1 y 4)
    if (!body.fullName?.trim()) {
      return NextResponse.json({ error: "El nombre completo es requerido." }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: "El número de teléfono es requerido." }, { status: 400 });
    }
    if (!body.email?.trim() || !body.email.includes("@")) {
      return NextResponse.json({ error: "El correo electrónico es inválido." }, { status: 400 });
    }
    if (!body.state || !(body.state in STATE_FEES)) {
      return NextResponse.json({ error: "Debe seleccionar un estado válido." }, { status: 400 });
    }
    if (!body.companyName?.trim()) {
      return NextResponse.json({ error: "El nombre deseado para la compañía es requerido." }, { status: 400 });
    }
    if (!body.businessActivity?.trim()) {
      return NextResponse.json({ error: "La actividad principal del negocio es requerida." }, { status: 400 });
    }
    if (!body.ownersCount) {
      return NextResponse.json({ error: "Debe indicar la cantidad de propietarios." }, { status: 400 });
    }
    if (
      !body.confirmations?.accurate ||
      !body.confirmations?.stateApproval ||
      !body.confirmations?.additionalFees ||
      !body.confirmations?.termsAccepted
    ) {
      return NextResponse.json(
        { error: "Debe aceptar todas las confirmaciones antes de proceder al pago." },
        { status: 400 }
      );
    }

    const origin =
      body.siteUrl ||
      req.headers.get("origin") ||
      (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null) ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${backendUrl}/api/checkout/llc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, siteUrl: origin }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    console.error("Error creating LLC checkout session:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar el checkout." },
      { status: 500 }
    );
  }
}
