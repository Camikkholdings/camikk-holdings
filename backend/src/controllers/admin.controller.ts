import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { ENV } from "../config/env";
import { mailService } from "../services/mail.service";
import { pendingRecoveryService } from "../services/pending-recovery.service";
import { s3Service } from "../services/s3.service";

export class AdminController {
  /**
   * Login de administrador
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña requeridos." });
      }

      if (email.trim().toLowerCase() !== ENV.ADMIN_EMAIL.toLowerCase() || password !== ENV.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Credenciales de administrador inválidas." });
      }

      // Generar token de sesión firmado
      const timestamp = Date.now();
      const rawToken = `${email}:${timestamp}:${ENV.ADMIN_SECRET}`;
      const signature = crypto.createHash("sha256").update(rawToken).digest("hex");
      const token = Buffer.from(JSON.stringify({ email, timestamp, signature })).toString("base64");

      return res.json({
        success: true,
        token,
        admin: {
          email: ENV.ADMIN_EMAIL,
          name: "Administrador CAMIKK",
          role: "SUPER_ADMIN",
        },
      });
    } catch (err: unknown) {
      console.error("Error en login admin:", err);
      return res.status(500).json({ error: "Error en el servidor de autenticación." });
    }
  }

  /**
   * Métricas y KPIs generales
   */
  async getStats(_req: Request, res: Response) {
    try {
      let totalConsultations = 0;
      let confirmedConsultations = 0;
      let totalDossiers = 0;
      let submittedDossiers = 0;
      let totalLlcOrders = 0;
      let orders: Array<{ totalAmount: any; type: string }> = [];

      try {
        // @ts-ignore prisma model generated dynamically
        if ((prisma as any).consultationBooking) {
          totalConsultations = await (prisma as any).consultationBooking.count().catch(() => 0) || 0;
          confirmedConsultations = await (prisma as any).consultationBooking.count({ where: { status: "CONFIRMED" } }).catch(() => 0) || 0;
        }
      } catch (err: any) {
        // Silently fallback if table or DB is warming up
      }

      try {
        totalDossiers = await prisma.dossier.count().catch(() => 0);
        submittedDossiers = await prisma.dossier.count({ where: { status: { in: ["SUBMITTED", "APPROVED"] } } }).catch(() => 0);
        totalLlcOrders = await prisma.order.count({ where: { type: "LLC_FORMATION", status: "PAID" } }).catch(() => 0);
        orders = await prisma.order.findMany({ where: { status: "PAID" }, select: { totalAmount: true, type: true } }).catch(() => []);
      } catch (err: any) {
        // Silently fallback if DB is warming up
      }
      
      let totalRevenue = 0;
      let consultationRevenue = 0;
      let llcRevenue = 0;

      for (const ord of orders) {
        const amt = Number(ord.totalAmount) || 0;
        totalRevenue += amt;
        if (ord.type === "CONSULTATION") consultationRevenue += amt;
        if (ord.type === "LLC_FORMATION") llcRevenue += amt;
      }

      return res.json({
        consultations: {
          total: totalConsultations,
          confirmed: confirmedConsultations,
          revenue: consultationRevenue,
        },
        llcs: {
          total: totalDossiers || totalLlcOrders,
          submitted: submittedDossiers,
          revenue: llcRevenue,
        },
        totalRevenue,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("starting up") || msg.includes("Can't reach database")) {
        console.warn("[Admin] PostgreSQL iniciando en segundo plano, devolviendo métricas base.");
      } else {
        console.error("[Admin] Error al obtener estadísticas:", msg);
      }
      return res.json({
        consultations: { total: 0, confirmed: 0, revenue: 0 },
        llcs: { total: 0, submitted: 0, revenue: 0 },
        totalRevenue: 0,
      });
    }
  }

  /**
   * Obtiene todas las citas / consultas
   */
  async getConsultations(_req: Request, res: Response) {
    try {
      // @ts-ignore prisma model generated dynamically
      if (!(prisma as any).consultationBooking) {
        return res.json([]);
      }

      // @ts-ignore prisma model generated dynamically
      const bookings = await (prisma as any).consultationBooking.findMany({
        include: {
          client: true,
          order: true,
        },
        orderBy: {
          scheduledDate: "desc",
        },
      });

      return res.json(bookings || []);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("starting up") || msg.includes("Can't reach database")) {
        console.warn("[Admin] PostgreSQL iniciando, reintentando en próxima petición de citas...");
      } else {
        console.error("[Admin] Error al listar citas:", msg);
      }
      return res.json([]);
    }
  }

  /**
   * Actualiza el estado o notas de una cita
   */
  async updateConsultation(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status, notes, meetingLink, scheduledDate, timeSlot } = req.body;

      // @ts-ignore prisma model generated dynamically
      if (!(prisma as any).consultationBooking) {
        return res.status(400).json({ error: "Modelo de citas no inicializado." });
      }

