import { ENV } from "../config/env";

export interface GhlLlcLeadData {
  fullName: string;
  phone: string;
  email: string;
  state: string;
  companyName: string;
  secondChoiceName?: string;
  businessActivity: string;
  ownersCount: string;
  autoRenewRegisteredOffice?: boolean;
  language?: "es" | "en";
  siteUrl?: string;
  totalAmount?: number;
  stateFee?: number;
  serviceFee?: number;
  token?: string;
  sessionId?: string;
  submissionNumber?: string;
  status?: string;
  paymentStatus?: "Pago pendiente" | "Pago recibido" | string;
  dossierUrl?: string;
}

export class GhlService {
  private webhookUrl: string;
  private whatsappWebhookUrl: string;

  constructor() {
    this.webhookUrl =
      ENV.GHL_LLC_WEBHOOK_URL ||
      "https://services.leadconnectorhq.com/hooks/aHD8KXbpJBMl7s7fUD6X/webhook-trigger/d56a6193-d738-406e-8464-bd7521ca02c4";
    this.whatsappWebhookUrl =
      ENV.GHL_WHATSAPP_WEBHOOK_URL ||
      "https://services.leadconnectorhq.com/hooks/aHD8KXbpJBMl7s7fUD6X/webhook-trigger/2bc71d4f-dbaf-49f5-a921-6fb2401c21c6";
  }

  /**
   * Genera el mensaje de confirmación de pago personalizado para el cliente en español o inglés
   */
  buildPaymentConfirmationMessage(firstName: string, dossierUrl: string, language: "es" | "en" = "es"): string {
    const isEnglish = language === "en";
    const name = (firstName || "").trim() || (isEnglish ? "Client" : "Cliente");
    const link = dossierUrl || "";

    if (isEnglish) {
      return `Hello, ${name}. We have successfully received your payment for the LLC formation service.

To begin the process, please complete the requested information and upload the required documents using your personal link:

${link}

This link is personal and secure. Save it, as you will be able to use it to resume your application if you do not complete everything in a single session.

Once we receive the complete file, our team will review the information and contact you if any clarification is needed.

CAMIKK Holdings.`;
    }

    return `Hola, ${name}. Hemos recibido correctamente tu pago por el servicio de creación de tu LLC.

Para comenzar el trámite, completa la información solicitada y carga los documentos necesarios en tu enlace personal:

${link}

Este enlace es personal y seguro. Guárdalo, ya que podrás utilizarlo para retomar tu solicitud si no completas todo en una sola sesión.

Cuando recibamos el expediente completo, nuestro equipo revisará la información y te contactará si necesita alguna aclaración.

CAMIKK Holdings.`;
  }

