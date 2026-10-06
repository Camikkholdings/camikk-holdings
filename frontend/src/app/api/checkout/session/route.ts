import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Falta session_id." }, { status: 400 });
    }

    if (sessionId.startsWith("mock_")) {
      return NextResponse.json({
        id: sessionId,
        status: "complete",
        payment_status: "paid",
        customer_email: req.nextUrl.searchParams.get("email") || "cliente@ejemplo.com",
        metadata: {
          fullName: req.nextUrl.searchParams.get("name") || "",
          phone: req.nextUrl.searchParams.get("phone") || "",
          email: req.nextUrl.searchParams.get("email") || "",
          state: req.nextUrl.searchParams.get("state") || "",
          companyName: req.nextUrl.searchParams.get("company") || "",
          secondChoiceName: req.nextUrl.searchParams.get("second_choice") || "",
          businessActivity: req.nextUrl.searchParams.get("activity") || "",
          ownersCount: req.nextUrl.searchParams.get("owners") || "1",
          topic: req.nextUrl.searchParams.get("topic") || "Asesoría Empresarial",
          scheduledDate: req.nextUrl.searchParams.get("scheduledDate") || "",
          timeSlot: req.nextUrl.searchParams.get("timeSlot") || "",
          timeZone: req.nextUrl.searchParams.get("timeZone") || "America/Bogota",
        },
      });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe no está configurado." }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_email || session.customer_details?.email,
      metadata: session.metadata || {},
    });
  } catch (err: unknown) {
    console.error("Error retrieving Stripe session:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al consultar la sesión." },
      { status: 500 }
    );
  }
}
