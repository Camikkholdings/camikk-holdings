import { Router } from "express";
import { dossierController } from "../controllers/dossier.controller";

const router = Router();

router.post("/init", (req, res) => dossierController.initDraft(req, res));
router.get("/by-session/:sessionId", (req, res) => dossierController.getBySessionId(req, res));
router.get("/:token", (req, res) => dossierController.getByToken(req, res));
router.put("/:token/draft", (req, res) => dossierController.saveDraft(req, res));
router.post("/:token/submit", (req, res) => dossierController.submitFinal(req, res));

export const dossierRoutes = router;
