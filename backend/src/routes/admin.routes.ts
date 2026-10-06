import { Router } from "express";
import { adminController } from "../controllers/admin.controller";

const router = Router();

// Autenticación
router.post("/login", (req, res) => adminController.login(req, res));

// Estadísticas generales
router.get("/stats", (req, res) => adminController.getStats(req, res));

// Citas y Consultas
router.get("/consultations", (req, res) => adminController.getConsultations(req, res));
router.put("/consultations/:id", (req, res) => adminController.updateConsultation(req, res));

// Expedientes y LLCs
router.get("/llcs", (req, res) => adminController.getDossiers(req, res));
router.put("/llcs/:id", (req, res) => adminController.updateDossier(req, res));
router.post("/llcs/:id/resend-link", (req, res) => adminController.resendDossierLink(req, res));

// Verificación y Recuperación de Pagos Pendientes (Manual / Testing)
router.post("/pending-recovery/trigger", (req, res) => adminController.triggerPendingCheck(req, res));
router.get("/pending-recovery/trigger", (req, res) => adminController.triggerPendingCheck(req, res));

export const adminRoutes = router;
