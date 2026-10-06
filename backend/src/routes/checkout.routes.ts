import { Router } from "express";
import { checkoutController } from "../controllers/checkout.controller";

const router = Router();

router.post("/llc", (req, res) => checkoutController.checkoutLlc(req, res));
router.post("/consultation", (req, res) => checkoutController.checkoutConsultation(req, res));
router.get("/verify-session", (req, res) => checkoutController.verifySession(req, res));
router.post("/verify-session", (req, res) => checkoutController.verifySession(req, res));
router.get("/resume", (req, res) => checkoutController.resumePayment(req, res));

export const checkoutRoutes = router;
