import cron, { ScheduledTask } from "node-cron";
import { prisma } from "../db/prisma";
import { ENV } from "../config/env";
import { ghlService } from "./ghl.service";
import { mailService } from "./mail.service";
import { CAMIKK_SERVICE_FEE, STATE_FEES } from "./stripe.service";

export interface PendingRecoveryResult {
  totalChecked: number;
  remindersSent: number;
  skipped: number;
  errors: number;
  details: Array<{
    token: string;
    clientEmail: string;
    clientPhone: string;
    status: "sent" | "skipped" | "error";
    reason?: string;
  }>;
}

export class PendingRecoveryService {
  private cronJob: ScheduledTask | null = null;

  /**
   * Inicializa el programador cron para ejecutarse 4 veces al día
   * de 7:00 AM a 5:00 PM hora de Nueva York (America/New_York).
   * Horas programadas: 8:00 AM, 11:00 AM, 2:00 PM y 5:00 PM (08:00, 11:00, 14:00, 17:00).
   */
  initScheduler() {
    // Expresión cron: minuto 0 en horas 8, 11, 14 y 17 todos los días
    const cronSchedule = "0 8,11,14,17 * * *";

    console.log(
      "⏰ [PendingRecovery] Inicializando cron de recuperación de LLCs pendientes: 4 veces al día (08:00, 11:00, 14:00, 17:00) [America/New_York]"
    );

    this.cronJob = cron.schedule(
      cronSchedule,
      async () => {
        const nyTime = new Date().toLocaleString("es-US", {
          timeZone: "America/New_York",
          dateStyle: "short",
          timeStyle: "medium",
        });
        console.log(`\n🔔 [PendingRecovery] Ejecutando verificación programada de pagos pendientes (${nyTime} NY)...`);
        try {
          await this.checkAndSendPendingReminders();
        } catch (err: any) {
          console.error("❌ [PendingRecovery] Error en ejecución de tarea programada:", err?.message || err);
        }
      },
      {
        timezone: "America/New_York",
      }
    );
  }

