import { Request, Response } from "express";
import { stripeService } from "../services/stripe.service";

export class WebhookController {
  async handleStripeWebhook(req: Request, res: Response) {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      return res.status(400).send("Falta stripe-signature");
    }

    try {
      // req.body debe ser Buffer crudo (raw)
      const event = stripeService.constructWebhookEvent(req.body, signature);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        console.log(`💳 Evento Stripe recibido: checkout.session.completed [ID: ${session.id}]`);

        if (session.metadata?.type === "LLC_FORMATION") {
          await stripeService.handleSuccessfulPayment({
            stripeSessionId: session.id,
            customerEmail: session.customer_email || session.metadata.email,
            customerName: session.metadata.fullName || "Cliente CAMIKK",
            customerPhone: session.metadata.phone || "",
            state: session.metadata.state,
            companyName: session.metadata.companyName,
            secondChoiceName: session.metadata.secondChoiceName,
            businessActivity: session.metadata.businessActivity,
            ownersCount: session.metadata.ownersCount,
            totalAmount: parseFloat(session.metadata.totalAmount || "0"),
            stateFee: parseFloat(session.metadata.stateFee || "0"),
            autoRenewRegisteredOffice:
              session.metadata?.autoRenewRegisteredOffice === "true" ||
              session.metadata?.autoRenewRegisteredOffice === true,
            language: session.metadata?.language === "en" ? "en" : "es",
            siteUrl: session.metadata?.siteUrl || undefined,
          });
        } else if (
          session.metadata?.type === "CONSULTATION" ||
          session.metadata?.type === "consultation"
        ) {
          const { consultationService } = await import("../services/consultation.service");
          await consultationService.createBooking({
            fullName: session.metadata.fullName || session.customer_details?.name || "Cliente CAMIKK",
            email: session.customer_email || session.customer_details?.email || session.metadata.email,
            phone: session.metadata.phone || session.customer_details?.phone || "",
            topic: session.metadata.topic || "Asesoría Empresarial",
            description: session.metadata.description || "",
            scheduledDate: session.metadata.scheduledDate || new Date().toISOString().split("T")[0],
            timeSlot: session.metadata.timeSlot || "10:00 AM",
            timeZone: session.metadata.timeZone || "America/Bogota",
            stripeSessionId: session.id,
            totalAmount: parseFloat(session.metadata.totalAmount || "50"),
          });
        }
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error("Error validando webhook de Stripe:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}

export const webhookController = new WebhookController();
