import Stripe from "stripe";
import { STATE_FEES, CAMIKK_SERVICE_FEE, type StateName } from "@/data/stateFees";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia" as unknown as undefined,
    })
  : null;

export type LlcCheckoutPayload = {
  fullName: string;
  phone: string;
  email: string;
  state: StateName;
  companyName: string;
  secondChoiceName?: string;
  businessActivity: string;
  ownersCount: "1" | "2" | "3+";
  autoRenewRegisteredOffice?: boolean;
  language?: "es" | "en";
  siteUrl?: string;
  confirmations: {
    accurate: boolean;
    stateApproval: boolean;
    additionalFees: boolean;
    termsAccepted: boolean;
  };
};

export type ConsultationCheckoutPayload = {
  fullName: string;
  phone: string;
  email: string;
  topic: string;
  description?: string;
  scheduledDate?: string;
  timeSlot?: string;
  timeZone?: string;
  language?: "es" | "en";
};

export async function createLlcCheckoutSession(
  payload: LlcCheckoutPayload,
  siteUrl: string
): Promise<{ url: string; sessionId: string; isMock?: boolean }> {
  const stateFee = STATE_FEES[payload.state];
  if (stateFee === undefined) {
    throw new Error(`Estado no válido: ${payload.state}`);
  }

  const totalAmount = CAMIKK_SERVICE_FEE + stateFee;
  const lang = payload.language || "es";

  // Si no hay Stripe Secret Key configurada, operamos en modo DEMO/SIMULACIÓN seguro para pruebas
  if (!stripe) {
    const mockSessionId = `mock_llc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const returnUrl = new URL("/dossier", siteUrl);
    returnUrl.searchParams.set("session_id", mockSessionId);
    returnUrl.searchParams.set("state", payload.state);
    returnUrl.searchParams.set("company", payload.companyName);
    returnUrl.searchParams.set("email", payload.email);
    returnUrl.searchParams.set("name", payload.fullName);
    returnUrl.searchParams.set("phone", payload.phone);
    returnUrl.searchParams.set("activity", payload.businessActivity);
    returnUrl.searchParams.set("owners", payload.ownersCount);
    if (payload.secondChoiceName) {
      returnUrl.searchParams.set("second_choice", payload.secondChoiceName);
    }
    returnUrl.searchParams.set("lang", lang);
    returnUrl.searchParams.set("is_demo", "true");

    return {
      url: returnUrl.toString(),
      sessionId: mockSessionId,
      isMock: true,
    };
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: payload.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "CAMIKK Holdings — Creación de LLC y Asesoría Legal",
            description:
              "Incluye Registro de LLC, EIN (IRS), Operating Agreement, Corporate Book, Sello y Certificados Corporativos, y 1 año de Registered Office.",
          },
          unit_amount: CAMIKK_SERVICE_FEE * 100,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Tarifa de registro estatal (State Filing Fee) — ${payload.state}`,
            description: `Tarifa oficial gubernamental requerida por el estado de ${payload.state}.`,
          },
          unit_amount: stateFee * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    adaptive_pricing: { enabled: false },
    payment_intent_data: payload.autoRenewRegisteredOffice
      ? { setup_future_usage: "off_session" }
      : undefined,
    metadata: {
      type: "llc_formation",
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      state: payload.state,
      companyName: payload.companyName,
      secondChoiceName: payload.secondChoiceName || "",
      businessActivity: payload.businessActivity,
      ownersCount: payload.ownersCount,
      autoRenewRegisteredOffice: payload.autoRenewRegisteredOffice ? "true" : "false",
      language: lang,
      siteUrl: payload.siteUrl || siteUrl,
      totalPaid: totalAmount.toString(),
      stateFee: stateFee.toString(),
      serviceFee: CAMIKK_SERVICE_FEE.toString(),
    },
    success_url: `${siteUrl}/dossier?session_id={CHECKOUT_SESSION_ID}&lang=${lang}`,
    cancel_url: `${siteUrl}/comenzar-llc?state=${encodeURIComponent(payload.state)}&lang=${lang}`,
  });

  return {
    url: session.url || `${siteUrl}/dossier?session_id=${session.id}&lang=${lang}`,
    sessionId: session.id,
  };
}

export async function createConsultationCheckoutSession(
  payload: ConsultationCheckoutPayload,
  siteUrl: string
): Promise<{ url: string; sessionId: string; isMock?: boolean }> {
  const CONSULTATION_FEE = 50;
  const lang = payload.language || "es";

  if (!stripe) {
    const mockSessionId = `mock_consult_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const returnUrl = new URL("/consulta-confirmada", siteUrl);
    returnUrl.searchParams.set("session_id", mockSessionId);
    returnUrl.searchParams.set("name", payload.fullName);
    returnUrl.searchParams.set("email", payload.email);
    returnUrl.searchParams.set("phone", payload.phone);
    returnUrl.searchParams.set("topic", payload.topic);
    if (payload.scheduledDate) returnUrl.searchParams.set("scheduledDate", payload.scheduledDate);
    if (payload.timeSlot) returnUrl.searchParams.set("timeSlot", payload.timeSlot);
    if (payload.timeZone) returnUrl.searchParams.set("timeZone", payload.timeZone);
    returnUrl.searchParams.set("lang", lang);
    returnUrl.searchParams.set("is_demo", "true");

    return {
      url: returnUrl.toString(),
      sessionId: mockSessionId,
      isMock: true,
    };
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: payload.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Consulta Empresarial Especializada (45 minutos) — CAMIKK",
            description: `Asesoría de 45 minutos con especialista de CAMIKK. Tema: ${payload.topic}${
              payload.scheduledDate && payload.timeSlot
                ? ` | Fecha: ${payload.scheduledDate} a las ${payload.timeSlot}`
                : ""
            }`,
          },
          unit_amount: CONSULTATION_FEE * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    adaptive_pricing: { enabled: false },
    metadata: {
      type: "consultation",
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      topic: payload.topic,
      description: payload.description || "",
      scheduledDate: payload.scheduledDate || "",
      timeSlot: payload.timeSlot || "",
      timeZone: "America/New_York",
      currency: "usd",
      fee: CONSULTATION_FEE.toString(),
      language: lang,
    },
    success_url: `${siteUrl}/consulta-confirmada?session_id={CHECKOUT_SESSION_ID}&lang=${lang}`,
    cancel_url: `${siteUrl}/consulta?lang=${lang}`,
  });

  return {
    url: session.url || `${siteUrl}/consulta-confirmada?session_id=${session.id}&lang=${lang}`,
    sessionId: session.id,
  };
}
