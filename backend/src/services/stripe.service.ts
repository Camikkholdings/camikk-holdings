import Stripe from "stripe";
import crypto from "crypto";
import { ENV } from "../config/env";
import { prisma } from "../db/prisma";
import { mailService } from "./mail.service";
import { ghlService } from "./ghl.service";
import { getNextSubmissionNumber } from "./dossier.service";

export const CAMIKK_SERVICE_FEE = 725;

export const STATE_FEES: Record<string, number> = {
  Alabama: 200,
  Alaska: 250,
  Arizona: 50,
  Arkansas: 45,
  California: 70,
  Colorado: 50,
  Connecticut: 120,
  Delaware: 70,
  Florida: 125,
  Georgia: 110,
  Hawaii: 50,
  Idaho: 100,
  Illinois: 150,
  Indiana: 95,
  Iowa: 50,
  Kansas: 160,
  Kentucky: 40,
  Louisiana: 125,
  Maine: 175,
  Maryland: 100,
  Massachusetts: 500,
  Michigan: 50,
  Minnesota: 155,
  Mississippi: 50,
  Missouri: 50,
  Montana: 35,
  Nebraska: 100,
  Nevada: 425,
  "New Hampshire": 100,
  "New Jersey": 100,
  "New Mexico": 50,
  "New York": 200,
  "North Carolina": 125,
  "North Dakota": 135,
  Ohio: 99,
  Oklahoma: 100,
  Oregon: 100,
  Pennsylvania: 125,
  "Rhode Island": 150,
  "South Carolina": 110,
  "South Dakota": 150,
  Tennessee: 300,
  Texas: 300,
  Utah: 59,
  Vermont: 155,
  Virginia: 100,
  Washington: 200,
  "West Virginia": 100,
  Wisconsin: 130,
  Wyoming: 100,
};

export class StripeService {
  public stripe: Stripe | null = null;

