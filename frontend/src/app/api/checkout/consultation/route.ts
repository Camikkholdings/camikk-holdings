import { NextRequest, NextResponse } from "next/server";
import { createConsultationCheckoutSession, type ConsultationCheckoutPayload } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConsultationCheckoutPayload;

    if (!body.fullName?.trim()) {
      return NextResponse.json({ error: "El nombre completo es requerido." }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: "El teléfono es requerido." }, { status: 400 });
    }
    if (!body.email?.trim() || !body.email.includes("@")) {
      return NextResponse.json({ error: "El correo electrónico es inválido." }, { status: 400 });
    }
    const topic = body.topic?.trim() || "Consulta General";
    const payload = { ...body, topic };

    const origin = req.headers.get("origin");
    const host = req.headers.get("host") || "localhost:3057";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const siteUrl = origin || `${protocol}://${host}`;

    const result = await createConsultationCheckoutSession(payload, siteUrl);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Error creating consultation checkout session:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar la consulta." },
      { status: 500 }
    );
  }
}
