import { Request, Response } from "express";
import { dossierService } from "../services/dossier.service";

export class DossierController {
  async getByToken(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const dossier = await dossierService.getByToken(token);

      if (!dossier) {
        return res.status(404).json({ error: "Expediente no encontrado o token inválido." });
      }

      return res.json(dossier);
    } catch (error: any) {
      console.error("Error al obtener expediente:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  async getBySessionId(req: Request, res: Response) {
    try {
      const sessionId = String(req.params.sessionId);
      const dossier = await dossierService.getBySessionId(sessionId);

      if (!dossier) {
        return res.status(404).json({ error: "Expediente no encontrado para la sesión de Stripe." });
      }

      return res.json(dossier);
    } catch (error: any) {
      console.error("Error al obtener expediente por sessionId:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  async initDraft(req: Request, res: Response) {
    try {
      const dossier = await dossierService.initDraft(req.body || {});
      return res.json({ success: true, token: dossier.token, dossier });
    } catch (error: any) {
      console.error("Error al inicializar borrador:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  async saveDraft(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const updated = await dossierService.saveDraft(token, req.body);
      return res.json({ success: true, updated });
    } catch (error: any) {
      console.error("Error al guardar borrador:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  async submitFinal(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const result = await dossierService.submitFinal(token, req.body);
      return res.json(result);
    } catch (error: any) {
      console.error("Error al radicar expediente:", error);
      return res.status(400).json({ error: error.message });
    }
  }
}

export const dossierController = new DossierController();
