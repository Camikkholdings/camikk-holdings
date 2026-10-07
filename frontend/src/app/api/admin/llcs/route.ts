import { NextResponse } from "next/server";
import { adminDataStore, type AdminDossier, normalizeDossierStatus } from "@/lib/adminData";

export async function GET() {
  try {
    try {
      const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${backendUrl}/api/admin/llcs`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Mapeamos desde Prisma / PostgreSQL
          const mapped: AdminDossier[] = data.map((d: any) => ({
            id: d.id,
            token: d.token,
            submissionNumber: d.submissionNumber || `CMK-LLC-${d.id.substring(0, 6).toUpperCase()}`,
            status: normalizeDossierStatus(d.status),
            currentStep: d.currentStep || 1,
            createdAt: d.createdAt,
            submittedAt: d.submittedAt,
            totalAmount: Number(d.order?.totalAmount) || 850,
            autoRenewRegisteredOffice:
              d.order?.metadata?.autoRenewRegisteredOffice === true ||
              d.order?.metadata?.autoRenewRegisteredOffice === "true" ||
              Boolean(d.order?.metadata?.stripeSubscriptionId),
            client: {
              fullName: d.client?.fullName || "Cliente",
              email: d.client?.email || "",
              phone: d.client?.phone || "",
            },
            company: {
              state: d.companyState || "Delaware",
              name: d.companyName || "Compañía LLC",
              secondChoice: d.companySecondChoice,
              thirdChoice: d.companyThirdChoice,
              startDate: d.companyStartDate,
              activity: d.companyActivity || "",
              description: d.companyDescription || "",
              address: d.companyAddress || "101 Hamilton St. Suite 351",
              cityStateZip: d.companyCityStateZip || "Allentown, PA 18101",
              phone: d.companyPhone,
              email: d.companyEmail,
              website: d.companyWebsite,
            },
            structure: {
              totalMembers: d.totalMembers || 1,
              managementType: (d.managementType as any) || "Member-Managed",
              signingAuthority: d.signingAuthority || d.client?.fullName || "",
              hasNonOwnerManagers: (d.hasNonOwnerManagers as any) || "No",
              managerNames: d.managerNames,
            },
            members: Array.isArray(d.membersData)
              ? d.membersData
              : [
                  {
                    id: "m-def",
                    fullName: d.client?.fullName || "Propietario",
                    address: d.companyAddress || "",
                    cityStateZip: d.companyCityStateZip || "",
                    email: d.client?.email || "",
                    phone: d.client?.phone || "",
                    ownershipPercentage: 100,
                    title: "Managing Member",
                  },
                ],
            ein: {
              responsiblePartyName: d.einResponsiblePartyName || d.client?.fullName || "",
              ssnOrItin: d.einSsnOrItin || "No aplica",
              responsiblePartyAddress: d.einResponsiblePartyAddress || "",
              hasEmployeesNext12Months: (d.einHasEmployeesNext12Months as any) || "No",
              estimatedEmployeesCount: d.einEstimatedEmployeesCount,
              firstWageDate: d.einFirstWageDate,
              fiscalYearEndMonth: d.einFiscalYearEndMonth || "Diciembre",
              irsActivity: d.einIrsActivity || d.companyActivity || "",
              previouslyApplied: (d.einPreviouslyApplied as any) || "No",
            },
            operatingAgreement: {
              profitLossDistribution: d.oaProfitLossDistribution || "Proporcional a los aportes de capital.",
              isDistributionProportional: (d.oaIsDistributionProportional as any) || "Si",
              agreedDistributionExplanation: d.oaAgreedDistributionExplanation,
              decisionMaking: (d.oaDecisionMaking as any) || "Mayoría",
              memberWithdrawalTerms: d.oaMemberWithdrawalTerms,
              specialAgreements: d.oaSpecialAgreements,
            },
            registeredOffice: {
              confirmedService: d.roConfirmedService ?? true,
              preferredMailingAddress: d.roPreferredMailingAddress || "101 Hamilton St. Suite 351, Allentown, PA 18101",
              primaryContactPerson: d.roPrimaryContactPerson || d.client?.fullName,
            },
            documents: Array.isArray(d.documents)
              ? d.documents.map((doc: any) => {
                  const backendBase = (
                    process.env.BACKEND_URL ||
                    process.env.NEXT_PUBLIC_API_URL ||
                    "http://localhost:4000"
                  ).replace(/\/$/, "");
                  const fallbackViewUrl = doc.id
                    ? `${backendBase}/api/documents/view/${doc.id}`
                    : (doc.s3Url || "");
                  const finalUrl = doc.viewUrl || fallbackViewUrl;
                  return {
                    id: doc.id,
                    type: doc.documentType,
                    originalName: doc.originalName,
                    url: finalUrl,
                    viewUrl: finalUrl,
                    sizeBytes: doc.sizeBytes,
                  };
                })
              : [],
            certifications: {
              accurate: d.certAccurate ?? true,
              authorized: d.certAuthorized ?? true,
              governmentNotice: d.certGovernmentNotice ?? true,
              delaysNotice: d.certDelaysNotice ?? true,
              electronicSignature: d.electronicSignature || d.client?.fullName || "",
              signedDate: d.signedDate || d.submittedAt || "",
            },
          }));
          return NextResponse.json(mapped);
        }
      }
    } catch {
      // Backend offline
    }

    return NextResponse.json(adminDataStore.getDossiers());
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener expedientes" },
      { status: 500 }
    );
  }
}
