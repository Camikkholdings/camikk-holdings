import { Router, raw } from "express";
import { webhookController } from "../controllers/webhook.controller";

const router = Router();

// Stripe webhook requiere el body como Buffer crudo (raw)
router.post(
  "/stripe",
  raw({ type: "application/json" }),
  (req, res) => webhookController.handleStripeWebhook(req, res)
);

export const webhookRoutes = router;
