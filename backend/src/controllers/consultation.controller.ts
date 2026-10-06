import { Request, Response } from "express";
import { consultationService } from "../services/consultation.service";

export class ConsultationController {
  /**
   * GET /api/consultations/slots?date=YYYY-MM-DD
   */
  async getSlots(req: Request, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const data = await consultationService.getSlotsData(date);
      return res.json({ date, timeZone: "America/New_York", ...data });
    } catch (err: any) {
      console.error("Error obteniendo slots de consulta:", err);
      return res.status(500).json({ error: "Error al consultar horarios disponibles." });
    }
  }

  /**
   * POST /api/consultations/book
   */
  async book(req: Request, res: Response) {
    try {
      const {
        fullName,
        email,
        phone,
        topic,
        description,
        scheduledDate,
        timeSlot,
        timeZone,
        stripeSessionId,
      } = req.body;

      if (!fullName || !email || !phone || !scheduledDate || !timeSlot) {
        return res.status(400).json({
          error: "Faltan campos obligatorios: fullName, email, phone, scheduledDate, timeSlot.",
        });
      }

      const booking = await consultationService.createBooking({
        fullName,
        email,
        phone,
        topic: topic || "Asesoría Empresarial",
        description,
        scheduledDate,
        timeSlot,
        timeZone: timeZone || "America/Bogota",
        stripeSessionId,
      });

      return res.status(201).json({
        success: true,
        message: "Consulta confirmada y agendada con éxito.",
        booking,
      });
    } catch (err: any) {
      console.error("Error agendando consulta:", err);
      return res.status(500).json({ error: "Error al registrar la cita en base de datos." });
    }
  }
}

export const consultationController = new ConsultationController();
