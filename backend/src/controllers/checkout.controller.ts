import { Request, Response } from "express";
import { stripeService } from "../services/stripe.service";
import { ENV } from "../config/env";
import { prisma } from "../db/prisma";

export class CheckoutController {
  async checkoutLlc(req: Request, res: Response) {
    try {
      const {
        fullName,
        phone,
        email,
        state,
        companyName,
        secondChoiceName,
        businessActivity,
        ownersCount,
        confirmations,
      } = req.body;

      if (!fullName || !phone || !email || !state || !companyName || !businessActivity) {
        return res.status(400).json({ error: "Todos los campos con asterisco (*) son obligatorios." });
      }

      if (
        !confirmations?.accurate ||
        !confirmations?.stateApproval ||
        !confirmations?.termsAccepted
      ) {
        return res.status(400).json({ error: "Debe aceptar las confirmaciones requeridas previas al pago." });
      }

      const detectedOrigin =
        req.body.siteUrl ||
        req.headers.origin ||
        (req.headers.referer ? new URL(req.headers.referer as string).origin : undefined) ||
        ENV.FRONTEND_URL ||
        "http://localhost:3000";

      const result = await stripeService.createLlcCheckoutSession({
        fullName,
        phone,
        email,
        state,
        companyName,
        secondChoiceName,
        businessActivity,
        ownersCount: ownersCount || "1",
        autoRenewRegisteredOffice: req.body.autoRenewRegisteredOffice,
        language: req.body.language === "en" ? "en" : "es",
        siteUrl: detectedOrigin,
      });

      return res.json(result);
    } catch (error: any) {
      console.error("Error en checkout LLC:", error);
      return res.status(500).json({ error: error.message || "Error al procesar el checkout." });
    }
  }

  async checkoutConsultation(req: Request, res: Response) {
    try {
      const { fullName, phone, email, topic, description, language } = req.body;

      if (!fullName || !phone || !email || !topic) {
        return res.status(400).json({ error: "Nombre, teléfono, correo y tema son requeridos." });
      }

      const result = await stripeService.createConsultationCheckoutSession({
        fullName,
        phone,
        email,
        topic,
        description,
        language: language === "en" ? "en" : "es",
      });

      return res.json(result);
    } catch (error: any) {
      console.error("Error en checkout Consulta:", error);
      return res.status(500).json({ error: error.message || "Error al procesar la consulta." });
    }
  }

  async verifySession(req: Request, res: Response) {
    try {
      const sessionId = String(req.query.session_id || req.body.session_id || "");
      const token = String(req.query.token || req.body.token || "");
      const detectedOrigin =
        req.body.siteUrl ||
        (req.query.site_url as string) ||
        req.headers.origin ||
        (req.headers.referer ? new URL(req.headers.referer as string).origin : undefined) ||
        undefined;

      if (!sessionId && !token) {
        return res.status(400).json({ error: "session_id o token requeridos." });
      }

      const result = await stripeService.verifySession(sessionId, token, detectedOrigin);
      return res.json(result);
    } catch (error: any) {
      console.error("Error en verifySession:", error);
      return res.status(500).json({ error: error.message || "Error al verificar la sesión." });
    }
  }

  async resumePayment(req: Request, res: Response) {
    try {
      const token = String(req.query.token || "");
      if (!token) {
        return res.status(400).send("Token requerido para reanudar el pago.");
      }

      const dossier = await prisma.dossier.findUnique({
        where: { token },
        include: { order: true, client: true },
      });

      if (!dossier) {
        return res.status(404).send("Expediente no encontrado.");
      }

      const siteUrl = (
        (dossier.order?.metadata as any)?.siteUrl ||
        (req.query.siteUrl as string) ||
        req.headers.origin ||
        (req.headers.referer ? new URL(req.headers.referer as string).origin : undefined) ||
        ENV.FRONTEND_URL ||
        "http://localhost:3000"
      ).replace(/\/$/, "");

      // Si el pago ya fue completado, redirigir directo a su expediente
      if (
        dossier.status !== "Pago pendiente" ||
        dossier.order?.status === "PAID"
      ) {
        return res.redirect(`${siteUrl}/dossier?token=${token}`);
      }

      // Si la sesión de Stripe existe, verificar si sigue abierta
      if (
        stripeService.stripe &&
        dossier.order?.stripeSessionId &&
        !dossier.order.stripeSessionId.startsWith("mock_")
      ) {
        try {
          const session = await stripeService.stripe.checkout.sessions.retrieve(dossier.order.stripeSessionId);
          if (session.status === "open" && session.url) {
            return res.redirect(session.url);
          }
        } catch (err) {
          console.warn("Sesión previa de Stripe no válida o expirada, generando nueva sesión...");
        }
      }

      // Si expiró o es modo simulación, generar una nueva sesión de checkout conservando los datos
      const state = dossier.companyState || dossier.order?.state || "Delaware";
      const sessionResult = await stripeService.createLlcCheckoutSession({
        fullName: dossier.client.fullName,
        phone: dossier.client.phone,
        email: dossier.client.email,
        state,
        companyName: dossier.companyName || "LLC",
        secondChoiceName: dossier.companySecondChoice || "",
        businessActivity: dossier.companyActivity || "Comercio General",
        ownersCount: dossier.totalMembers >= 3 ? "3+" : (String(dossier.totalMembers) as "1" | "2"),
        autoRenewRegisteredOffice: (dossier.order?.metadata as any)?.autoRenewRegisteredOffice ?? false,
        language: (dossier.order?.metadata as any)?.language || "es",
        siteUrl,
        existingToken: dossier.token,
      });

      return res.redirect(sessionResult.url);
    } catch (error: any) {
      console.error("Error al reanudar checkout:", error);
      return res.redirect(`${ENV.FRONTEND_URL}/comenzar-llc`);
    }
  }
}

export const checkoutController = new CheckoutController();