  constructor() {
    if (ENV.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
        apiVersion: "2025-02-24.acacia" as unknown as undefined,
      });
    } else {
      console.warn("⚠️ Stripe: Secret key no configurada. Operando en modo DEMO/Simulación.");
    }
  }

  /**
   * Crea una sesión de Checkout para la creación de LLC ($725 + Tarifa Estatal)
   * Persiste inmediatamente el Cliente, la Orden y el Expediente con token multi-dispositivo en PostgreSQL.
   */
  async createLlcCheckoutSession(payload: {
    fullName: string;
    phone: string;
    email: string;
    state: string;
    companyName: string;
    secondChoiceName?: string;
    businessActivity: string;
    ownersCount: "1" | "2" | "3+";
    autoRenewRegisteredOffice?: boolean;
    language?: "es" | "en";
    siteUrl?: string;
    existingToken?: string;
  }): Promise<{ url: string; sessionId: string; token: string; isMock?: boolean }> {
    const stateFee = STATE_FEES[payload.state];
    if (stateFee === undefined) {
      throw new Error(`Estado no válido: ${payload.state}`);
    }

    const siteUrl = (payload.siteUrl || ENV.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const totalAmount = CAMIKK_SERVICE_FEE + stateFee;
    const token = payload.existingToken || `cmk_${crypto.randomBytes(24).toString("hex")}`;
    const count = payload.ownersCount === "3+" ? 3 : parseInt(payload.ownersCount, 10) || 1;
    let submissionNumber = await getNextSubmissionNumber();

    let sessionId: string;
    let sessionUrl: string;
    const isMock = !this.stripe;

    if (this.stripe) {
      let customerId: string | undefined;
      if (payload.email) {
        try {
          const normalizedEmail = payload.email.trim().toLowerCase();
          const existingCustomers = await this.stripe.customers.list({
            email: normalizedEmail,
            limit: 1,
          });
          if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
          } else {
            const newCustomer = await this.stripe.customers.create({
              email: normalizedEmail,
              name: payload.fullName,
              phone: payload.phone,
              metadata: {
                companyName: payload.companyName,
              },
            });
            customerId = newCustomer.id;
          }
        } catch (custErr) {
          console.warn("[Stripe] Aviso al buscar/crear cliente en Stripe:", custErr);
        }
      }

      const session = await this.stripe.checkout.sessions.create({
        ...(customerId
          ? { customer: customerId, customer_update: { name: "auto", address: "auto" } }
          : { customer_email: payload.email }),
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "CAMIKK Holdings — Creación de LLC y Asesoría Legal",
                description:
                  "Incluye Registro de LLC ante el estado, EIN (IRS), Operating Agreement, Corporate Book, Sello y Certificados Corporativos, y 1 año de Registered Office.",
              },
              unit_amount: CAMIKK_SERVICE_FEE * 100,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Tarifa de radicación estatal (State Filing Fee) — ${payload.state}`,
                description: `Tarifa oficial requerida por el Departamento de Estado de ${payload.state}.`,
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
          token,
          type: "LLC_FORMATION",
          fullName: payload.fullName,
          phone: payload.phone,
          email: payload.email,
          state: payload.state,
          companyName: payload.companyName,
          secondChoiceName: payload.secondChoiceName || "",
          businessActivity: payload.businessActivity,
          ownersCount: payload.ownersCount,
          autoRenewRegisteredOffice: payload.autoRenewRegisteredOffice ? "true" : "false",
          language: payload.language || "es",
          siteUrl,
          totalAmount: totalAmount.toString(),
          stateFee: stateFee.toString(),
        },
        success_url: `${siteUrl}/comenzar-llc?payment=success&token=${token}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/comenzar-llc?state=${encodeURIComponent(payload.state)}`,
      });

      sessionId = session.id;
      sessionUrl = session.url || `${siteUrl}/comenzar-llc?payment=success&token=${token}&session_id=${session.id}`;
    } else {
      sessionId = `mock_session_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      sessionUrl = `${siteUrl}/comenzar-llc?payment=success&token=${token}&session_id=${sessionId}`;
    }

    try {
      // 1. Guardar cliente en PostgreSQL
      const normalizedEmail = (payload.email || "").toLowerCase().trim();
      const client = await prisma.client.upsert({
        where: { email: normalizedEmail },
        update: {
          fullName: payload.fullName || undefined,
          phone: payload.phone || undefined,
        },
        create: {
          fullName: payload.fullName || "Cliente",
          email: normalizedEmail,
          phone: payload.phone || "",
        },
      });

      // 2. Guardar Orden en PostgreSQL como INCOMPLETE desde que oprime Pagar
      const order = await prisma.order.upsert({
        where: { stripeSessionId: sessionId },
        update: {
          totalAmount,
          state: payload.state,
        },
        create: {
          clientId: client.id,
          type: "LLC_FORMATION",
          state: payload.state,
          serviceFee: CAMIKK_SERVICE_FEE,
          stateFee,
          totalAmount,
          stripeSessionId: sessionId,
          status: "INCOMPLETE",
          paidAt: null,
          metadata: {
            companyName: payload.companyName,
            secondChoiceName: payload.secondChoiceName || "",
            businessActivity: payload.businessActivity,
            ownersCount: payload.ownersCount,
            autoRenewRegisteredOffice: payload.autoRenewRegisteredOffice ?? false,
            language: payload.language || "es",
            siteUrl,
          },
        },
      });

      // 3. Crear Expediente (Dossier) como INCOMPLETE en PostgreSQL para conservar todos los datos
      const initialMembers = [
        {
          id: "member-1",
          fullName: payload.fullName,
          address: "",
          cityStateZip: "",
          email: payload.email,
          phone: payload.phone,
          ownershipPercentage: Math.floor(100 / count),
          initialCapital: "",
          roleOrTitle: "Member / Propietario Principal",
        },
      ];

      for (let i = 1; i < count; i++) {
        initialMembers.push({
          id: `member-${i + 1}`,
          fullName: "",
          address: "",
          cityStateZip: "",
          email: "",
          phone: "",
          ownershipPercentage: Math.floor(100 / count),
          initialCapital: "",
          roleOrTitle: `Member / Co-propietario ${i + 1}`,
        });
      }

      let savedDossier = false;
      let retries = 0;

      if (payload.existingToken) {
        const existingDossier = await prisma.dossier.findUnique({
          where: { token },
        });
        if (existingDossier) {
          submissionNumber = existingDossier.submissionNumber || submissionNumber;
          await prisma.dossier.update({
            where: { id: existingDossier.id },
            data: {
              orderId: order.id,
              companyState: payload.state,
              companyName: payload.companyName,
            },
          });
          savedDossier = true;
          console.log(`ℹ️ Expediente existente reutilizado y vinculado a la nueva sesión. Token: ${token}, Expediente: ${submissionNumber}`);
        }
      }

      while (!savedDossier && retries < 5) {
        try {
          await prisma.dossier.create({
            data: {
              token,
              orderId: order.id,
              clientId: client.id,
              submissionNumber,
              currentStep: 1,
              status: "Pago pendiente",
              companyState: payload.state,
              companyName: payload.companyName,
              companySecondChoice: payload.secondChoiceName || "",
              companyActivity: payload.businessActivity,
              companyPhone: payload.phone,
              companyEmail: payload.email,
              totalMembers: count,
              signingAuthority: payload.fullName,
              membersData: initialMembers,
              einResponsiblePartyName: payload.fullName,
              einIrsActivity: payload.businessActivity,
              roPrimaryContactPerson: payload.fullName,
              roConfirmedService: true,
            },
          });
          savedDossier = true;
        } catch (dbErr: any) {
          if (dbErr.code === "P2002" && dbErr.meta?.target?.includes("submissionNumber")) {
            retries++;
            submissionNumber = await getNextSubmissionNumber();
          } else {
            throw dbErr;
          }
        }
      }

      console.log(`✅ Datos de LLC registrados inmediatamente en PostgreSQL como INCOMPLETE. Token: ${token}, Expediente: ${submissionNumber}`);
    } catch (dbErr) {
      console.error("Error al persistir expediente en PostgreSQL durante checkout:", dbErr);
    }

    // 4. Enviar notificación a GoHighLevel / LeadConnector como lead con "Pago pendiente"
    ghlService
      .sendLlcLead({
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        state: payload.state,
        companyName: payload.companyName,
        secondChoiceName: payload.secondChoiceName,
        businessActivity: payload.businessActivity,
        ownersCount: payload.ownersCount,
        autoRenewRegisteredOffice: payload.autoRenewRegisteredOffice,
        language: payload.language || "es",
        siteUrl,
        totalAmount,
        stateFee,
        serviceFee: CAMIKK_SERVICE_FEE,
        token,
        sessionId,
        submissionNumber,
        status: "Pago pendiente",
        paymentStatus: "Pago pendiente",
      })
      .catch((ghlErr) => {
        console.error("Error al despachar lead a GoHighLevel:", ghlErr);
      });

    return {
      url: sessionUrl,
      sessionId,
      token,
      isMock,
    };
  }

  /**
   * Crea una sesión de Checkout para la Consulta Empresarial ($50 USD / 45 min)
   */
  async createConsultationCheckoutSession(payload: {
    fullName: string;
    phone: string;
    email: string;
    topic: string;
    description?: string;
  }): Promise<{ url: string; sessionId: string; isMock?: boolean }> {
    const fee = 50;

    if (!this.stripe) {
      const mockSessionId = `mock_consult_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      return {
        url: `${ENV.FRONTEND_URL}/consulta-confirmada?session_id=${mockSessionId}&name=${encodeURIComponent(
          payload.fullName
        )}`,
        sessionId: mockSessionId,
        isMock: true,
      };
    }

    const session = await this.stripe.checkout.sessions.create({
      customer_email: payload.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Consulta Empresarial — 45 minutos — CAMIKK Holdings",
              description: `Orientación especializada sobre: ${payload.topic}`,
            },
            unit_amount: fee * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      adaptive_pricing: { enabled: false } as any,
      metadata: {
        type: "CONSULTATION",
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        topic: payload.topic,
        description: payload.description || "",
        timeZone: "America/New_York",
        currency: "usd",
      },
      success_url: `${ENV.FRONTEND_URL}/consulta-confirmada?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ENV.FRONTEND_URL}/consulta`,
    });

    return {
      url: session.url || `${ENV.FRONTEND_URL}/consulta-confirmada?session_id=${session.id}`,
      sessionId: session.id,
    };
  }

  /**
   * Procesa el evento del webhook de Stripe cuando el pago ha sido exitoso:
   * 1. Guarda en PostgreSQL (Client, Order, Dossier)
   * 2. Genera token de acceso multi-dispositivo
   * 3. Despacha correo electrónico con el enlace único
   */
  async handleSuccessfulPayment(params: {
    stripeSessionId: string;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    state?: string;
    companyName?: string;
    secondChoiceName?: string;
    businessActivity?: string;
    ownersCount?: string;
    totalAmount: number;
    stateFee?: number;
    autoRenewRegisteredOffice?: boolean;
    language?: "es" | "en";
    siteUrl?: string;
  }): Promise<string> {
    const {
      stripeSessionId,
      customerEmail,
      customerName,
      customerPhone,
      state = "Pennsylvania",
      companyName = "Mi Empresa LLC",
      secondChoiceName = "",
      businessActivity = "",
      ownersCount = "1",
      totalAmount,
      stateFee = 0,
      autoRenewRegisteredOffice = false,
      language = "es",
      siteUrl: paramSiteUrl,
    } = params;

    let activeSiteUrl = paramSiteUrl;
    if (!activeSiteUrl && stripeSessionId) {
      try {
        const existingOrder = await prisma.order.findUnique({
          where: { stripeSessionId },
        });
        activeSiteUrl = (existingOrder?.metadata as any)?.siteUrl;
      } catch (err) {
        // Ignorar error si no encuentra la orden previa
      }
    }
    const finalSiteUrl = (activeSiteUrl || ENV.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    // Generar token seguro único para el expediente
    let token = `cmk_${crypto.randomBytes(24).toString("hex")}`;
    let submissionNumber: string | undefined;
    let orderId: string | undefined;
    const dossierUrl = `${finalSiteUrl}/dossier?token=${token}`;

    try {
      // 1. Buscar o crear cliente atómicamente con upsert
      const normalizedEmail = (customerEmail || "").toLowerCase().trim();
      const client = await prisma.client.upsert({
        where: { email: normalizedEmail },
        update: {
          fullName: customerName || undefined,
          phone: customerPhone || undefined,
        },
        create: {
          fullName: customerName || "Cliente",
          email: normalizedEmail,
          phone: customerPhone || "",
        },
      });


      // 2. Crear Orden
      const order = await prisma.order.upsert({
        where: { stripeSessionId },
        update: {
          status: "PAID",
          paidAt: new Date(),
        },
        create: {
          clientId: client.id,
          type: "LLC_FORMATION",
          state,
          serviceFee: CAMIKK_SERVICE_FEE,
          stateFee,
          totalAmount,
          stripeSessionId,
          status: "PAID",
          paidAt: new Date(),
          metadata: {
            companyName,
            businessActivity,
            ownersCount,
            autoRenewRegisteredOffice,
            language,
            siteUrl: finalSiteUrl,
          },
        },
      });
      orderId = order.id;

      // 3. Crear Expediente inicial (Dossier) si no existe aún para esta orden
      const existingDossier = await prisma.dossier.findFirst({
        where: { orderId: order.id },
      });

      if (existingDossier) {
        token = existingDossier.token;
        submissionNumber = existingDossier.submissionNumber || (await getNextSubmissionNumber());
        if (!existingDossier.submissionNumber) {
          await prisma.dossier.update({
            where: { id: existingDossier.id },
            data: { submissionNumber },
          });
        }
        if (existingDossier.status === "INCOMPLETE" || existingDossier.status === "Pago pendiente") {
          await prisma.dossier.update({
            where: { id: existingDossier.id },
            data: { status: "Formulario de información/documentación enviado" },
          });
        }
        console.log(`ℹ️ Expediente ya existente en PostgreSQL para la orden actualizado a "Formulario de información/documentación enviado". Token: ${token}, Expediente: ${submissionNumber}`);
      } else {
        submissionNumber = await getNextSubmissionNumber();
        const count = ownersCount === "3+" ? 3 : parseInt(ownersCount, 10) || 1;
        const initialMembers = [
          {
            id: "member-1",
            fullName: customerName,
            address: "",
            cityStateZip: "",
            email: customerEmail,
            phone: customerPhone,
            ownershipPercentage: Math.floor(100 / count),
            initialCapital: "",
            roleOrTitle: "Member / Propietario Principal",
          },
        ];

        for (let i = 1; i < count; i++) {
          initialMembers.push({
            id: `member-${i + 1}`,
            fullName: "",
            address: "",
            cityStateZip: "",
            email: "",
            phone: "",
            ownershipPercentage: Math.floor(100 / count),
            initialCapital: "",
            roleOrTitle: `Member / Co-propietario ${i + 1}`,
          });
        }

        await prisma.dossier.create({
          data: {
            token,
            orderId: order.id,
            clientId: client.id,
            submissionNumber,
            currentStep: 1,
            status: "Formulario de información/documentación enviado",
            companyState: state,
            companyName,
            companySecondChoice: secondChoiceName,
            companyActivity: businessActivity,
            companyPhone: customerPhone,
            companyEmail: customerEmail,
            totalMembers: count,
            signingAuthority: customerName,
            membersData: initialMembers,
            einResponsiblePartyName: customerName,
            einIrsActivity: businessActivity,
            roPrimaryContactPerson: customerName,
            roConfirmedService: true,
          },
        });
        console.log(`✅ Expediente creado con éxito en PostgreSQL. Token: ${token}, Expediente: ${submissionNumber}`);
      }
    } catch (dbErr) {
      console.error("Aviso al guardar en BD (comprobar conexión PostgreSQL):", dbErr);
    }

    // 4. Enviar correo electrónico con el enlace único para el formulario (Inglés o Español según idioma de la página)
    await mailService.sendDossierLinkEmail({
      toEmail: customerEmail,
      clientName: customerName,
      companyName,
      dossierUrl,
      totalPaid: totalAmount.toString(),
      language,
    });

    // 4.1 Enviar notificación al equipo administrador
    mailService
      .sendAdminNewLlcOrderEmail({
        clientName: customerName,
        clientEmail: customerEmail,
        clientPhone: customerPhone,
        state,
        totalPaid: totalAmount.toString(),
        language,
        autoRenewRegisteredOffice,
      })
      .catch((adminMailErr) => {
        console.error("Error al notificar al admin por correo:", adminMailErr);
      });

    // 4.2 Si el cliente activó la renovación automática de Registered Office, programar suscripción en Stripe
    if (autoRenewRegisteredOffice && orderId) {
      this.setupAnnualRenewalSubscription({
        orderId,
        stripeSessionId,
        customerEmail,
        customerName,
        companyName,
        state,
        token,
      }).catch((subErr) => {
        console.error("Aviso al programar suscripción de renovación anual en handleSuccessfulPayment:", subErr);
      });
    }

    // 5. Enviar actualización a GoHighLevel con "Formulario de información/documentación enviado" y "Pago recibido"
    ghlService
      .sendLlcPaymentConfirmed({
        fullName: customerName,
        phone: customerPhone,
        email: customerEmail,
        state,
        companyName,
        secondChoiceName,
        businessActivity,
        ownersCount,
        totalAmount,
        stateFee,
        token,
        sessionId: stripeSessionId,
        submissionNumber,
        status: "Formulario de información/documentación enviado",
        paymentStatus: "Pago recibido",
        dossierUrl,
        siteUrl: finalSiteUrl,
        autoRenewRegisteredOffice,
        language,
      })
      .catch((ghlErr) => {
        console.error("Error al enviar actualización de pago a GoHighLevel:", ghlErr);
      });

    return token;
  }

  /**
   * Verifica el estado de pago de una sesión (Stripe o Mock) y confirma en PostgreSQL:
   * 1. Actualiza Order a PAID y paidAt
   * 2. Actualiza Dossier a IN_PROGRESS si estaba INCOMPLETE
   * 3. Envía correo electrónico de confirmación con el link del formulario via Resend
   */
  async verifySession(sessionId: string, token?: string, currentSiteUrl?: string) {
    let order = sessionId
      ? await prisma.order.findUnique({
          where: { stripeSessionId: sessionId },
          include: { client: true, dossier: true },
        })
      : null;

    if (!order && token) {
      const dossier = await prisma.dossier.findUnique({
        where: { token },
        include: { client: true, order: true },
      });
      if (dossier?.order) {
        order = {
          ...dossier.order,
          client: dossier.client,
          dossier,
        };
      }
    }

    if (!order) {
      throw new Error("No se encontró la orden correspondiente a la sesión.");
    }

    let isPaid = order.status === "PAID";

    if (!isPaid) {
      if (sessionId && sessionId.startsWith("mock_")) {
        isPaid = true;
      } else if (this.stripe && sessionId) {
        try {
          const session = await this.stripe.checkout.sessions.retrieve(sessionId);
          if (session && (session.payment_status === "paid" || session.status === "complete")) {
            isPaid = true;
          }
        } catch (stripeErr) {
          console.warn("[StripeService] Error al consultar Stripe API en verifySession:", stripeErr);
        }
      }
    }

    if (isPaid && order.status !== "PAID") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      if (order.dossier) {
        await prisma.dossier.update({
          where: { id: order.dossier.id },
          data: {
            status:
              order.dossier.status === "INCOMPLETE" || order.dossier.status === "Pago pendiente"
                ? "Formulario de información/documentación enviado"
                : order.dossier.status,
          },
        });
      }

      // Enviar correo de confirmación con el enlace del expediente
      if (order.client?.email && order.dossier?.token) {
        try {
          const metadata = (order.metadata as any) || {};
          const language = (metadata.language === "en" ? "en" : "es") as "es" | "en";
          const siteUrl = (currentSiteUrl || metadata.siteUrl || ENV.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
          const dossierUrl = `${siteUrl}/dossier?token=${order.dossier.token}`;
          await mailService.sendDossierLinkEmail({
            toEmail: order.client.email,
            clientName: order.client.fullName,
            companyName: metadata.companyName || order.dossier.companyName || "Tu LLC",
            dossierUrl,
            totalPaid: order.totalAmount ? order.totalAmount.toString() : "850",
            language,
          });

          const autoRenewRegisteredOffice =
            metadata.autoRenewRegisteredOffice === true ||
            metadata.autoRenewRegisteredOffice === "true";

          // Notificar al equipo administrador por correo
          mailService
            .sendAdminNewLlcOrderEmail({
              clientName: order.client.fullName,
              clientEmail: order.client.email,
              clientPhone: order.client.phone || "",
              state: order.state || order.dossier.companyState || "Delaware",
              totalPaid: order.totalAmount ? order.totalAmount.toString() : "850",
              language,
              autoRenewRegisteredOffice,
            })
            .catch((adminMailErr) => {
              console.error("Error al notificar al admin en verifySession:", adminMailErr);
            });

          // Si el cliente activó la renovación automática de Registered Office y aún no tiene suscripción creada
          if (autoRenewRegisteredOffice && !metadata.stripeSubscriptionId) {
            this.setupAnnualRenewalSubscription({
              orderId: order.id,
              stripeSessionId: sessionId || order.stripeSessionId,
              customerEmail: order.client?.email,
              customerName: order.client?.fullName,
              companyName: (metadata.companyName || order.dossier?.companyName) ?? undefined,
              state: (order.state || order.dossier?.companyState) ?? undefined,
              token: order.dossier?.token || token,
            }).catch((subErr) => {
              console.error("Aviso al programar suscripción de renovación anual en verifySession:", subErr);
            });
          }

          ghlService
            .sendLlcPaymentConfirmed({
              fullName: order.client.fullName,
              phone: order.client.phone || "",
              email: order.client.email,
              state: order.state || order.dossier.companyState || "Delaware",
              companyName: metadata.companyName || order.dossier.companyName || "Tu LLC",
              secondChoiceName: order.dossier.companySecondChoice || "",
              businessActivity: order.dossier.companyActivity || "",
              ownersCount: (order.dossier.totalMembers || 1).toString(),
              totalAmount: order.totalAmount ? Number(order.totalAmount) : 850,
              stateFee: order.stateFee ? Number(order.stateFee) : 0,
              token: order.dossier.token,
              sessionId: order.stripeSessionId || sessionId || "",
              submissionNumber: order.dossier.submissionNumber || undefined,
              status: "Formulario de información/documentación enviado",
              paymentStatus: "Pago recibido",
              dossierUrl,
              siteUrl,
              autoRenewRegisteredOffice,
              language,
            })
            .catch((ghlErr) => {
              console.error("Error al enviar actualización a GoHighLevel en verifySession:", ghlErr);
            });
        } catch (mailErr) {
          console.error("Error al enviar correo en verifySession:", mailErr);
        }
      }
    }

    const metadata = (order.metadata as any) || {};
    return {
      success: true,
      paid: isPaid,
      status: isPaid ? "PAID" : order.status,
      clientName: order.client?.fullName || "",
      email: order.client?.email || "",
      companyName: metadata.companyName || order.dossier?.companyName || "Tu LLC",
      totalAmount: order.totalAmount ? Number(order.totalAmount) : 850,
      state: order.state || order.dossier?.companyState || "Delaware",
      token: order.dossier?.token || token || "",
    };
  }

  /**
   * Configura la suscripción recurrente en Stripe para el servicio de Registered Office
   * con un período de prueba de 365 días (1 año).
   * Primer año: $0 USD (ya pagado en el trámite inicial de la LLC).
   * Segundo año en adelante: $127 USD anuales cobrados automáticamente por Stripe a la tarjeta guardada.
   */
  async setupAnnualRenewalSubscription(params: {
    orderId: string;
    stripeSessionId?: string;
    customerEmail?: string;
    customerName?: string;
    companyName?: string;
    state?: string;
    token?: string;
  }): Promise<{ success: boolean; subscriptionId?: string; reason?: string }> {
    const { orderId, stripeSessionId, customerEmail, customerName, companyName, state, token } = params;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return { success: false, reason: "Orden no encontrada en la base de datos." };
      }

      const orderMeta = (order.metadata as any) || {};
      const wantsRenewal =
        orderMeta.autoRenewRegisteredOffice === true ||
        orderMeta.autoRenewRegisteredOffice === "true";

      if (!wantsRenewal) {
        return { success: false, reason: "El cliente no activó la renovación automática." };
      }

      // Idempotencia: Si ya tiene una suscripción creada, no duplicarla
      if (orderMeta.stripeSubscriptionId) {
        console.log(`ℹ️ [Stripe] La orden ${order.id} ya cuenta con suscripción activa (${orderMeta.stripeSubscriptionId}).`);
        return { success: true, subscriptionId: orderMeta.stripeSubscriptionId };
      }

      // Modo Mock si no hay Stripe inicializado o es una sesión simulada
      if (!this.stripe || (stripeSessionId && stripeSessionId.startsWith("mock_"))) {
        const mockSubId = `sub_mock_${Date.now()}`;
        const trialEndIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        await prisma.order.update({
          where: { id: order.id },
          data: {
            metadata: {
              ...orderMeta,
              stripeSubscriptionId: mockSubId,
              subscriptionTrialEnd: trialEndIso,
              subscriptionStatus: "trialing",
              subscriptionAmount: 127,
              subscriptionInterval: "year",
              subscriptionCreatedAt: new Date().toISOString(),
            },
          },
        });
        console.log(`⚡ [Mock Stripe] Suscripción de renovación anual simulada (${mockSubId}) por $127 USD/año con trial de 365 días.`);
        return { success: true, subscriptionId: mockSubId };
      }

      // 1. Obtener la sesión de Checkout de Stripe expandiendo customer y payment_intent
      let session: Stripe.Checkout.Session | null = null;
      if (stripeSessionId && !stripeSessionId.startsWith("mock_")) {
        try {
          session = await this.stripe.checkout.sessions.retrieve(stripeSessionId, {
            expand: ["customer", "payment_intent"],
          });
        } catch (sessErr: any) {
          console.warn("[Stripe] Aviso al recuperar sesión para suscripción:", sessErr?.message || sessErr);
        }
      }

      // 2. Determinar o resolver el ID de cliente en Stripe
      let customerId: string | null = null;
      if (session?.customer) {
        customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
      }

      const targetEmail = (customerEmail || session?.customer_details?.email || orderMeta.email || "").trim().toLowerCase();

      if (!customerId && targetEmail) {
        const existingList = await this.stripe.customers.list({ email: targetEmail, limit: 1 });
        if (existingList.data.length > 0) {
          customerId = existingList.data[0].id;
        } else {
          const newCust = await this.stripe.customers.create({
            email: targetEmail,
            name: customerName || session?.customer_details?.name || orderMeta.fullName || "Cliente CAMIKK",
            metadata: { companyName: companyName || orderMeta.companyName || "" },
          });
          customerId = newCust.id;
        }
      }

      if (!customerId) {
        console.error(`❌ [Stripe] No se pudo obtener el Customer ID para la orden ${order.id}.`);
        return { success: false, reason: "No se encontró el ID de cliente en Stripe." };
      }

      // 3. Extraer el método de pago utilizado en el Checkout
      let paymentMethodId: string | undefined;
      const paymentIntent = session?.payment_intent as Stripe.PaymentIntent | undefined;
      if (paymentIntent?.payment_method) {
        paymentMethodId =
          typeof paymentIntent.payment_method === "string"
            ? paymentIntent.payment_method
            : paymentIntent.payment_method.id;
      }

      // Si no viene en payment_intent, listar los métodos de pago guardados del cliente
      if (!paymentMethodId) {
        try {
          const pms = await this.stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
            limit: 1,
          });
          if (pms.data.length > 0) {
            paymentMethodId = pms.data[0].id;
          }
        } catch (pmListErr) {
          console.warn("[Stripe] Aviso al listar paymentMethods del cliente:", pmListErr);
        }
      }

      // Asegurar que el método de pago esté adjunto al cliente y configurado como predeterminado
      if (paymentMethodId) {
        try {
          await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        } catch (attachErr: any) {
          // Si ya está adjunto a este cliente, se puede ignorar
        }

        try {
          await this.stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });
        } catch (custUpdateErr: any) {
          console.warn("[Stripe] Aviso al fijar default_payment_method en cliente:", custUpdateErr?.message || custUpdateErr);
        }
      }

      // 4. Calcular el cobro para exactamente dentro de 365 días (1 año)
      const trialEndTimestamp = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      // 5. Obtener o crear el producto en Stripe para la renovación de Registered Office
      let productId: string;
      try {
        const existingProducts = await this.stripe.products.search({
          query: "name:'Renovación Anual Registered Office — CAMIKK Holdings' AND active:'true'",
          limit: 1,
        });
        if (existingProducts.data && existingProducts.data.length > 0) {
          productId = existingProducts.data[0].id;
        } else {
          const product = await this.stripe.products.create({
            name: "Renovación Anual Registered Office — CAMIKK Holdings",
            description: "Servicio legal de Registered Office y sede corporativa en EE.UU. (Renovación anual).",
            metadata: {
              service: "REGISTERED_OFFICE_ANNUAL_RENEWAL",
            },
          });
          productId = product.id;
        }
      } catch (prodSearchErr) {
        // Fallback si search no está disponible de inmediato
        const product = await this.stripe.products.create({
          name: "Renovación Anual Registered Office — CAMIKK Holdings",
          description: "Servicio legal de Registered Office y sede corporativa en EE.UU. (Renovación anual).",
          metadata: {
            service: "REGISTERED_OFFICE_ANNUAL_RENEWAL",
          },
        });
        productId = product.id;
      }

      // 6. Crear la Suscripción en Stripe con período de prueba de 365 días (1 año)
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price_data: {
              currency: "usd",
              product: productId,
              unit_amount: 12700, // $127.00 USD
              recurring: {
                interval: "year",
              },
            },
          },
        ],
        trial_end: trialEndTimestamp,
        default_payment_method: paymentMethodId,
        metadata: {
          orderId: order.id,
          token: token || orderMeta.token || "",
          companyName: companyName || orderMeta.companyName || "",
          state: state || order.state || "",
          type: "REGISTERED_OFFICE_ANNUAL_RENEWAL",
        },
        description: `Renovación anual Registered Office — ${companyName || orderMeta.companyName || "LLC"} ($127 USD/año)`,
      });

      // 6. Guardar los datos de la suscripción en PostgreSQL
      const trialEndDateIso = new Date(trialEndTimestamp * 1000).toISOString();
      await prisma.order.update({
        where: { id: order.id },
        data: {
          metadata: {
            ...orderMeta,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
            subscriptionTrialEnd: trialEndDateIso,
            subscriptionStatus: subscription.status,
            subscriptionAmount: 127,
            subscriptionInterval: "year",
            subscriptionCreatedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`\n================================================================`);
      console.log(`🎉 [Stripe] ¡Suscripción de renovación anual activada exitosamente!`);
      console.log(`   ID Suscripción: ${subscription.id}`);
      console.log(`   Cliente Stripe: ${customerId}`);
      console.log(`   Estado:         ${subscription.status} (Período de prueba de 1 año)`);
      console.log(`   Primer cobro:   $127.00 USD programado para el ${new Date(trialEndTimestamp * 1000).toLocaleDateString()}`);
      console.log(`================================================================\n`);

      return { success: true, subscriptionId: subscription.id };
    } catch (err: any) {
      console.error("❌ [Stripe] Error al crear suscripción de renovación automática:", err?.message || err);
      return { success: false, reason: err?.message || String(err) };
    }
  }

  /**
   * Construye el evento de webhook con firma criptográfica
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new Error("Stripe no está inicializado.");
    }
    return this.stripe.webhooks.constructEvent(payload, signature, ENV.STRIPE_WEBHOOK_SECRET);
  }
}

export const stripeService = new StripeService();