  /**
   * Extrae nombre y apellido(s) para mapeo estándar en GoHighLevel / LeadConnector
   */
  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName || "").trim().split(/\s+/);
    if (parts.length <= 1) {
      return { firstName: parts[0] || "", lastName: "" };
    }
    const firstName = parts.slice(0, -1).join(" ");
    const lastName = parts[parts.length - 1];
    return { firstName, lastName };
  }

  /**
   * Envía la información capturada en "Crear LLC" cuando el usuario inicia el checkout.
   * El estado inicial es "Pago pendiente".
   */
  async sendLlcLead(data: GhlLlcLeadData): Promise<boolean> {
    const { firstName, lastName } = this.splitName(data.fullName);
    const isEnglish = data.language === "en";

    const payload = {
      event: "llc_checkout_iniciado",
      source: "CAMIKK Holdings - Formulario Crear LLC",
      date: new Date().toISOString(),

      // Idioma del cliente
      idioma: isEnglish ? "en" : "es",
      language: isEnglish ? "en" : "es",
      idioma_cliente: isEnglish ? "Inglés" : "Español",
      client_language: isEnglish ? "English" : "Spanish",

      // Contacto estándar para GoHighLevel
      first_name: firstName,
      firstName,
      last_name: lastName,
      lastName,
      name: data.fullName,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,

      // Datos de la LLC
      company_name: data.companyName,
      companyName: data.companyName,
      second_choice_name: data.secondChoiceName || "",
      secondChoiceName: data.secondChoiceName || "",
      state: data.state,
      company_state: data.state,
      business_activity: data.businessActivity,
      businessActivity: data.businessActivity,
      owners_count: data.ownersCount,
      ownersCount: data.ownersCount,

      // Suscripción de renovación anual (Registered Office)
      auto_renew_registered_office: !!data.autoRenewRegisteredOffice,
      autoRenewRegisteredOffice: !!data.autoRenewRegisteredOffice,
      renovacion_anual_suscrita: !!data.autoRenewRegisteredOffice,
      renovacion_anual: data.autoRenewRegisteredOffice ? "Si" : "No",
      suscripcion_renovacion_anual: data.autoRenewRegisteredOffice ? "Suscrito" : "No suscrito",
      annual_renewal_subscribed: !!data.autoRenewRegisteredOffice,
      annual_renewal: data.autoRenewRegisteredOffice ? "Yes" : "No",

      // Estados requeridos
      status: "Pago pendiente",
      estado_tramite: "Pago pendiente",
      payment_status: "Pago pendiente",
      estado_pago: "Pago pendiente",

      // Detalles económicos y enlaces
      service_fee: data.serviceFee || 725,
      state_fee: data.stateFee || 0,
      total_amount: data.totalAmount || 0,
      totalPaid: 0,
      token: data.token || "",
      session_id: data.sessionId || "",
      submission_number: data.submissionNumber || "",
      submissionNumber: data.submissionNumber || "",
      numero_expediente: data.submissionNumber || "",

      // Enlace para subir documentos: Vacío hasta que se confirme el pago
      dossier_url: "",
      dossierUrl: "",
      enlace_subir_documentos: "",
      enlace_documentos: "",
      enlace_formulario: "",
      enlace_expediente: "",
      url_subir_documentos: "",
      link_subir_documentos: "",
      document_upload_url: "",

      // Etiquetas útiles para automatizaciones en GoHighLevel
      tags: [
        "LLC Lead",
        "Pago pendiente",
        `Estado: ${data.state}`,
        `Propietarios: ${data.ownersCount}`,
        data.autoRenewRegisteredOffice ? "Renovación Anual: Sí" : "Renovación Anual: No",
        isEnglish ? "Idioma: Inglés" : "Idioma: Español",
      ],
    };

    return this.postToWebhook(payload, "Crear LLC (Pago Pendiente)");
  }

  /**
   * Envía la actualización cuando el pago es confirmado exitosamente por Stripe o verificación.
   * El estado se actualiza a "Formulario de información/documentación enviado" y pago recibido.
   */
  async sendLlcPaymentConfirmed(data: GhlLlcLeadData): Promise<boolean> {
    const { firstName, lastName } = this.splitName(data.fullName);
    const siteUrl = (data.siteUrl || ENV.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const dossierUrl = data.dossierUrl || (data.token ? `${siteUrl}/dossier?token=${data.token}` : "");
    const isEnglish = data.language === "en";

    // Mensaje solicitado por el usuario con variables dinámicas interpoladas
    const confirmationMessage = this.buildPaymentConfirmationMessage(firstName, dossierUrl, data.language || "es");
    const templateMessage = this.buildPaymentConfirmationMessage("{{contact.first_name}}", dossierUrl, data.language || "es");

    const payload = {
      event: "llc_pago_confirmado",
      source: "CAMIKK Holdings - Stripe Checkout / Pago Confirmado",
      date: new Date().toISOString(),

      // Idioma del cliente
      idioma: isEnglish ? "en" : "es",
      language: isEnglish ? "en" : "es",
      idioma_cliente: isEnglish ? "Inglés" : "Español",
      client_language: isEnglish ? "English" : "Spanish",

      // Contacto estándar
      first_name: firstName,
      firstName,
      last_name: lastName,
      lastName,
      name: data.fullName,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,

      // Datos de la LLC
      company_name: data.companyName,
      companyName: data.companyName,
      second_choice_name: data.secondChoiceName || "",
      secondChoiceName: data.secondChoiceName || "",
      state: data.state,
      company_state: data.state,
      business_activity: data.businessActivity,
      businessActivity: data.businessActivity,
      owners_count: data.ownersCount,
      ownersCount: data.ownersCount,

      // Suscripción de renovación anual (Registered Office)
      auto_renew_registered_office: !!data.autoRenewRegisteredOffice,
      autoRenewRegisteredOffice: !!data.autoRenewRegisteredOffice,
      renovacion_anual_suscrita: !!data.autoRenewRegisteredOffice,
      renovacion_anual: data.autoRenewRegisteredOffice ? "Si" : "No",
      suscripcion_renovacion_anual: data.autoRenewRegisteredOffice ? "Suscrito" : "No suscrito",
      annual_renewal_subscribed: !!data.autoRenewRegisteredOffice,
      annual_renewal: data.autoRenewRegisteredOffice ? "Yes" : "No",

      // Estados actualizados tras el pago
      status: "Formulario de información/documentación enviado",
      estado_tramite: "Formulario de información/documentación enviado",
      payment_status: "Pago recibido",
      estado_pago: "Pago recibido",

      // Detalles económicos y enlaces
      total_amount: data.totalAmount || 0,
      totalPaid: data.totalAmount || 0,
      state_fee: data.stateFee || 0,
      token: data.token || "",
      session_id: data.sessionId || "",
      submission_number: data.submissionNumber || "",
      submissionNumber: data.submissionNumber || "",
      numero_expediente: data.submissionNumber || "",

      // Enlace para subir documentos / acceder al formulario
      dossier_url: dossierUrl,
      dossierUrl: dossierUrl,
      enlace_subir_documentos: dossierUrl,
      enlace_documentos: dossierUrl,
      enlace_formulario: dossierUrl,
      enlace_expediente: dossierUrl,
      url_subir_documentos: dossierUrl,
      link_subir_documentos: dossierUrl,
      document_upload_url: dossierUrl,

      // MENSAJES PARA GHL (automatizaciones de WhatsApp, SMS, o Email)
      mensaje: confirmationMessage,
      message: confirmationMessage,
      mensaje_confirmacion: confirmationMessage,
      confirmation_message: confirmationMessage,
      texto_mensaje_cliente: confirmationMessage,
      whatsapp_message: confirmationMessage,
      sms_message: confirmationMessage,
      plantilla_mensaje: templateMessage,
      template_message: templateMessage,

      // Etiquetas para GoHighLevel
      tags: [
        "LLC Cliente",
        "Pago recibido",
        "Formulario enviado",
        `Estado: ${data.state}`,
        data.autoRenewRegisteredOffice ? "Renovación Anual: Sí" : "Renovación Anual: No",
        isEnglish ? "Idioma: Inglés" : "Idioma: Español",
      ],
    };

    return this.postToWebhook(payload, "Pago Confirmado LLC");
  }

  /**
   * Envía la actualización cuando el cliente llena el formulario, sube sus documentos y firma el expediente.
   * El estado se actualiza a "Información/Documentación recibida".
   */
  async sendDossierSubmitted(data: {
    fullName: string;
    email: string;
    phone?: string;
    companyName: string;
    state?: string;
    submissionNumber: string;
    token: string;
    autoRenewRegisteredOffice?: boolean;
    language?: "es" | "en";
    siteUrl?: string;
  }): Promise<boolean> {
    const { firstName, lastName } = this.splitName(data.fullName);
    const siteUrl = (data.siteUrl || ENV.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const dossierUrl = `${siteUrl}/dossier?token=${data.token}`;
    const isEnglish = data.language === "en";

    const payload = {
      event: "llc_documentacion_recibida",
      source: "CAMIKK Holdings - Expediente Completado y Radicado",
      date: new Date().toISOString(),

      // Idioma
      idioma: isEnglish ? "en" : "es",
      language: isEnglish ? "en" : "es",
      idioma_cliente: isEnglish ? "Inglés" : "Español",
      client_language: isEnglish ? "English" : "Spanish",

      first_name: firstName,
      firstName,
      last_name: lastName,
      lastName,
      name: data.fullName,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || "",

      company_name: data.companyName,
      companyName: data.companyName,
      state: data.state || "",
      company_state: data.state || "",

      // Suscripción de renovación anual (Registered Office)
      auto_renew_registered_office: !!data.autoRenewRegisteredOffice,
      autoRenewRegisteredOffice: !!data.autoRenewRegisteredOffice,
      renovacion_anual_suscrita: !!data.autoRenewRegisteredOffice,
      renovacion_anual: data.autoRenewRegisteredOffice ? "Si" : "No",
      suscripcion_renovacion_anual: data.autoRenewRegisteredOffice ? "Suscrito" : "No suscrito",
      annual_renewal_subscribed: !!data.autoRenewRegisteredOffice,
      annual_renewal: data.autoRenewRegisteredOffice ? "Yes" : "No",

      status: "Información/Documentación recibida",
      estado_tramite: "Información/Documentación recibida",
      payment_status: "Pago recibido",
      estado_pago: "Pago recibido",

      submission_number: data.submissionNumber,
      submissionNumber: data.submissionNumber,
      numero_expediente: data.submissionNumber,
      token: data.token,

      // Enlace para subir documentos / acceder al formulario
      dossier_url: dossierUrl,
      dossierUrl: dossierUrl,
      enlace_subir_documentos: dossierUrl,
      enlace_documentos: dossierUrl,
      enlace_formulario: dossierUrl,
      enlace_expediente: dossierUrl,
      url_subir_documentos: dossierUrl,
      link_subir_documentos: dossierUrl,
      document_upload_url: dossierUrl,

      // Mensaje WhatsApp solicitado para cliente que completó el formulario (Inglés o Español)
      message: isEnglish
        ? `Hello, ${firstName || "Client"}. We have successfully received the information and documentation for your LLC application.
Our team will review your file to verify that everything is complete and begin the process. If we need any additional information or documents, we will contact you.
We will keep you informed about the next steps.
CAMIKK Holdings`
        : `Hola, ${firstName || "Cliente"}. Hemos recibido correctamente la información y documentación de tu solicitud de LLC.
Nuestro equipo revisará el expediente para comprobar que todo esté completo y comenzar el trámite. Si necesitamos algún dato o documento adicional, nos comunicaremos contigo.
Te mantendremos informado sobre los siguientes pasos.
CAMIKK Holdings`,
      whatsapp_message: isEnglish
        ? `Hello, ${firstName || "Client"}. We have successfully received the information and documentation for your LLC application.
Our team will review your file to verify that everything is complete and begin the process. If we need any additional information or documents, we will contact you.
We will keep you informed about the next steps.
CAMIKK Holdings`
        : `Hola, ${firstName || "Cliente"}. Hemos recibido correctamente la información y documentación de tu solicitud de LLC.
Nuestro equipo revisará el expediente para comprobar que todo esté completo y comenzar el trámite. Si necesitamos algún dato o documento adicional, nos comunicaremos contigo.
Te mantendremos informado sobre los siguientes pasos.
CAMIKK Holdings`,
      mensaje: isEnglish
        ? `Hello, ${firstName || "Client"}. We have successfully received the information and documentation for your LLC application.
Our team will review your file to verify that everything is complete and begin the process. If we need any additional information or documents, we will contact you.
We will keep you informed about the next steps.
CAMIKK Holdings`
        : `Hola, ${firstName || "Cliente"}. Hemos recibido correctamente la información y documentación de tu solicitud de LLC.
Nuestro equipo revisará el expediente para comprobar que todo esté completo y comenzar el trámite. Si necesitamos algún dato o documento adicional, nos comunicaremos contigo.
Te mantendremos informado sobre los siguientes pasos.
CAMIKK Holdings`,
      mensaje_con_encabezado: isEnglish
        ? `WHATSAPP MESSAGE FOR CLIENT WHEN FORM IS COMPLETED

Hello, ${firstName || "Client"}. We have successfully received the information and documentation for your LLC application.
Our team will review your file to verify that everything is complete and begin the process. If we need any additional information or documents, we will contact you.
We will keep you informed about the next steps.
CAMIKK Holdings`
        : `MENSAJ DE WHATSAPP PARA CLIENTE CUANDO HA COMPLETADO EL FORMULARIO

Hola, ${firstName || "Cliente"}. Hemos recibido correctamente la información y documentación de tu solicitud de LLC.
Nuestro equipo revisará el expediente para comprobar que todo esté completo y comenzar el trámite. Si necesitamos algún dato o documento adicional, nos comunicaremos contigo.
Te mantendremos informado sobre los siguientes pasos.
CAMIKK Holdings`,
      plantilla_mensaje: isEnglish
        ? `Hello, {{contact.first_name}}. We have successfully received the information and documentation for your LLC application.
Our team will review your file to verify that everything is complete and begin the process. If we need any additional information or documents, we will contact you.
We will keep you informed about the next steps.
CAMIKK Holdings`
        : `Hola, {{contact.first_name}}. Hemos recibido correctamente la información y documentación de tu solicitud de LLC.
Nuestro equipo revisará el expediente para comprobar que todo esté completo y comenzar el trámite. Si necesitamos algún dato o documento adicional, nos comunicaremos contigo.
Te mantendremos informado sobre los siguientes pasos.
CAMIKK Holdings`,

      tags: [
        "LLC Cliente",
        "Documentación recibida",
        "Listo para revisión",
        data.autoRenewRegisteredOffice ? "Renovación Anual: Sí" : "Renovación Anual: No",
        isEnglish ? "Idioma: Inglés" : "Idioma: Español",
      ],
    };

    return this.postToWebhook(payload, "Expediente Radicado");
  }

  /**
   * Envía el mensaje de WhatsApp al webhook de GHL cuando el cliente completa y envía el formulario de documentos
   * Webhook: https://services.leadconnectorhq.com/hooks/aHD8KXbpJBMl7s7fUD6X/webhook-trigger/2bc71d4f-dbaf-49f5-a921-6fb2401c21c6
   */
  async sendDossierSubmittedWhatsApp(data: {
    fullName: string;
    phone: string;
    email: string;
    companyName: string;
    state?: string;
    submissionNumber: string;
    token: string;
    language?: "es" | "en";
    siteUrl?: string;
  }): Promise<boolean> {
    const { firstName, lastName } = this.splitName(data.fullName);
    const isEnglish = data.language === "en";
    const clientFirstName = (firstName || (isEnglish ? "Client" : "Cliente")).trim();
    const siteUrl = (data.siteUrl || ENV.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const dossierUrl = `${siteUrl}/dossier?token=${data.token}`;

    const whatsappMessage = isEnglish
      ? `Hello, ${clientFirstName}. We have successfully received the information and documentation for your LLC application.
Our team will review your file to verify that everything is complete and begin the process. If we need any additional information or documents, we will contact you.
We will keep you informed about the next steps.
CAMIKK Holdings`
      : `Hola, ${clientFirstName}. Hemos recibido correctamente la información y documentación de tu solicitud de LLC.
Nuestro equipo revisará el expediente para comprobar que todo esté completo y comenzar el trámite. Si necesitamos algún dato o documento adicional, nos comunicaremos contigo.
Te mantendremos informado sobre los siguientes pasos.
CAMIKK Holdings`;

    const whatsappMessageConEncabezado = isEnglish
      ? `WHATSAPP MESSAGE FOR CLIENT WHEN FORM IS COMPLETED

Hello, ${clientFirstName}. We have successfully received the information and documentation for your LLC application.
Our team will review your file to verify that everything is complete and begin the process. If we need any additional information or documents, we will contact you.
We will keep you informed about the next steps.
CAMIKK Holdings`
      : `MENSAJ DE WHATSAPP PARA CLIENTE CUANDO HA COMPLETADO EL FORMULARIO

Hola, ${clientFirstName}. Hemos recibido correctamente la información y documentación de tu solicitud de LLC.
Nuestro equipo revisará el expediente para comprobar que todo esté completo y comenzar el trámite. Si necesitamos algún dato o documento adicional, nos comunicaremos contigo.
Te mantendremos informado sobre los siguientes pasos.
CAMIKK Holdings`;

    const templateMessage = isEnglish
      ? `Hello, {{contact.first_name}}. We have successfully received the information and documentation for your LLC application.
Our team will review your file to verify that everything is complete and begin the process. If we need any additional information or documents, we will contact you.
We will keep you informed about the next steps.
CAMIKK Holdings`
      : `Hola, {{contact.first_name}}. Hemos recibido correctamente la información y documentación de tu solicitud de LLC.
Nuestro equipo revisará el expediente para comprobar que todo esté completo y comenzar el trámite. Si necesitamos algún dato o documento adicional, nos comunicaremos contigo.
Te mantendremos informado sobre los siguientes pasos.
CAMIKK Holdings`;

    const payload = {
      event: "llc_formulario_completado_whatsapp",
      source: "CAMIKK Holdings - Formulario Documentación Completado",
      date: new Date().toISOString(),

      idioma: isEnglish ? "en" : "es",
      language: isEnglish ? "en" : "es",
      idioma_cliente: isEnglish ? "Inglés" : "Español",

      // Contacto obligatorio para GoHighLevel WhatsApp
      phone: data.phone,
      telephone: data.phone,
      contact_phone: data.phone,
      mobile: data.phone,
      first_name: firstName,
      firstName,
      last_name: lastName,
      lastName,
      name: data.fullName,
      fullName: data.fullName,
      email: data.email,
      contact_email: data.email,

      // Textos del mensaje
      message: whatsappMessage,
      whatsapp_message: whatsappMessage,
      mensaje: whatsappMessage,
      mensaje_whatsapp: whatsappMessage,
      mensaje_con_encabezado: whatsappMessageConEncabezado,
      plantilla_mensaje: templateMessage,

      // Datos de la LLC y expediente
      company_name: data.companyName,
      companyName: data.companyName,
      state: data.state || "",
      submission_number: data.submissionNumber,
      submissionNumber: data.submissionNumber,
      token: data.token,
      dossier_url: dossierUrl,

      // Estado
      status: "Información/Documentación recibida",
      estado_tramite: "Información/Documentación recibida",

      tags: [
        "LLC Cliente",
        "Documentación recibida",
        "WhatsApp Formulario Completado",
        isEnglish ? "Idioma: Inglés" : "Idioma: Español",
        data.state ? `Estado: ${data.state}` : "LLC",
      ],
    };

    return this.postToWebhook(
      payload,
      "Formulario Completado (WhatsApp GHL)",
      this.whatsappWebhookUrl
    );
  }

  /**
   * Envía notificación a través del nuevo webhook de GoHighLevel para mensajes de WhatsApp
   * cuando una LLC se encuentra con estado de "Pago pendiente".
   * Webhook: https://services.leadconnectorhq.com/hooks/aHD8KXbpJBMl7s7fUD6X/webhook-trigger/2bc71d4f-dbaf-49f5-a921-6fb2401c21c6
   */
  async sendPendingPaymentWhatsApp(data: {
    fullName: string;
    phone: string;
    email: string;
    state: string;
    companyName: string;
    totalAmount: number;
    paymentLink: string;
    submissionNumber?: string;
    language?: "es" | "en";
  }): Promise<boolean> {
    const { firstName, lastName } = this.splitName(data.fullName);
    const isEnglish = data.language === "en";
    const clientFirstName = (firstName || (isEnglish ? "Client" : "Cliente")).trim();

    // Mensaje de WhatsApp requerido exactamente por el usuario (en inglés o español)
    const whatsappMessage = isEnglish
      ? `Hello, ${clientFirstName}. We noticed you started the process to form your LLC, but your payment was not completed.

You can resume and continue your application using this link:

${data.paymentLink}

If you experienced any issues or need assistance before continuing, reply to this message and our team will help you.

CAMIKK Holdings`
      : `Hola, ${clientFirstName}. Vimos que comenzaste el proceso para crear tu LLC, pero el pago no llegó a completarse.

Puedes retomarlo y continuar con el trámite desde este enlace:

${data.paymentLink}

Si tuviste algún inconveniente o necesitas ayuda antes de continuar, responde a este mensaje y nuestro equipo te ayudará.

CAMIKK Holdings`;

    const whatsappMessageConEncabezado = isEnglish
      ? `WHATSAPP MESSAGE FOR CLIENT WHEN PAYMENT HAS NOT BEEN COMPLETED:

Hello, ${clientFirstName}. We noticed you started the process to form your LLC, but your payment was not completed.

You can resume and continue your application using this link:

${data.paymentLink}

If you experienced any issues or need assistance before continuing, reply to this message and our team will help you.

CAMIKK Holdings`
      : `MENSAJE WHATSAP CLIENTE CUANDO NO HA COMPLETADO EL PAGO:

Hola, ${clientFirstName}. Vimos que comenzaste el proceso para crear tu LLC, pero el pago no llegó a completarse.

Puedes retomarlo y continuar con el trámite desde este enlace:

${data.paymentLink}

Si tuviste algún inconveniente o necesitas ayuda antes de continuar, responde a este mensaje y nuestro equipo te ayudará.

CAMIKK Holdings`;

    const templateMessage = isEnglish
      ? `Hello, {{contact.first_name}}. We noticed you started the process to form your LLC, but your payment was not completed.

You can resume and continue your application using this link:

{{custom_values.llc_payment_link}}

If you experienced any issues or need assistance before continuing, reply to this message and our team will help you.

CAMIKK Holdings`
      : `Hola, {{contact.first_name}}. Vimos que comenzaste el proceso para crear tu LLC, pero el pago no llegó a completarse.

Puedes retomarlo y continuar con el trámite desde este enlace:

{{custom_values.llc_payment_link}}

Si tuviste algún inconveniente o necesitas ayuda antes de continuar, responde a este mensaje y nuestro equipo te ayudará.

CAMIKK Holdings`;

    const payload = {
      event: "llc_recordatorio_pago_pendiente",
      source: "CAMIKK Holdings - Recordatorio Pago Pendiente WhatsApp",
      date: new Date().toISOString(),

      idioma: isEnglish ? "en" : "es",
      language: isEnglish ? "en" : "es",
      idioma_cliente: isEnglish ? "Inglés" : "Español",

      // Contacto obligatorio para GoHighLevel WhatsApp
      phone: data.phone,
      telephone: data.phone,
      contact_phone: data.phone,
      mobile: data.phone,
      first_name: firstName,
      firstName,
      last_name: lastName,
      lastName,
      name: data.fullName,
      fullName: data.fullName,
      email: data.email,
      contact_email: data.email,

      // Enlace de pago (disponible en custom values / variables)
      llc_payment_link: data.paymentLink,
      payment_link: data.paymentLink,
      enlace_pago: data.paymentLink,
      custom_values: {
        llc_payment_link: data.paymentLink,
      },
      custom_fields: {
        llc_payment_link: data.paymentLink,
      },

      // Mensaje de WhatsApp (tanto en texto procesado como con variables)
      message: whatsappMessage,
      whatsapp_message: whatsappMessage,
      mensaje: whatsappMessage,
      mensaje_whatsapp: whatsappMessage,
      mensaje_con_encabezado: whatsappMessageConEncabezado,
      plantilla_mensaje: templateMessage,

      // Datos de la LLC
      state: data.state,
      estado_seleccionado: data.state,
      company_name: data.companyName,
      companyName: data.companyName,
      total_amount: data.totalAmount,
      totalAmount: data.totalAmount,
      importe_pendiente: data.totalAmount,
      submission_number: data.submissionNumber || "",
      submissionNumber: data.submissionNumber || "",

      // Estados
      status: "Pago pendiente",
      estado_tramite: "Pago pendiente",
      payment_status: "Pago pendiente",
      estado_pago: "Pago pendiente",

      // Tags para GHL
      tags: [
        "LLC Lead",
        "Pago pendiente",
        "Recordatorio WhatsApp",
        `Estado: ${data.state}`,
      ],
    };

    return this.postToWebhook(
      payload,
      "Recordatorio Pago Pendiente (WhatsApp GHL)",
      this.whatsappWebhookUrl
    );
  }

  /**
   * Ejecuta la petición HTTP POST al webhook de LeadConnector / GoHighLevel de manera segura
   */
  private async postToWebhook(
    payload: Record<string, any>,
    context: string,
    targetUrl?: string
  ): Promise<boolean> {
    const url = targetUrl || this.webhookUrl;
    if (!url) {
      console.warn(`⚠️ [GoHighLevel] URL del webhook no configurada (${context}).`);
      return false;
    }

    try {
      console.log(`📡 [GoHighLevel] Enviando evento "${payload.event}" (${context}) para ${payload.email} a ${url}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await res.text();
      if (res.ok) {
        console.log(`✅ [GoHighLevel] Webhook enviado con éxito (${context}). Respuesta: ${responseText.slice(0, 100)}`);
        return true;
      } else {
        console.warn(`⚠️ [GoHighLevel] Webhook devolvió HTTP ${res.status}: ${responseText}`);
        return false;
      }
    } catch (err: any) {
      console.error(`❌ [GoHighLevel] Error al enviar webhook (${context}):`, err.message || err);
      return false;
    }
  }
}

export const ghlService = new GhlService();