      // @ts-ignore prisma model generated dynamically
      const updated = await (prisma as any).consultationBooking.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          ...(meetingLink !== undefined && { meetingLink }),
          ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
          ...(timeSlot && { timeSlot }),
        },
      });

      return res.json({ success: true, consultation: updated });
    } catch (err: any) {
      console.error("[Admin] Error al actualizar cita:", err?.message || err);
      return res.status(500).json({ error: "Error al actualizar cita." });
    }
  }

  /**
   * Obtiene todos los expedientes de LLC
   */
  async getDossiers(_req: Request, res: Response) {
    try {
      const dossiers = await prisma.dossier.findMany({
        include: {
          client: true,
          order: true,
          documents: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Adjuntar URLs prefirmadas seguras a cada documento para permitir visualización y descarga directa
      const dossiersWithSignedDocs = await Promise.all(
        dossiers.map(async (dossier) => {
          if (!dossier.documents || dossier.documents.length === 0) {
            return dossier;
          }
          const docsWithSigned = await Promise.all(
            dossier.documents.map(async (doc) => {
              let viewUrl = doc.s3Url;
              try {
                viewUrl = await s3Service.getPresignedDownloadUrl(doc.s3Key, 86400); // 24 horas
              } catch (signErr) {
                console.warn(`[Admin] Aviso al firmar URL para documento ${doc.id}:`, signErr);
              }
              return {
                ...doc,
                viewUrl,
              };
            })
          );
          return {
            ...dossier,
            documents: docsWithSigned,
          };
        })
      );

      return res.json(dossiersWithSignedDocs || []);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("starting up") || msg.includes("Can't reach database")) {
        console.warn("[Admin] PostgreSQL iniciando, reintentando en próxima petición de expedientes...");
      } else {
        console.error("[Admin] Error al listar expedientes:", msg);
      }
      return res.json([]);
    }
  }

  /**
   * Actualiza el estado, SSN/ITIN o notas de un expediente de LLC
   */
  async updateDossier(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const {
        status,
        submissionNumber,
        companyName,
        einSsnOrItin,
        ssnOrItin,
        assignedEin,
        stateFilingNumber,
        internalNotes,
      } = req.body;

      const ssnValue = ssnOrItin !== undefined ? ssnOrItin : einSsnOrItin;

      const updated = await prisma.dossier.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(submissionNumber && { submissionNumber }),
          ...(companyName && { companyName }),
          ...(ssnValue !== undefined && { einSsnOrItin: String(ssnValue) }),
        },
      });

      // Si se enviaron metadatos administrativos, sincronizarlos con la orden asociada
      if (
        updated.orderId &&
        (assignedEin !== undefined || stateFilingNumber !== undefined || internalNotes !== undefined)
      ) {
        const order = await prisma.order.findUnique({ where: { id: updated.orderId } });
        if (order) {
          const currentMeta = (order.metadata as any) || {};
          await prisma.order.update({
            where: { id: updated.orderId },
            data: {
              metadata: {
                ...currentMeta,
                ...(assignedEin !== undefined && { assignedEin }),
                ...(stateFilingNumber !== undefined && { stateFilingNumber }),
                ...(internalNotes !== undefined && { internalNotes }),
              },
            },
          });
        }
      }

      return res.json({ success: true, dossier: updated });
    } catch (err: any) {
      console.error("[Admin] Error al actualizar expediente:", err?.message || err);
      return res.status(500).json({ error: "Error al actualizar expediente." });
    }
  }

  /**
   * Reenvía por correo el enlace único del expediente utilizando Resend
   */
  async resendDossierLink(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const dossier = await prisma.dossier.findUnique({
        where: { id },
        include: { client: true, order: true },
      });

      if (!dossier || !dossier.client?.email) {
        return res.status(404).json({ error: "Expediente o cliente no encontrado." });
      }

      const orderMeta = (dossier.order?.metadata as any) || {};
      const siteUrl = (
        req.headers.origin ||
        (req.headers.referer ? new URL(req.headers.referer as string).origin : undefined) ||
        orderMeta.siteUrl ||
        ENV.FRONTEND_URL ||
        "http://localhost:3000"
      ).replace(/\/$/, "");
      const dossierUrl = `${siteUrl}/dossier?token=${dossier.token}`;
      const totalPaid = dossier.order?.totalAmount ? dossier.order.totalAmount.toString() : "850";

      const sent = await mailService.sendDossierLinkEmail({
        toEmail: dossier.client.email,
        clientName: dossier.client.fullName,
        companyName: dossier.companyName || "Tu LLC",
        dossierUrl,
        totalPaid,
        language: orderMeta.language === "en" ? "en" : "es",
      });

      return res.json({
        success: sent,
        dossierUrl,
        message: `Enlace enviado exitosamente a ${dossier.client.email}`,
      });
    } catch (err: any) {
      console.error("[Admin] Error al reenviar enlace:", err?.message || err);
      return res.status(500).json({ error: "Error reenviando correo de expediente." });
    }
  }

  /**
   * Ejecución manual de la verificación de pagos pendientes
   */
  async triggerPendingCheck(req: Request, res: Response) {
    try {
      const force = req.query.force === "true" || req.body?.force === true;
      const result = await pendingRecoveryService.checkAndSendPendingReminders({ force });
      return res.json({
        success: true,
        message: "Verificación de pagos pendientes ejecutada exitosamente.",
        result,
      });
    } catch (err: any) {
      console.error("[Admin] Error ejecutando verificación de pagos pendientes:", err?.message || err);
      return res.status(500).json({ error: err?.message || "Error ejecutando verificación." });
    }
  }
}

export const adminController = new AdminController();

