import crypto from "crypto";
import { prisma } from "../db/prisma";
import { s3Service } from "./s3.service";
import { mailService } from "./mail.service";
import { ghlService } from "./ghl.service";
import { ENV } from "../config/env";

export class DossierService {
  /**
   * Obtiene el expediente completo por su token único (con URLs seguras de los documentos de S3)
   */
  async getByToken(token: string) {
    const dossier = await prisma.dossier.findUnique({
      where: { token },
      include: {
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        client: true,
      },
    });

    if (!dossier) {
      return null;
    }

    // Generar URLs de descarga/visualización seguras para cada documento adjuntado en S3
    const docsWithSignedUrls = await Promise.all(
      dossier.documents.map(async (doc) => {
        const downloadUrl = await s3Service.getPresignedDownloadUrl(doc.s3Key);
        return {
          ...doc,
          viewUrl: downloadUrl,
        };
      })
    );

    return {
      ...dossier,
      documents: docsWithSignedUrls,
    };
  }

  /**
   * Obtiene el expediente a través del sessionId de Stripe (permite vincular al token multi-dispositivo inmediatamente)
   * Si la orden aún no está en la BD, la recupera e inicializa dinámicamente.
   */
  async getBySessionId(sessionId: string) {
    const order = await prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: {
        dossier: true,
      },
    });

    if (order?.dossier?.token) {
      return this.getByToken(order.dossier.token);
    }

    // Si no está en BD (ej. webhook pendiente o fallido), intentar resolver directamente desde Stripe
    try {
      const { stripeService } = await import("./stripe.service");
      if (stripeService.stripe) {
        const session = await stripeService.stripe.checkout.sessions.retrieve(sessionId);
        if (session && session.metadata?.token) {
          const existing = await this.getByToken(session.metadata.token);
          if (existing) return existing;
        }

        if (session && (session.metadata?.type === "LLC_FORMATION" || session.metadata?.type === "llc_formation")) {
          const token = await stripeService.handleSuccessfulPayment({
            stripeSessionId: session.id,
            customerEmail: session.customer_email || session.metadata.email || "",
            customerName: session.metadata.fullName || "Cliente CAMIKK",
            customerPhone: session.metadata.phone || "",
            state: session.metadata.state,
            companyName: session.metadata.companyName,
            secondChoiceName: session.metadata.secondChoiceName,
            businessActivity: session.metadata.businessActivity,
            ownersCount: session.metadata.ownersCount,
            totalAmount: parseFloat(session.metadata.totalAmount || session.metadata.totalPaid || "0"),
            stateFee: parseFloat(session.metadata.stateFee || "0"),
          });
          return this.getByToken(token);
        }
      }
    } catch (stripeErr) {
      console.warn("[DossierService] No se pudo recuperar sesión desde Stripe API:", stripeErr);
    }

    return null;
  }

  /**
   * Inicializa un expediente borrador directamente (garantiza token y sincronización en BD)
   */
  async initDraft(payload: any) {
    const token = `cmk_${crypto.randomBytes(24).toString("hex")}`;
    const email = payload.company?.email || payload.members?.[0]?.email || `cliente_${Date.now()}@camikk.temp`;
    const fullName = payload.company?.name ? `${payload.company.name}` : (payload.members?.[0]?.fullName || "Cliente CAMIKK");

    const normalizedEmail = email.toLowerCase().trim();
    const client = await prisma.client.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: {
        fullName,
        email: normalizedEmail,
        phone: payload.company?.phone || "",
      },
    });

    const dossier = await prisma.dossier.create({
      data: {
        token,
        clientId: client.id,
        currentStep: payload.currentStep || 1,
        status: "IN_PROGRESS",
        companyState: payload.company?.state || null,
        companyName: payload.company?.name || null,
        companySecondChoice: payload.company?.secondChoice || null,
        companyThirdChoice: payload.company?.thirdChoice || null,
        companyStartDate: payload.company?.startDate || null,
        companyActivity: payload.company?.activity || null,
        companyDescription: payload.company?.description || null,
        companyAddress: payload.company?.address || null,
        companyCityStateZip: payload.company?.cityStateZip || null,
        companyPhone: payload.company?.phone || null,
        companyEmail: payload.company?.email || null,
        companyWebsite: payload.company?.website || null,
        totalMembers: payload.structure?.totalMembers || 1,
        managementType: payload.structure?.managementType || "Member-Managed",
        signingAuthority: payload.structure?.signingAuthority || null,
        hasNonOwnerManagers: payload.structure?.hasNonOwnerManagers || "No",
        managerNames: payload.structure?.managerNames || null,
        membersData: payload.members || null,
        einResponsiblePartyName: payload.ein?.responsiblePartyName || null,
        einSsnOrItin: payload.ein?.ssnOrItin || null,
        einResponsiblePartyAddress: payload.ein?.responsiblePartyAddress || null,
        einHasEmployeesNext12Months: payload.ein?.hasEmployeesNext12Months || "No",
        einEstimatedEmployeesCount: payload.ein?.estimatedEmployeesCount || null,
        einFirstWageDate: payload.ein?.firstWageDate || null,
        einFiscalYearEndMonth: payload.ein?.fiscalYearEndMonth || "Diciembre",
        einIrsActivity: payload.ein?.irsActivity || null,
        einPreviouslyApplied: payload.ein?.previouslyAppliedEin || "No",
        oaProfitLossDistribution: payload.operatingAgreement?.profitLossDistribution || null,
        oaIsDistributionProportional: payload.operatingAgreement?.isDistributionProportional || "Si",
        oaAgreedDistributionExplanation: payload.operatingAgreement?.agreedDistributionExplanation || null,
        oaDecisionMaking: payload.operatingAgreement?.decisionMaking || "Mayoría",
        oaMemberWithdrawalTerms: payload.operatingAgreement?.memberWithdrawalTerms || null,
        oaSpecialAgreements: payload.operatingAgreement?.specialAgreements || null,
        roConfirmedService: payload.registeredOffice?.confirmedService ?? true,
        roPreferredMailingAddress: payload.registeredOffice?.preferredMailingAddress || null,
        roPrimaryContactPerson: payload.registeredOffice?.primaryContactPerson || null,
      },
      include: { client: true },
    });

    return dossier;
  }

  /**
   * Guarda el borrador del expediente (persistido en PostgreSQL para acceso multi-dispositivo)
   */
  async saveDraft(token: string, payload: any) {
    const existing = await prisma.dossier.findUnique({
      where: { token },
    });

    if (!existing) {
      throw new Error("Expediente no encontrado.");
    }

    const updated = await prisma.dossier.update({
      where: { token },
      data: {
        currentStep: payload.currentStep !== undefined ? payload.currentStep : existing.currentStep,
        // Sección A
        companyState: payload.company?.state ?? existing.companyState,
        companyName: payload.company?.name ?? existing.companyName,
        companySecondChoice: payload.company?.secondChoice ?? existing.companySecondChoice,
        companyThirdChoice: payload.company?.thirdChoice ?? existing.companyThirdChoice,
        companyStartDate: payload.company?.startDate ?? existing.companyStartDate,
        companyActivity: payload.company?.activity ?? existing.companyActivity,
        companyDescription: payload.company?.description ?? existing.companyDescription,
        companyAddress: payload.company?.address ?? existing.companyAddress,
        companyCityStateZip: payload.company?.cityStateZip ?? existing.companyCityStateZip,
        companyPhone: payload.company?.phone ?? existing.companyPhone,
        companyEmail: payload.company?.email ?? existing.companyEmail,
        companyWebsite: payload.company?.website ?? existing.companyWebsite,
        // Sección B
        totalMembers: payload.structure?.totalMembers ?? existing.totalMembers,
        managementType: payload.structure?.managementType ?? existing.managementType,
        signingAuthority: payload.structure?.signingAuthority ?? existing.signingAuthority,
        hasNonOwnerManagers: payload.structure?.hasNonOwnerManagers ?? existing.hasNonOwnerManagers,
        managerNames: payload.structure?.managerNames ?? existing.managerNames,
        // Sección C
        membersData: payload.members ?? existing.membersData,
        // Sección D
        einResponsiblePartyName: payload.ein?.responsiblePartyName ?? existing.einResponsiblePartyName,
        einSsnOrItin: payload.ein?.ssnOrItin ?? existing.einSsnOrItin,
        einResponsiblePartyAddress: payload.ein?.responsiblePartyAddress ?? existing.einResponsiblePartyAddress,
        einHasEmployeesNext12Months: payload.ein?.hasEmployeesNext12Months ?? existing.einHasEmployeesNext12Months,
        einEstimatedEmployeesCount: payload.ein?.estimatedEmployeesCount ?? existing.einEstimatedEmployeesCount,
        einFirstWageDate: payload.ein?.firstWageDate ?? existing.einFirstWageDate,
        einFiscalYearEndMonth: payload.ein?.fiscalYearEndMonth ?? existing.einFiscalYearEndMonth,
        einIrsActivity: payload.ein?.irsActivity ?? existing.einIrsActivity,
        einPreviouslyApplied: payload.ein?.previouslyAppliedEin ?? existing.einPreviouslyApplied,
        // Sección E
        oaProfitLossDistribution: payload.operatingAgreement?.profitLossDistribution ?? existing.oaProfitLossDistribution,
        oaIsDistributionProportional: payload.operatingAgreement?.isDistributionProportional ?? existing.oaIsDistributionProportional,
        oaAgreedDistributionExplanation: payload.operatingAgreement?.agreedDistributionExplanation ?? existing.oaAgreedDistributionExplanation,
        oaDecisionMaking: payload.operatingAgreement?.decisionMaking ?? existing.oaDecisionMaking,
        oaMemberWithdrawalTerms: payload.operatingAgreement?.memberWithdrawalTerms ?? existing.oaMemberWithdrawalTerms,
        oaSpecialAgreements: payload.operatingAgreement?.specialAgreements ?? existing.oaSpecialAgreements,
        // Sección F
        roConfirmedService: payload.registeredOffice?.confirmedService ?? existing.roConfirmedService,
        roPreferredMailingAddress: payload.registeredOffice?.preferredMailingAddress ?? existing.roPreferredMailingAddress,
        roPrimaryContactPerson: payload.registeredOffice?.primaryContactPerson ?? existing.roPrimaryContactPerson,
        // Sección H
        certAccurate: payload.certifications?.accurate ?? existing.certAccurate,
        certAuthorized: payload.certifications?.authorized ?? existing.certAuthorized,
        certGovernmentNotice: payload.certifications?.governmentContactNotice ?? existing.certGovernmentNotice,
        certDelaysNotice: payload.certifications?.delaysNotice ?? existing.certDelaysNotice,
        electronicSignature: payload.certifications?.signature ?? existing.electronicSignature,
        signedDate: payload.certifications?.date ?? existing.signedDate,
      },
    });

    return updated;
  }

  /**
   * Sube un archivo a Amazon S3 y lo registra en PostgreSQL enlazado al expediente
   */
  async uploadDocument(params: {
    token: string;
    documentType: string;
    originalName: string;
    buffer: Buffer;
    mimeType: string;
    sizeBytes: number;
  }) {
    const { token, documentType, originalName, buffer, mimeType, sizeBytes } = params;

    const dossier = await prisma.dossier.findUnique({
      where: { token },
    });

    if (!dossier) {
      throw new Error("Expediente no encontrado.");
    }

    // Sanitizar nombre de archivo y armar key única para S3 dentro de la carpeta "documentos llc"
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const companyFolder = dossier.companyName
      ? `${dossier.companyName.replace(/[^a-zA-Z0-9._-]/g, "_")}_${dossier.id}`
      : dossier.id;
    const s3Key = `documentos llc/${companyFolder}/${documentType}_${Date.now()}_${sanitizedName}`;

    // Subir a AWS S3
    const { url: s3Url } = await s3Service.uploadBuffer(buffer, s3Key, mimeType);

    // Guardar registro en la BD
    const doc = await prisma.dossierDocument.create({
      data: {
        dossierId: dossier.id,
        documentType,
        originalName,
        s3Key,
        s3Url,
        mimeType,
        sizeBytes,
      },
    });

    // URL firmada para ver el documento
    const viewUrl = await s3Service.getPresignedDownloadUrl(s3Key);

    return {
      ...doc,
      viewUrl,
    };
  }

  /**
   * Elimina un documento de S3 y de la BD
   */
  async removeDocument(token: string, documentId: string) {
    const dossier = await prisma.dossier.findUnique({
      where: { token },
      include: { documents: true },
    });

    if (!dossier) throw new Error("Expediente no encontrado.");

    const doc = dossier.documents.find((d) => d.id === documentId);
    if (!doc) throw new Error("Documento no encontrado.");

    // Eliminar de S3
    await s3Service.deleteFile(doc.s3Key);

    // Eliminar de PostgreSQL
    await prisma.dossierDocument.delete({
      where: { id: documentId },
    });

    return { success: true };
  }

  /**
   * Radicación definitiva del expediente (Firma electrónica y envío)
   */
  async submitFinal(token: string, payload: any) {
    const dossier = await prisma.dossier.findUnique({
      where: { token },
      include: { client: true, order: true },
    });

    if (!dossier) {
      throw new Error("Expediente no encontrado.");
    }

    if (
      !payload.certifications?.accurate ||
      !payload.certifications?.authorized ||
      !payload.certifications?.signature?.trim()
    ) {
      throw new Error("Debe aceptar todas las certificaciones obligatorias y estampar su firma electrónica.");
    }

    // Guardar primero el estado
    await this.saveDraft(token, payload);

    // Conservar o generar número de expediente oficial secuencial
    const submissionNumber =
      dossier.submissionNumber || (await getNextSubmissionNumber());

    const submitted = await prisma.dossier.update({
      where: { token },
      data: {
        status: "Información/Documentación recibida",
        submissionNumber,
        submittedAt: new Date(),
        electronicSignature: payload.certifications.signature,
        signedDate: payload.certifications.date || new Date().toISOString().split("T")[0],
        certAccurate: true,
        certAuthorized: true,
        certGovernmentNotice: true,
        certDelaysNotice: true,
      },
    });

    const clientEmail = (dossier.client?.email || dossier.companyEmail || "").trim();
    const clientName = dossier.client?.fullName || dossier.signingAuthority || "Cliente";
    const clientPhone = dossier.client?.phone || dossier.companyPhone || "";
    const state = dossier.companyState || dossier.order?.state || "No especificado";

    const orderMeta = (dossier.order?.metadata as any) || {};
    const siteUrl = (orderMeta.siteUrl || ENV.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const dossierUrl = `${siteUrl}/dossier?token=${token}`;
    const clientLanguage: "es" | "en" =
      payload?.language === "en" || orderMeta?.language === "en" ? "en" : "es";

    // 1. Enviar confirmación por correo electrónico al cliente (Inglés o Español)
    if (clientEmail) {
      mailService
        .sendSubmissionConfirmationEmail({
          toEmail: clientEmail,
          clientName,
          companyName: dossier.companyName || "Tu LLC",
          submissionId: submissionNumber,
          language: clientLanguage,
        })
        .catch((err) => {
          console.error("Error enviando correo de confirmación al cliente:", err);
        });
    }

    // 2. Enviar notificación al equipo administrativo (c.martinez@coraltechnology.online)
    mailService
      .sendDossierSubmittedAdminEmail({
        clientName,
        clientEmail,
        clientPhone,
        state,
        applicationId: submissionNumber,
        dossierUrl,
        language: clientLanguage,
      })
      .catch((err) => {
        console.error("Error enviando correo de nuevo expediente al equipo administrativo:", err);
      });

    // 3. Enviar mensaje de WhatsApp a través del webhook de GHL (Inglés o Español)
    if (clientPhone) {
      ghlService
        .sendDossierSubmittedWhatsApp({
          fullName: clientName,
          phone: clientPhone,
          email: clientEmail,
          companyName: dossier.companyName || "Tu LLC",
          state,
          submissionNumber,
          token,
          language: clientLanguage,
          siteUrl,
        })
        .catch((err) => {
          console.error("Error enviando webhook WhatsApp a GoHighLevel tras radicar expediente:", err);
        });
    }

    // 4. Notificar al webhook principal de GoHighLevel
    const autoRenewRegisteredOffice =
      orderMeta.autoRenewRegisteredOffice === true ||
      orderMeta.autoRenewRegisteredOffice === "true";

    ghlService
      .sendDossierSubmitted({
        fullName: clientName,
        email: clientEmail,
        phone: clientPhone || undefined,
        companyName: dossier.companyName || "Tu LLC",
        state,
        submissionNumber,
        token,
        autoRenewRegisteredOffice,
        language: clientLanguage,
        siteUrl,
      })
      .catch((ghlErr) => {
        console.error("Error enviando actualización a GoHighLevel tras radicar expediente:", ghlErr);
      });

    return {
      success: true,
      submissionNumber,
      submittedAt: submitted.submittedAt,
    };
  }
}

/**
 * Genera el siguiente número de expediente secuencial con formato: CMK-LLC-YYYY-000001
 * Si faltan números intermedios o se eliminó alguno, detecta el número más alto y continúa
 * de forma ascendente sin fallar.
 */
export async function getNextSubmissionNumber(year: number = new Date().getFullYear()): Promise<string> {
  const prefix = `CMK-LLC-${year}-`;

  try {
    const dossiers = await prisma.dossier.findMany({
      where: {
        submissionNumber: {
          startsWith: prefix,
        },
      },
      select: {
        submissionNumber: true,
      },
    });

    let maxSeq = 0;
    const regex = new RegExp(`^CMK-LLC-${year}-(\\d+)$`);

    for (const d of dossiers) {
      if (!d.submissionNumber) continue;
      const match = d.submissionNumber.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(6, "0");
    return `${prefix}${padded}`;
  } catch (err) {
    console.error("Error al calcular getNextSubmissionNumber:", err);
    return `${prefix}000001`;
  }
}

export const dossierService = new DossierService();

