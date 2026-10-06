import { Resend } from "resend";
import nodemailer from "nodemailer";
import { ENV } from "../config/env";

export class MailService {
  private resend: Resend | null = null;
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // 1. Inicializar Resend (Proveedor principal prioritario)
    if (ENV.RESEND_API_KEY && !ENV.RESEND_API_KEY.includes("placeholder")) {
      this.resend = new Resend(ENV.RESEND_API_KEY);
      console.log("⚡ Resend: Cliente inicializado correctamente para envío de correos transaccionales.");
    } else {
      console.log("ℹ️ Resend: Clave API no detectada en RESEND_API_KEY. Se verificará fallback SMTP o modo simulación.");
    }

    // 2. Inicializar Nodemailer como fallback opcional si no hay Resend
    const isPlaceholder =
      !ENV.SMTP_PASS ||
      ENV.SMTP_PASS.includes("app_password") ||
      ENV.SMTP_PASS.includes("placeholder") ||
      ENV.SMTP_PASS === "tu_password";

    if (ENV.SMTP_USER && ENV.SMTP_PASS && !isPlaceholder) {
      this.transporter = nodemailer.createTransport({
        host: ENV.SMTP_HOST,
        port: ENV.SMTP_PORT,
        secure: ENV.SMTP_SECURE,
        auth: {
          user: ENV.SMTP_USER,
          pass: ENV.SMTP_PASS,
        },
      });
      console.log("📬 SMTP: Transporter Nodemailer configurado como fallback.");
    } else if (!this.resend) {
      console.log("ℹ️ Correo: Modo simulación activo. Los enlaces y notificaciones se registrarán en la consola del servidor.");
    }
  }

  /**
   * Envía un correo utilizando Resend como prioridad, con fallback a SMTP o simulación en consola.
   */
  private async dispatchEmail(params: {
    to: string;
    subject: string;
    html: string;
    logContext: string;
  }): Promise<boolean> {
    const { to, subject, html, logContext } = params;

    // Prioridad 1: Resend
    if (this.resend) {
      try {
        const fromAddress = ENV.RESEND_FROM || "CAMIKK Holdings <onboarding@resend.dev>";
        const { data, error } = await this.resend.emails.send({
          from: fromAddress,
          to: [to],
          subject,
          html,
        });

        if (error) {
          console.error(`❌ [Resend Error] Falló el envío (${logContext}):`, error.message);
          // Si Resend falla, intentar fallback a SMTP si está disponible
          if (this.transporter) {
            console.log(`🔄 Intentando fallback con Nodemailer SMTP...`);
            await this.transporter.sendMail({
              from: ENV.EMAIL_FROM,
              to,
              subject,
              html,
            });
            console.log(`✅ [Fallback SMTP] Correo enviado a ${to} con éxito.`);
            return true;
          }
          return false;
        }

        console.log(`🚀 [Resend] Correo enviado exitosamente a ${to}. ID: ${data?.id} (${logContext})`);
        return true;
      } catch (err: any) {
        console.error(`❌ [Resend Exception] Error enviando correo (${logContext}):`, err?.message || err);
      }
    }

    // Prioridad 2: Nodemailer SMTP
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: ENV.EMAIL_FROM,
          to,
          subject,
          html,
        });
        console.log(`✅ [SMTP] Correo enviado a ${to} (${logContext})`);
        return true;
      } catch (err: any) {
        console.warn(`⚠️ [SMTP] Error enviando correo (${logContext}):`, err?.message || err);
      }
    }

    // Prioridad 3: Modo Simulación en Desarrollo (Nunca bloquea la experiencia del cliente)
    console.log(`\n================ [CORREO SIMULADO — ${logContext.toUpperCase()}] ================`);
    console.log(`Destinatario: ${to}`);
    console.log(`Asunto:       ${subject}`);
    console.log(`Estado:       Registrado en logs (Configure RESEND_API_KEY en .env para entrega real)`);
    console.log(`===================================================================================\n`);
    return true;
  }

  /**
   * Envía al cliente el enlace único del expediente tras confirmarse el pago en Stripe (Español o Inglés)
   */
  async sendDossierLinkEmail(params: {
    toEmail: string;
    clientName: string;
    companyName: string;
    dossierUrl: string;
    totalPaid: string;
    language?: "es" | "en";
  }): Promise<boolean> {
    const { toEmail, clientName, companyName, dossierUrl, totalPaid, language = "es" } = params;
    const isEnglish = language === "en";

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="${isEnglish ? "en" : "es"}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isEnglish ? "Complete your LLC file" : "Completa el Expediente de tu LLC"} — CAMIKK Holdings</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f6f8; margin: 0; padding: 24px; color: #1c2d37; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,35,48,0.08); border: 1px solid #e1e7ec; }
        .header { background: #002330; padding: 36px 24px; text-align: center; }
        .logo-text { color: #d4af37; font-size: 26px; font-weight: 800; letter-spacing: 2.5px; margin: 0; text-transform: uppercase; }
        .tagline { color: #9bb0be; font-size: 12px; margin: 6px 0 0; letter-spacing: 1px; text-transform: uppercase; }
        .body { padding: 36px 32px; line-height: 1.65; }
        .badge { display: inline-block; background: #fdf6e2; color: #9c6c16; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 24px; margin-bottom: 20px; border: 1px solid #ebd9a2; }
        h1 { font-size: 22px; color: #002330; margin-top: 0; font-weight: 800; }
        p { margin: 14px 0; font-size: 15px; color: #37474f; }
        .btn-wrapper { text-align: center; margin: 34px 0 28px; }
        .btn { background: #d4af37; color: #002330 !important; font-weight: 800; font-size: 15px; padding: 16px 36px; border-radius: 8px; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(212,175,55,0.35); text-transform: uppercase; letter-spacing: 0.5px; }
        .footer { background: #001a24; padding: 26px 20px; text-align: center; font-size: 12px; color: #8fa0aa; }
        .footer p { margin: 4px 0; font-size: 12px; color: #8fa0aa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="logo-text">CAMIKK HOLDINGS</h2>
          <div class="tagline">${isEnglish ? "Corporate Structuring & U.S. Business Services" : "Estructuración Corporativa & Servicios Legales en EE.UU."}</div>
        </div>
        <div class="body">
          <span class="badge">${isEnglish ? "Payment Confirmed — USD $" : "Pago Confirmado — USD $"}${totalPaid}</span>
          <h1>${isEnglish ? `Hello, ${clientName}!` : `¡Hola, ${clientName}!`}</h1>
          <p>${
            isEnglish
              ? `Your payment has been successfully processed. We have reserved the formation process for your company <strong>${companyName}</strong>.`
              : `Tu pago ha sido procesado con éxito. Ya hemos reservado el trámite para la constitución de tu empresa <strong>${companyName}</strong>.`
          }</p>
          <p>${
            isEnglish
              ? `To file the registration with the Department of State and obtain your <strong>EIN from the IRS, Operating Agreement, corporate seals and certificates</strong>, please complete your secure digital file.`
              : `Para tramitar el registro ante el Departamento de Estado y gestionar tu <strong>EIN con el IRS, Operating Agreement, sellos y certificaciones corporativas</strong>, necesitamos que completes tu expediente digital.`
          }</p>
          
          <div class="btn-wrapper">
            <a href="${dossierUrl}" class="btn" target="_blank">${isEnglish ? "Complete My File Now" : "Completar Mi Expediente Ahora"}</a>
          </div>
        </div>
        <div class="footer">
          <p><strong>CAMIKK Holdings LLC</strong> • Allentown, PA • ${isEnglish ? "United States" : "Estados Unidos"}</p>
          <p>${isEnglish ? "Support" : "Soporte especializado"}: <a href="mailto:info@camikk.com" style="color: #d4af37;">info@camikk.com</a></p>
          <p>© ${new Date().getFullYear()} CAMIKK Holdings LLC. ${isEnglish ? "All rights reserved." : "Todos los derechos reservados."}</p>
        </div>
      </div>
    </body>
    </html>
    `;

    console.log(`\n📬 [ENLACE EXPEDIENTE LLC - ${isEnglish ? "EN" : "ES"}]`);
    console.log(`Cliente: ${clientName} (${toEmail})`);
    console.log(`Empresa: ${companyName}`);
    console.log(`Idioma:  ${isEnglish ? "English" : "Español"}`);
    console.log(`Enlace:  ${dossierUrl}\n`);

    const subject = isEnglish
      ? `Payment Received! Complete your LLC file (${companyName}) — CAMIKK Holdings`
      : `¡Pago Recibido! Completa el Expediente de tu LLC (${companyName}) — CAMIKK Holdings`;

    return this.dispatchEmail({
      to: toEmail,
      subject,
      html: htmlContent,
      logContext: `Expediente LLC ${companyName} (${language})`,
    });
  }

  /**
   * Notificación cuando el cliente envía el expediente final con sus documentos completados (Español o Inglés)
   */
  async sendSubmissionConfirmationEmail(params: {
    toEmail: string;
    clientName: string;
    companyName?: string;
    submissionId?: string;
    language?: "es" | "en";
  }): Promise<boolean> {
    const { toEmail, clientName, companyName, submissionId, language = "es" } = params;
    const isEnglish = language === "en";
    const firstName = (clientName || "").trim().split(/\s+/)[0] || (isEnglish ? "Client" : "Cliente");

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="${isEnglish ? "en" : "es"}">
    <head>
      <meta charset="utf-8">
      <title>${isEnglish ? "We have received your LLC documentation" : "Hemos recibido la documentación de tu LLC"} — CAMIKK Holdings</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f7f9fa; padding: 24px; color: #1c2d37; margin: 0; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e7ec; box-shadow: 0 4px 15px rgba(0,35,48,0.06); }
        .header { background: #002330; padding: 30px; text-align: center; }
        .logo-text { color: #d4af37; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
        .body { padding: 32px; line-height: 1.65; font-size: 15px; color: #2c3e50; }
        .badge { display: inline-block; background: #e6f9ed; color: #107e3e; font-weight: 700; padding: 6px 16px; border-radius: 20px; font-size: 13px; margin-bottom: 16px; border: 1px solid #c4edd5; }
        .footer { background: #001a24; padding: 20px; text-align: center; font-size: 12px; color: #8fa0aa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="logo-text">CAMIKK HOLDINGS</h2>
        </div>
        <div class="body">
          <span class="badge">${isEnglish ? "Documentation Received" : "Documentación Recibida"}</span>
          <p>${isEnglish ? `Hello, ${firstName}:` : `Hola, ${firstName}:`}</p>
          <p>${
            isEnglish
              ? `We have successfully received the information and documents submitted for the formation of your LLC${companyName ? ` (<strong>${companyName}</strong>)` : ""}.`
              : `Hemos recibido correctamente la información y los documentos enviados para la creación de tu LLC${companyName ? ` (<strong>${companyName}</strong>)` : ""}.`
          }</p>
          <p>${
            isEnglish
              ? `Our team will review the file to verify that the information is complete and begin the formation process. If we need any clarification or additional documentation, we will contact you.`
              : `Nuestro equipo revisará el expediente para comprobar que la información esté completa y poder comenzar el trámite. Si necesitamos alguna aclaración o documentación adicional, nos comunicaremos contigo.`
          }</p>
          <p>${
            isEnglish
              ? `We will keep you updated on the progress of your application and the next steps.`
              : `Te mantendremos informado sobre el avance de tu solicitud y los siguientes pasos.`
          }</p>
          
          <p style="margin-top: 26px;">${isEnglish ? "Best regards," : "Un saludo,"}<br><strong>${isEnglish ? "CAMIKK Holdings Team" : "Equipo de CAMIKK Holdings"}</strong></p>
        </div>
        <div class="footer">
          CAMIKK Holdings LLC • Allentown, PA • ${isEnglish ? "Support" : "Soporte"}: info@camikk.com
        </div>
      </div>
    </body>
    </html>
    `;

    console.log(`\n📬 [CORREO CONFIRMACIÓN DOCUMENTACIÓN RECIBIDA CLIENTE - ${isEnglish ? "EN" : "ES"}]`);
    console.log(`Cliente: ${clientName} (${toEmail})`);
    console.log(`ID:      ${submissionId || "N/A"}`);
    console.log(`Idioma:  ${isEnglish ? "English" : "Español"}\n`);

    const subject = isEnglish
      ? `We have received your LLC documentation`
      : `Hemos recibido la documentación de tu LLC`;

    return this.dispatchEmail({
      to: toEmail,
      subject,
      html: htmlContent,
      logContext: `Documentación Recibida Cliente ${clientName} (${language})`,
    });
  }

  /**
   * Notificación para el equipo interno cuando el cliente completa y envía el expediente
   */
  async sendDossierSubmittedAdminEmail(params: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    state: string;
    applicationId: string;
    dossierUrl: string;
    toEmail?: string;
    language?: "es" | "en";
  }): Promise<boolean> {
    const {
      clientName,
      clientEmail,
      clientPhone,
      state,
      applicationId,
      dossierUrl,
      toEmail = ENV.ADMIN_NOTIFICATION_EMAIL || "c.martinez@coraltechnology.online",
      language = "es",
    } = params;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Nuevo expediente de LLC pendiente de revisión — CAMIKK Holdings</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 24px; color: #1c2d37; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,35,48,0.06); border: 1px solid #e1e7ec; }
        .header { background: #002330; padding: 28px 24px; text-align: center; }
        .logo-text { color: #d4af37; font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
        .body { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #2c3e50; }
        .badge { display: inline-block; background: #e6f9ed; color: #107e3e; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; border: 1px solid #c4edd5; }
        .data-box { background: #f8fafc; border-radius: 8px; padding: 18px 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
        .data-box p { margin: 6px 0; font-size: 14.5px; }
        .btn-wrapper { margin: 20px 0; }
        .btn { background: #d4af37; color: #002330 !important; font-weight: 800; font-size: 14px; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; text-transform: uppercase; }
        .footer { background: #001a24; padding: 18px; text-align: center; font-size: 12px; color: #8fa0aa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="logo-text">CAMIKK HOLDINGS</h2>
        </div>
        <div class="body">
          <span class="badge">Nuevo Expediente Radicado</span>
          <p>Hola, equipo:</p>
          <p>Se ha recibido la información y documentación del siguiente expediente de LLC:</p>
          
          <div class="data-box">
            <p><strong>Cliente:</strong> ${clientName}</p>
            <p><strong>Correo:</strong> ${clientEmail}</p>
            <p><strong>Teléfono:</strong> ${clientPhone || "No especificado"}</p>
            <p><strong>Estado de constitución:</strong> ${state}</p>
            <p><strong>ID de solicitud:</strong> ${applicationId}</p>
            <p><strong>Idioma del cliente:</strong> ${language === "en" ? "Inglés (EN)" : "Español (ES)"}</p>
          </div>

          <p>Por favor, revisen internamente la información y los documentos recibidos para confirmar si el expediente está completo y puede pasar a la etapa de presentación.</p>
          
          <p style="margin-top: 16px;"><strong>Expediente:</strong> <a href="${dossierUrl}" style="color: #0066cc; word-break: break-all;">${dossierUrl}</a></p>

          <div class="btn-wrapper">
            <a href="${dossierUrl}" class="btn" target="_blank">Revisar Expediente</a>
          </div>

          <p style="margin-top: 24px; font-weight: 700; color: #002330;">CAMIKK Holdings</p>
        </div>
        <div class="footer">
          CAMIKK Holdings LLC • Notificación Administrativa Interna
        </div>
      </div>
    </body>
    </html>
    `;

    console.log(`\n📬 [NOTIFICACIÓN ADMIN - EXPEDIENTE RADICADO]`);
    console.log(`Admin Destino:   ${toEmail}`);
    console.log(`Cliente:         ${clientName}`);
    console.log(`Correo:          ${clientEmail}`);
    console.log(`Teléfono:        ${clientPhone}`);
    console.log(`Estado:          ${state}`);
    console.log(`ID Solicitud:    ${applicationId}`);
    console.log(`Enlace:          ${dossierUrl}\n`);

    return this.dispatchEmail({
      to: toEmail,
      subject: `Nuevo expediente de LLC pendiente de revisión`,
      html: htmlContent,
      logContext: `Notificación Admin Expediente ${applicationId}`,
    });
  }

  /**
   * Envía confirmación de la cita de consulta agendada
   */
  async sendConsultationConfirmationEmail(params: {
    toEmail: string;
    clientName: string;
    topic: string;
    scheduledDate: string;
    timeSlot: string;
    timeZone: string;
  }): Promise<boolean> {
    const { toEmail, clientName, topic, scheduledDate, timeSlot, timeZone } = params;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Tu Consulta está Confirmada — CAMIKK Holdings</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 24px; color: #1c2d37; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,35,48,0.06); border: 1px solid #e1e7ec; }
        .header { background: #002330; padding: 32px 24px; text-align: center; }
        .logo-text { color: #d4af37; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; }
        .body { padding: 36px 30px; line-height: 1.6; }
        .badge { display: inline-block; background: #fdf6e2; color: #9c6c16; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; border: 1px solid #ebd9a2; }
        h1 { font-size: 22px; color: #002330; margin-top: 0; }
        .details-box { background: #f3f6f8; border-radius: 8px; padding: 18px; margin: 24px 0; font-size: 14px; }
        .footer { background: #001a24; padding: 20px; text-align: center; font-size: 12px; color: #8fa0aa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="logo-text">CAMIKK HOLDINGS</h2>
        </div>
        <div class="body">
          <span class="badge">Cita Agendada y Confirmada</span>
          <h1>¡Hola, ${clientName}!</h1>
          <p>Tu consulta empresarial de <strong>45 minutos</strong> ha sido confirmada y agendada exitosamente en nuestro sistema.</p>
          
          <div class="details-box">
            <p style="margin: 6px 0;"><strong>📅 Fecha:</strong> ${scheduledDate}</p>
            <p style="margin: 6px 0;"><strong>⏰ Hora:</strong> ${timeSlot} (${timeZone})</p>
            <p style="margin: 6px 0;"><strong>🎯 Tema:</strong> ${topic}</p>
            <p style="margin: 6px 0;"><strong>👔 Especialista:</strong> Especialista Legal & Corporativo CAMIKK</p>
            <p style="margin: 6px 0;"><strong>💻 Modalidad:</strong> Videollamada 1-a-1</p>
          </div>

          <p>Un especialista de nuestro equipo se conectará contigo puntualmente en la fecha indicada. Te enviaremos el enlace directo de acceso antes de la sesión.</p>
        </div>
        <div class="footer">
          CAMIKK Holdings LLC • Allentown, PA • Soporte: info@camikk.com
        </div>
      </div>
    </body>
    </html>
    `;

    return this.dispatchEmail({
      to: toEmail,
      subject: `Consulta Confirmada: ${scheduledDate} a las ${timeSlot} — CAMIKK Holdings`,
      html: htmlContent,
      logContext: `Cita Consulta ${scheduledDate}`,
    });
  }

  /**
   * Notificación para administradores cuando se compra una LLC
   */
  async sendAdminNewLlcOrderEmail(params: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    state: string;
    totalPaid: string;
    toEmail?: string;
    language?: "es" | "en";
    autoRenewRegisteredOffice?: boolean;
  }): Promise<boolean> {
    const {
      clientName,
      clientEmail,
      clientPhone,
      state,
      totalPaid,
      toEmail = ENV.ADMIN_NOTIFICATION_EMAIL || "c.martinez@coraltechnology.online",
      language = "es",
      autoRenewRegisteredOffice = false,
    } = params;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Nueva Solicitud de LLC Pagada — CAMIKK Holdings</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 24px; color: #1c2d37; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,35,48,0.06); border: 1px solid #e1e7ec; }
        .header { background: #002330; padding: 28px 24px; text-align: center; }
        .logo-text { color: #d4af37; font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 0; }
        .body { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #2c3e50; }
        .badge { display: inline-block; background: #e6f9ed; color: #107e3e; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; border: 1px solid #c4edd5; }
        .data-box { background: #f8fafc; border-radius: 8px; padding: 18px 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
        .data-box p { margin: 6px 0; font-size: 14.5px; }
        .footer { background: #001a24; padding: 18px; text-align: center; font-size: 12px; color: #8fa0aa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="logo-text">CAMIKK HOLDINGS</h2>
        </div>
        <div class="body">
          <span class="badge">Pago Confirmado — Notificación de Administración</span>
          <p>Hola, equipo:</p>
          <p>Se ha recibido correctamente el pago de una nueva solicitud de creación de LLC.</p>
          
          <div class="data-box">
            <p><strong>Cliente:</strong> ${clientName}</p>
            <p><strong>Correo:</strong> ${clientEmail}</p>
            <p><strong>Teléfono:</strong> ${clientPhone || "No especificado"}</p>
            <p><strong>Estado:</strong> ${state}</p>
            <p><strong>Importe pagado:</strong> $${totalPaid}</p>
            <p><strong>Idioma del cliente:</strong> ${language === "en" ? "Inglés (EN)" : "Español (ES)"}</p>
            <p><strong>Renovación Anual (Registered Office):</strong> ${autoRenewRegisteredOffice ? "✅ Suscrita (Programada automáticamente en Stripe por $127 USD/año en 1 año)" : "❌ No suscrita"}</p>
          </div>

          <p>El cliente ya recibió el enlace para completar la información y cargar los documentos necesarios.</p>
          <p style="margin-top: 24px; font-weight: 700; color: #002330;">CAMIKK Holdings</p>
        </div>
        <div class="footer">
          CAMIKK Holdings LLC • Notificación Administrativa Interna
        </div>
      </div>
    </body>
    </html>
    `;

    console.log(`\n📬 [NOTIFICACIÓN ADMIN - COMPRA LLC]`);
    console.log(`Admin Destino: ${toEmail}`);
    console.log(`Cliente:       ${clientName}`);
    console.log(`Correo:        ${clientEmail}`);
    console.log(`Estado:        ${state}`);
    console.log(`Importe:       $${totalPaid}`);
    console.log(`Idioma:        ${language === "en" ? "Inglés" : "Español"}\n`);

    return this.dispatchEmail({
      to: toEmail,
      subject: `Nueva compra de LLC: ${clientName} (${state}) — CAMIKK Holdings`,
      html: htmlContent,
      logContext: `Notificación Admin LLC ${clientName}`,
    });
  }

  /**
   * Correo al cliente cuando el pago de su LLC quedó pendiente (Español o Inglés según idioma de la página)
   */
  async sendPendingPaymentClientEmail(params: {
    toEmail: string;
    clientName: string;
    paymentLink: string;
    companyName?: string;
    language?: "es" | "en";
  }): Promise<boolean> {
    const { toEmail, clientName, paymentLink, companyName, language = "es" } = params;
    const isEnglish = language === "en";
    const firstName = (clientName || "").trim().split(/\s+/)[0] || (isEnglish ? "Client" : "Cliente");

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="${isEnglish ? "en" : "es"}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isEnglish ? "Continue with your LLC formation process" : "Continúa con el proceso de creación de tu LLC"} — CAMIKK Holdings</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 24px; color: #1c2d37; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,35,48,0.06); border: 1px solid #e1e7ec; }
        .header { background: #002330; padding: 32px 24px; text-align: center; }
        .logo-text { color: #d4af37; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
        .body { padding: 36px 30px; line-height: 1.65; font-size: 15px; color: #2c3e50; }
        .badge { display: inline-block; background: #fff8e6; color: #b7791f; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; border: 1px solid #fbd38d; }
        .btn-wrapper { text-align: center; margin: 30px 0; }
        .btn { background: #d4af37; color: #002330 !important; font-weight: 800; font-size: 15px; padding: 15px 32px; border-radius: 8px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(212,175,55,0.3); text-transform: uppercase; letter-spacing: 0.5px; }
        .link-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; word-break: break-all; font-size: 13.5px; color: #4a5568; margin: 20px 0; }
        .footer { background: #001a24; padding: 20px; text-align: center; font-size: 12px; color: #8fa0aa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="logo-text">CAMIKK HOLDINGS</h2>
        </div>
        <div class="body">
          <span class="badge">${isEnglish ? "Pending Payment Application" : "Trámite Pendiente de Pago"}</span>
          <p>${isEnglish ? `Hello, ${firstName}:` : `Hola, ${firstName}:`}</p>
          <p>${
            isEnglish
              ? `We noticed that you started the process to form your LLC${companyName ? ` (<strong>${companyName}</strong>)` : ""}, but the payment was not completed.`
              : `Vimos que comenzaste el proceso para crear tu LLC${companyName ? ` (<strong>${companyName}</strong>)` : ""}, pero el pago no llegó a completarse.`
          }</p>
          <p>${
            isEnglish
              ? `You can resume and continue your application using the following link:`
              : `Puedes retomarlo y continuar con el trámite desde este enlace:`
          }</p>
          
          <div class="btn-wrapper">
            <a href="${paymentLink}" class="btn" target="_blank">${isEnglish ? "Continue Application" : "Continuar con el Trámite"}</a>
          </div>

          <div class="link-box">
            <a href="${paymentLink}" style="color: #0066cc; text-decoration: underline;">${paymentLink}</a>
          </div>

          <p>${
            isEnglish
              ? `Once your payment is confirmed, you will receive a personal link to complete the information and upload the required documents to begin forming your LLC.`
              : `Una vez confirmado el pago, recibirás un enlace personal para completar la información y cargar los documentos necesarios para iniciar la creación de tu LLC.`
          }</p>
          <p>${
            isEnglish
              ? `If you experienced any issues or need assistance before continuing, reply to this email and our team will help you.`
              : `Si tuviste algún inconveniente o necesitas ayuda antes de continuar, responde a este correo y nuestro equipo te ayudará.`
          }</p>
          
          <p style="margin-top: 26px;">${isEnglish ? "Best regards," : "Un saludo,"}<br><strong>${isEnglish ? "CAMIKK Holdings Team" : "Equipo de CAMIKK Holdings"}</strong></p>
        </div>
        <div class="footer">
          CAMIKK Holdings LLC • ${isEnglish ? "Support" : "Soporte"}: info@camikk.com
        </div>
      </div>
    </body>
    </html>
    `;

    console.log(`\n📬 [CORREO RECORDATORIO PAGO PENDIENTE CLIENTE - ${isEnglish ? "EN" : "ES"}]`);
    console.log(`Cliente: ${clientName} (${toEmail})`);
    console.log(`Idioma:  ${isEnglish ? "English" : "Español"}`);
    console.log(`Enlace:  ${paymentLink}\n`);

    const subject = isEnglish
      ? `Continue with your LLC formation process`
      : `Continúa con el proceso de creación de tu LLC`;

    return this.dispatchEmail({
      to: toEmail,
      subject,
      html: htmlContent,
      logContext: `Recordatorio Pago Pendiente Cliente ${clientName} (${language})`,
    });
  }

  /**
   * Correo a nuestro equipo cuando una LLC queda con pago pendiente
   */
  async sendPendingPaymentAdminEmail(params: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    state: string;
    totalAmount: number | string;
    toEmail?: string;
    language?: "es" | "en";
  }): Promise<boolean> {
    const {
      clientName,
      clientEmail,
      clientPhone,
      state,
      totalAmount,
      toEmail = ENV.ADMIN_NOTIFICATION_EMAIL || "c.martinez@coraltechnology.online",
      language = "es",
    } = params;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Pago de LLC pendiente de completar — CAMIKK Holdings</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 24px; color: #1c2d37; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,35,48,0.06); border: 1px solid #e1e7ec; }
        .header { background: #002330; padding: 28px 24px; text-align: center; }
        .logo-text { color: #d4af37; font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
        .body { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #2c3e50; }
        .badge { display: inline-block; background: #fff8e6; color: #b7791f; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; border: 1px solid #fbd38d; }
        .data-box { background: #f8fafc; border-radius: 8px; padding: 18px 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
        .data-box p { margin: 6px 0; font-size: 14.5px; }
        .footer { background: #001a24; padding: 18px; text-align: center; font-size: 12px; color: #8fa0aa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="logo-text">CAMIKK HOLDINGS</h2>
        </div>
        <div class="body">
          <span class="badge">Alerta de Pago Pendiente — Equipo Interno</span>
          <p>Hola, equipo:</p>
          <p>El siguiente cliente inició el proceso de compra de una LLC, pero no completó el pago:</p>
          
          <div class="data-box">
            <p><strong>Cliente:</strong> ${clientName}</p>
            <p><strong>Correo:</strong> ${clientEmail}</p>
            <p><strong>Teléfono:</strong> ${clientPhone || "No especificado"}</p>
            <p><strong>Estado seleccionado:</strong> ${state}</p>
            <p><strong>Importe pendiente:</strong> $${totalAmount}</p>
            <p><strong>Idioma del cliente:</strong> ${language === "en" ? "Inglés (EN)" : "Español (ES)"}</p>
          </div>

          <p>Ya se le ha enviado un mensaje por WhatsApp con el enlace para retomar el pago y continuar con el trámite.</p>
          <p style="margin-top: 24px; font-weight: 700; color: #002330;">CAMIKK Holdings</p>
        </div>
        <div class="footer">
          CAMIKK Holdings LLC • Notificación Administrativa Interna
        </div>
      </div>
    </body>
    </html>
    `;

    console.log(`\n📬 [NOTIFICACIÓN ADMIN - PAGO LLC PENDIENTE]`);
    console.log(`Admin Destino:      ${toEmail}`);
    console.log(`Cliente:            ${clientName}`);
    console.log(`Correo:             ${clientEmail}`);
    console.log(`Teléfono:           ${clientPhone}`);
    console.log(`Estado:             ${state}`);
    console.log(`Importe Pendiente:  $${totalAmount}`);
    console.log(`Idioma:             ${language === "en" ? "Inglés" : "Español"}\n`);

    return this.dispatchEmail({
      to: toEmail,
      subject: `Pago de LLC pendiente de completar`,
      html: htmlContent,
      logContext: `Alerta Admin Pago Pendiente ${clientName}`,
    });
  }
}

export const mailService = new MailService();