  /**
   * Detiene el cron scheduler si es necesario
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("⏹️ [PendingRecovery] Cron scheduler detenido.");
    }
  }

  /**
   * Verifica qué LLCs tienen estado "Pago pendiente" y despacha:
   * 1. WhatsApp vía nuevo Webhook de GoHighLevel
   * 2. Correo al cliente con asunto "Continúa con el proceso de creación de tu LLC"
   * 3. Correo al equipo de administración (c.martinez@coraltechnology.online)
   */
  async checkAndSendPendingReminders(options?: { force?: boolean }): Promise<PendingRecoveryResult> {
    const result: PendingRecoveryResult = {
      totalChecked: 0,
      remindersSent: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    try {
      // 1. Consultar todos los expedientes con estado "Pago pendiente"
      const pendingDossiers = await prisma.dossier.findMany({
        where: {
          status: "Pago pendiente",
        },
        include: {
          client: true,
          order: true,
        },
        orderBy: { createdAt: "desc" },
      });

      result.totalChecked = pendingDossiers.length;
      console.log(
        `🔍 [PendingRecovery] Se encontraron ${pendingDossiers.length} expedientes de LLC en estado "Pago pendiente".`
      );

      if (pendingDossiers.length === 0) {
        return result;
      }

      for (const dossier of pendingDossiers) {
        try {
          // Si por alguna razón la orden ya fue pagada en Stripe pero el expediente no se actualizó, sincronizar y omitir
          if (dossier.order?.status === "PAID") {
            await prisma.dossier.update({
              where: { id: dossier.id },
              data: { status: "Formulario de información/documentación enviado" },
            });
            result.skipped++;
            result.details.push({
              token: dossier.token,
              clientEmail: dossier.client?.email || "",
              clientPhone: dossier.client?.phone || "",
              status: "skipped",
              reason: "Orden ya está pagada. Estado sincronizado.",
            });
            continue;
          }

          const clientName = dossier.client?.fullName || dossier.signingAuthority || "Cliente";
          const clientEmail = (dossier.client?.email || dossier.companyEmail || "").trim();
          const clientPhone = (dossier.client?.phone || dossier.companyPhone || "").trim();
          const state = dossier.companyState || dossier.order?.state || "Delaware";
          const totalAmount = dossier.order
            ? Number(dossier.order.totalAmount)
            : (STATE_FEES[state] || 0) + CAMIKK_SERVICE_FEE;

          const metadata = (dossier.order?.metadata as any) || {};
          const lastReminderAt = metadata.lastPendingReminderAt ? new Date(metadata.lastPendingReminderAt) : null;
          const reminderCount = Number(metadata.pendingReminderCount || 0);

          // Control de frecuencia: Solo enviar el recordatorio UNA SOLA VEZ al cliente
          if (!options?.force) {
            // Dar tiempo prudente (20 minutos) para que el cliente complete su pago en Stripe si recién abrió el checkout
            const ageMinutes = (Date.now() - new Date(dossier.createdAt).getTime()) / (60 * 1000);
            if (ageMinutes < 20) {
              console.log(
                `⏳ [PendingRecovery] Omitiendo expediente ${dossier.token} (${clientEmail}): creado hace ${Math.round(ageMinutes)} min (esperando tiempo de pago en Stripe).`
              );
              result.skipped++;
              result.details.push({
                token: dossier.token,
                clientEmail,
                clientPhone,
                status: "skipped",
                reason: `Creado hace ${Math.round(ageMinutes)} minutos. Esperando tiempo de pago regular.`,
              });
              continue;
            }

            // Regla estricta: Solo se envía 1 recordatorio por cliente
            if (reminderCount >= 1 || lastReminderAt) {
              console.log(
                `ℹ️ [PendingRecovery] Omitiendo expediente ${dossier.token} (${clientEmail}): recordatorio ya fue enviado previamente (${lastReminderAt ? lastReminderAt.toISOString() : "1 envío registrado"}). Máximo permitido: 1 envío.`
              );
              result.skipped++;
              result.details.push({
                token: dossier.token,
                clientEmail,
                clientPhone,
                status: "skipped",
                reason: `El recordatorio ya fue enviado previamente. Solo se permite 1 envío por cliente.`,
              });
              continue;
            }
          }

          // Resolver enlace de pago dinámico
          const siteUrl = (metadata.siteUrl || ENV.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
          const paymentLink = `${siteUrl}/api/checkout/resume?token=${dossier.token}`;
          const clientLanguage: "es" | "en" = metadata.language === "en" ? "en" : "es";

          console.log(`\n--------------------------------------------------------------`);
          console.log(`📨 [PendingRecovery] Procesando recordatorio para ${clientName} (${clientEmail})`);
          console.log(`   Teléfono:     ${clientPhone}`);
          console.log(`   Estado:       ${state}`);
          console.log(`   Total:        $${totalAmount}`);
          console.log(`   Enlace Pago:  ${paymentLink}`);
          console.log(`   Idioma:       ${clientLanguage === "en" ? "Inglés (EN)" : "Español (ES)"}`);
          console.log(`   Recordatorio: #${reminderCount + 1}`);

          // 1. Enviar mensaje de WhatsApp a través del nuevo webhook de GoHighLevel (Inglés o Español)
          const ghlSuccess = await ghlService.sendPendingPaymentWhatsApp({
            fullName: clientName,
            phone: clientPhone,
            email: clientEmail,
            state,
            companyName: dossier.companyName || "LLC",
            totalAmount,
            paymentLink,
            submissionNumber: dossier.submissionNumber || undefined,
            language: clientLanguage,
          });

          // 2. Enviar correo al cliente (Inglés o Español según idioma de su proceso)
          const clientEmailSuccess = await mailService.sendPendingPaymentClientEmail({
            toEmail: clientEmail,
            clientName,
            paymentLink,
            companyName: dossier.companyName || undefined,
            language: clientLanguage,
          });

          // 3. Enviar correo a nuestro equipo administrativo
          const adminEmailSuccess = await mailService.sendPendingPaymentAdminEmail({
            clientName,
            clientEmail,
            clientPhone,
            state,
            totalAmount,
            language: clientLanguage,
          });

          // 4. Actualizar metadata de la orden con fecha y conteo de recordatorio
          if (dossier.orderId) {
            await prisma.order.update({
              where: { id: dossier.orderId },
              data: {
                metadata: {
                  ...metadata,
                  lastPendingReminderAt: new Date().toISOString(),
                  pendingReminderCount: reminderCount + 1,
                  lastReminderChannels: {
                    ghlWhatsApp: ghlSuccess,
                    clientEmail: clientEmailSuccess,
                    adminEmail: adminEmailSuccess,
                  },
                },
              },
            });
          }

          result.remindersSent++;
          result.details.push({
            token: dossier.token,
            clientEmail,
            clientPhone,
            status: "sent",
          });
        } catch (itemErr: any) {
          console.error(`❌ [PendingRecovery] Error procesando expediente ${dossier.token}:`, itemErr?.message || itemErr);
          result.errors++;
          result.details.push({
            token: dossier.token,
            clientEmail: dossier.client?.email || "",
            clientPhone: dossier.client?.phone || "",
            status: "error",
            reason: itemErr?.message || String(itemErr),
          });
        }
      }

      console.log(`\n🏁 [PendingRecovery] Resumen de verificación:`);
      console.log(`   Revisados:  ${result.totalChecked}`);
      console.log(`   Enviados:   ${result.remindersSent}`);
      console.log(`   Omitidos:   ${result.skipped}`);
      console.log(`   Errores:    ${result.errors}\n`);

      return result;
    } catch (err: any) {
      console.error("❌ [PendingRecovery] Error general en verificación:", err?.message || err);
      throw err;
    }
  }
}

export const pendingRecoveryService = new PendingRecoveryService();
