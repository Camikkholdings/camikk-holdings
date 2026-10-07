"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Info,
  LoaderCircle,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { STATE_FEES, type StateName } from "@/data/stateFees";
import { BRAND } from "@/data/brand";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type S3Document = {
  id: string;
  documentType: string;
  originalName: string;
  s3Key: string;
  s3Url: string;
  viewUrl?: string;
  sizeBytes?: number;
  uploadedAt?: string;
};

export type MemberData = {
  id: string;
  fullName: string;
  address: string;
  cityStateZip: string;
  email: string;
  phone: string;
  ownershipPercentage: number;
  initialCapital?: string;
  roleOrTitle?: string;
};

export type DossierFormState = {
  // A. Compañía
  company: {
    state: StateName | "";
    name: string;
    secondChoice: string;
    thirdChoice: string;
    startDate: string;
    activity: string;
    description: string;
    address: string;
    cityStateZip: string;
    phone: string;
    email: string;
    website: string;
  };
  // B. Estructura
  structure: {
    totalMembers: number;
    managementType: "Member-Managed" | "Manager-Managed";
    signingAuthority: string;
    hasNonOwnerManagers: "No" | "Si";
    managerNames: string;
  };
  // C. Miembros
  members: MemberData[];
  // D. EIN / IRS
  ein: {
    responsiblePartyName: string;
    ssnOrItin: string;
    responsiblePartyAddress: string;
    hasEmployeesNext12Months: "No" | "Si";
    estimatedEmployeesCount?: string;
    firstWageDate?: string;
    fiscalYearEndMonth: string;
    irsActivity: string;
    previouslyAppliedEin: "No" | "Si";
  };
  // E. Operating Agreement
  operatingAgreement: {
    profitLossDistribution: string;
    isDistributionProportional: "Si" | "No";
    agreedDistributionExplanation?: string;
    decisionMaking: "Mayoría" | "Unanimidad" | "Otro";
    memberWithdrawalTerms: string;
    specialAgreements: string;
  };
  // F. Registered Office
  registeredOffice: {
    confirmedService: boolean;
    preferredMailingAddress: string;
    primaryContactPerson: string;
  };
  // G. Documentos
  documents: {
    responsiblePartyIdName?: string;
    additionalMembersIdName?: string;
    relatedEntityDocsName?: string;
    additionalDocsName?: string;
  };
  // H. Certificaciones
  certifications: {
    accurate: boolean;
    authorized: boolean;
    governmentContactNotice: boolean;
    delaysNotice: boolean;
    signature: string;
    date: string;
  };
};

const initialDossierState: DossierFormState = {
  company: {
    state: "",
    name: "",
    secondChoice: "",
    thirdChoice: "",
    startDate: "",
    activity: "",
    description: "",
    address: "",
    cityStateZip: "",
    phone: "",
    email: "",
    website: "",
  },
  structure: {
    totalMembers: 1,
    managementType: "Member-Managed",
    signingAuthority: "",
    hasNonOwnerManagers: "No",
    managerNames: "",
  },
  members: [
    {
      id: "member-1",
      fullName: "",
      address: "",
      cityStateZip: "",
      email: "",
      phone: "",
      ownershipPercentage: 100,
      initialCapital: "",
      roleOrTitle: "Member / Dueño Principal",
    },
  ],
  ein: {
    responsiblePartyName: "",
    ssnOrItin: "",
    responsiblePartyAddress: "",
    hasEmployeesNext12Months: "No",
    estimatedEmployeesCount: "",
    firstWageDate: "",
    fiscalYearEndMonth: "Diciembre",
    irsActivity: "",
    previouslyAppliedEin: "No",
  },
  operatingAgreement: {
    profitLossDistribution: "Proporcional al porcentaje de participación",
    isDistributionProportional: "Si",
    agreedDistributionExplanation: "",
    decisionMaking: "Mayoría",
    memberWithdrawalTerms: "Derecho de tanteo para los miembros existentes antes de vender a terceros.",
    specialAgreements: "",
  },
  registeredOffice: {
    confirmedService: true,
    preferredMailingAddress: "",
    primaryContactPerson: "",
  },
  documents: {},
  certifications: {
    accurate: false,
    authorized: false,
    governmentContactNotice: false,
    delaysNotice: false,
    signature: "",
    date: new Date().toISOString().split("T")[0],
  },
};

function getInitialDossier(): DossierFormState {
  if (typeof window === "undefined") return initialDossierState;

  const params = new URLSearchParams(window.location.search);
  const savedDraft = window.localStorage.getItem("camikk_dossier_draft");
  let stateToUse = initialDossierState;
  if (savedDraft) {
    try {
      stateToUse = { ...initialDossierState, ...JSON.parse(savedDraft) };
    } catch (e) {
      console.error("Error parsing saved draft:", e);
    }
  }

  const urlState = params.get("state") as StateName | null;
  const urlCompany = params.get("company");
  const urlEmail = params.get("email");
  const urlName = params.get("name");
  const urlPhone = params.get("phone");
  const urlActivity = params.get("activity");
  const urlSecond = params.get("second_choice");
  const urlOwners = params.get("owners");

  const updated = { ...stateToUse };

  if (urlState && urlState in STATE_FEES) updated.company.state = urlState;
  if (urlCompany) updated.company.name = urlCompany;
  if (urlSecond) updated.company.secondChoice = urlSecond;
  if (urlActivity) {
    updated.company.activity = urlActivity;
    updated.ein.irsActivity = urlActivity;
  }
  if (urlEmail) {
    updated.company.email = urlEmail;
    if (updated.members[0]) updated.members[0].email = urlEmail;
  }
  if (urlName) {
    if (updated.members[0]) updated.members[0].fullName = urlName;
    updated.ein.responsiblePartyName = urlName;
    updated.structure.signingAuthority = urlName;
    updated.registeredOffice.primaryContactPerson = urlName;
  }
  if (urlPhone) {
    updated.company.phone = urlPhone;
    if (updated.members[0]) updated.members[0].phone = urlPhone;
  }
  if (urlOwners) {
    const count = urlOwners === "3+" ? 3 : Number.parseInt(urlOwners) || 1;
    updated.structure.totalMembers = count;
    if (count > updated.members.length) {
      const extraMembers: MemberData[] = [];
      const percent = Math.floor(100 / count);
      for (let i = updated.members.length; i < count; i++) {
        extraMembers.push({
          id: `member-${i + 1}`,
          fullName: "",
          address: "",
          cityStateZip: "",
          email: "",
          phone: "",
          ownershipPercentage: percent,
          initialCapital: "",
          roleOrTitle: `Member / Co-propietario ${i + 1}`,
        });
      }
      updated.members = [...updated.members, ...extraMembers];
    }
  }

  return updated;
}

export function PostPaymentDossier() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DossierFormState>(getInitialDossier);
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadedFromServer, setIsLoadedFromServer] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [dossierToken, setDossierToken] = useState<string | null>(null);
  const [uploadedS3Docs, setUploadedS3Docs] = useState<S3Document[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Función para poblar el formulario desde el expediente persistido en backend
  const hydrateFromDossier = (dossier: any) => {
    startTransition(() => {
      setFormData((prev) => ({
        ...prev,
        company: {
          ...prev.company,
          state: dossier.companyState || prev.company.state,
          name: dossier.companyName || prev.company.name,
          secondChoice: dossier.companySecondChoice || prev.company.secondChoice,
          thirdChoice: dossier.companyThirdChoice || prev.company.thirdChoice,
          startDate: dossier.companyStartDate || prev.company.startDate,
          activity: dossier.companyActivity || prev.company.activity,
          description: dossier.companyDescription || prev.company.description,
          address: dossier.companyAddress || prev.company.address,
          cityStateZip: dossier.companyCityStateZip || prev.company.cityStateZip,
          phone: dossier.companyPhone || prev.company.phone,
          email: dossier.companyEmail || prev.company.email,
          website: dossier.companyWebsite || prev.company.website,
        },
        structure: {
          ...prev.structure,
          totalMembers: dossier.totalMembers || prev.structure.totalMembers,
          managementType: dossier.managementType || prev.structure.managementType,
          signingAuthority: dossier.signingAuthority || prev.structure.signingAuthority,
          hasNonOwnerManagers: dossier.hasNonOwnerManagers || prev.structure.hasNonOwnerManagers,
          managerNames: dossier.managerNames || prev.structure.managerNames,
        },
        members:
          dossier.membersData && Array.isArray(dossier.membersData) && dossier.membersData.length > 0
            ? dossier.membersData
            : prev.members,
        ein: {
          ...prev.ein,
          responsiblePartyName: dossier.einResponsiblePartyName || prev.ein.responsiblePartyName,
          ssnOrItin: dossier.einSsnOrItin || prev.ein.ssnOrItin,
          responsiblePartyAddress:
            dossier.einResponsiblePartyAddress || prev.ein.responsiblePartyAddress,
          hasEmployeesNext12Months:
            dossier.einHasEmployeesNext12Months || prev.ein.hasEmployeesNext12Months,
          estimatedEmployeesCount:
            dossier.einEstimatedEmployeesCount || prev.ein.estimatedEmployeesCount,
          firstWageDate: dossier.einFirstWageDate || prev.ein.firstWageDate,
          fiscalYearEndMonth: dossier.einFiscalYearEndMonth || prev.ein.fiscalYearEndMonth,
          irsActivity: dossier.einIrsActivity || prev.ein.irsActivity,
          previouslyAppliedEin: dossier.einPreviouslyApplied || prev.ein.previouslyAppliedEin,
        },
        operatingAgreement: {
          ...prev.operatingAgreement,
          profitLossDistribution:
            dossier.oaProfitLossDistribution || prev.operatingAgreement.profitLossDistribution,
          isDistributionProportional:
            dossier.oaIsDistributionProportional || prev.operatingAgreement.isDistributionProportional,
          agreedDistributionExplanation:
            dossier.oaAgreedDistributionExplanation ||
            prev.operatingAgreement.agreedDistributionExplanation,
          decisionMaking: dossier.oaDecisionMaking || prev.operatingAgreement.decisionMaking,
          memberWithdrawalTerms:
            dossier.oaMemberWithdrawalTerms || prev.operatingAgreement.memberWithdrawalTerms,
          specialAgreements:
            dossier.oaSpecialAgreements || prev.operatingAgreement.specialAgreements,
        },
        registeredOffice: {
          ...prev.registeredOffice,
          confirmedService: dossier.roConfirmedService ?? prev.registeredOffice.confirmedService,
          preferredMailingAddress:
            dossier.roPreferredMailingAddress || prev.registeredOffice.preferredMailingAddress,
          primaryContactPerson:
            dossier.roPrimaryContactPerson || prev.registeredOffice.primaryContactPerson,
        },
      }));

      if (dossier.currentStep) {
        setCurrentStep(dossier.currentStep);
      }
      if (dossier.documents && Array.isArray(dossier.documents)) {
        setUploadedS3Docs(dossier.documents);
      }
      setIsLoadedFromServer(true);
    });
  };

  // Sincronizar token multi-dispositivo y sesión de Stripe al montar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const sessionId = params.get("session_id");

    if (token) {
      setDossierToken(token);
      // Cargar expediente persistido desde PostgreSQL / Backend
      fetch(`${API_BASE}/api/dossiers/${token}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((dossier) => {
          if (dossier) {
            hydrateFromDossier(dossier);
          } else {
            setIsLoadedFromServer(true);
          }
        })
        .catch((err) => {
          console.error("Error al cargar expediente por token:", err);
          setIsLoadedFromServer(true);
        });
    } else if (sessionId) {
      // Intentar obtener el expediente creado en PostgreSQL mediante sessionId de Stripe
      fetch(`${API_BASE}/api/dossiers/by-session/${encodeURIComponent(sessionId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(async (dossier) => {
          if (dossier && dossier.token) {
            setDossierToken(dossier.token);
            // Actualizar URL sin recargar para que sea compartible y guardable en cualquier dispositivo
            if (typeof window !== "undefined") {
              const newUrl = `${window.location.pathname}?token=${dossier.token}`;
              window.history.replaceState({}, "", newUrl);
            }
            hydrateFromDossier(dossier);
          } else {
            // Fallback a metadata de sesión de Stripe y crear expediente en BD
            try {
              const sRes = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
              const session = sRes.ok ? await sRes.json() : null;
              let initPayload = { ...formData, currentStep };
              if (session?.metadata) {
                const sMeta = session.metadata;
                initPayload = {
                  ...initPayload,
                  company: {
                    ...initPayload.company,
                    state: sMeta.state || initPayload.company.state,
                    name: sMeta.companyName || initPayload.company.name,
                    secondChoice: sMeta.secondChoiceName || initPayload.company.secondChoice,
                    activity: sMeta.businessActivity || initPayload.company.activity,
                    email: session.customer_email || sMeta.email || initPayload.company.email,
                  },
                  ein: {
                    ...initPayload.ein,
                    responsiblePartyName: sMeta.fullName || initPayload.ein.responsiblePartyName,
                    irsActivity: sMeta.businessActivity || initPayload.ein.irsActivity,
                  },
                };
                startTransition(() => {
                  setFormData(initPayload);
                });
              }

              const initRes = await fetch(`${API_BASE}/api/dossiers/init`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(initPayload),
              });
              const initData = await initRes.json();
              if (initData?.token) {
                setDossierToken(initData.token);
                if (typeof window !== "undefined") {
                  const newUrl = `${window.location.pathname}?token=${initData.token}`;
                  window.history.replaceState({}, "", newUrl);
                }
              }
            } catch (fallbackErr) {
              console.error("Error en fallback de sesión Stripe:", fallbackErr);
            } finally {
              setIsLoadedFromServer(true);
            }
          }
        })
        .catch(() => setIsLoadedFromServer(true));
    } else {
      // Sin token ni sessionId en URL: verificar si hay respaldo local o inicializar borrador en BD
      const localDraft = typeof window !== "undefined" ? window.localStorage.getItem("camikk_dossier_draft") : null;
      let initialPayload = formData;
      if (localDraft) {
        try {
          const parsed = JSON.parse(localDraft);
          if (parsed && typeof parsed === "object") {
            initialPayload = { ...formData, ...parsed };
            startTransition(() => {
              setFormData(initialPayload);
            });
          }
        } catch {
          // ignore
        }
      }

      fetch(`${API_BASE}/api/dossiers/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...initialPayload, currentStep }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.token) {
            setDossierToken(data.token);
            if (typeof window !== "undefined") {
              const newUrl = `${window.location.pathname}?token=${data.token}`;
              window.history.replaceState({}, "", newUrl);
            }
          }
          setIsLoadedFromServer(true);
        })
        .catch(() => setIsLoadedFromServer(true));
    }
  }, []);

  // Auto-guardado temporal continuo en segundo plano en PostgreSQL para persistencia multi-dispositivo (debounce 800ms)
  useEffect(() => {
    if (!isLoadedFromServer) return;

    const timer = setTimeout(async () => {
      try {
        setIsSavingDraft(true);
        // Guardar respaldo local
        if (typeof window !== "undefined") {
          window.localStorage.setItem("camikk_dossier_draft", JSON.stringify(formData));
        }

        let activeToken = dossierToken;
        if (!activeToken) {
          const initRes = await fetch(`${API_BASE}/api/dossiers/init`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, currentStep }),
          });
          const initData = await initRes.json();
          if (initData?.token) {
            activeToken = initData.token;
            setDossierToken(activeToken);
            if (typeof window !== "undefined") {
              const newUrl = `${window.location.pathname}?token=${activeToken}`;
              window.history.replaceState({}, "", newUrl);
            }
          }
        }

        if (activeToken) {
          // Guardar en PostgreSQL para sincronización multi-dispositivo inmediata
          const res = await fetch(`${API_BASE}/api/dossiers/${activeToken}/draft`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, currentStep }),
          });

          if (res.ok) {
            const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            setSavedTime(now);
          }
        }
      } catch (err) {
        console.error("Error en auto-guardado multi-dispositivo:", err);
      } finally {
        setIsSavingDraft(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData, currentStep, dossierToken, isLoadedFromServer]);

  // Copiar enlace para abrir en otro dispositivo (celular, tablet, otra PC)
  const handleCopyDeviceLink = () => {
    if (typeof window === "undefined") return;
    const urlToCopy = dossierToken
      ? `${window.location.origin}/dossier?token=${dossierToken}`
      : window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(urlToCopy).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      });
    }
  };

  // Subida de archivos físicos a Amazon S3
  const handleFileUpload = async (file: File, documentType: string, stateKey: keyof DossierFormState["documents"]) => {
    setUploadingDocType(documentType);
    try {
      const token = dossierToken || "draft_local";
      const body = new FormData();
      body.append("file", file);
      body.append("documentType", documentType);

      const res = await fetch(`${API_BASE}/api/documents/${token}/upload`, {
        method: "POST",
        body,
      });

      if (res.ok) {
        const docData: S3Document = await res.json();
        setUploadedS3Docs((prev) => [...prev.filter((d) => d.documentType !== documentType), docData]);
        setFormData((prev) => ({
          ...prev,
          documents: { ...prev.documents, [stateKey]: file.name },
        }));
      } else {
        // Fallback local
        setFormData((prev) => ({
          ...prev,
          documents: { ...prev.documents, [stateKey]: file.name },
        }));
      }
    } catch {
      setFormData((prev) => ({
        ...prev,
        documents: { ...prev.documents, [stateKey]: file.name },
      }));
    } finally {
      setUploadingDocType(null);
    }
  };

  // Eliminación de archivo de S3
  const handleDeleteFile = async (documentId: string, stateKey: keyof DossierFormState["documents"]) => {
    try {
      const token = dossierToken || "draft_local";
      await fetch(`${API_BASE}/api/documents/${token}/${documentId}`, {
        method: "DELETE",
      });
      setUploadedS3Docs((prev) => prev.filter((d) => d.id !== documentId));
      setFormData((prev) => ({
        ...prev,
        documents: { ...prev.documents, [stateKey]: undefined },
      }));
    } catch (err) {
      console.error("Error al eliminar documento:", err);
    }
  };

  // Guardado manual o automático
  const handleSaveProgress = async () => {
    try {
      setIsSavingDraft(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("camikk_dossier_draft", JSON.stringify(formData));
      }
      let activeToken = dossierToken;
      if (!activeToken) {
        const initRes = await fetch(`${API_BASE}/api/dossiers/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, currentStep }),
        });
        const initData = await initRes.json();
        if (initData?.token) {
          activeToken = initData.token;
          setDossierToken(activeToken);
          if (typeof window !== "undefined") {
            const newUrl = `${window.location.pathname}?token=${activeToken}`;
            window.history.replaceState({}, "", newUrl);
          }
        }
      }

      if (activeToken) {
        await fetch(`${API_BASE}/api/dossiers/${activeToken}/draft`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, currentStep }),
        });
      }
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setSavedTime(now);
    } catch (err) {
      console.error("Save error:", err);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setSavedTime(`${now}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Validaciones antes de avanzar de paso
  const validateCurrentStep = (step: number): boolean => {
    setStepError(null);
    if (step === 1) {
      if (!formData.company.state) {
        setStepError("Por favor selecciona el estado de registro.");
        return false;
      }
      if (!formData.company.name.trim()) {
        setStepError("El nombre aprobado o solicitado de la LLC es obligatorio.");
        return false;
      }
      if (!formData.company.activity.trim()) {
        setStepError("La actividad principal del negocio es obligatoria.");
        return false;
      }
      if (!formData.company.description.trim()) {
        setStepError("La descripción detallada de productos o servicios es obligatoria.");
        return false;
      }
      if (!formData.company.address.trim() || !formData.company.cityStateZip.trim()) {
        setStepError("La dirección principal del negocio y ciudad/estado/ZIP son obligatorios.");
        return false;
      }
    } else if (step === 2) {
      if (!formData.structure.signingAuthority.trim()) {
        setStepError("Debes especificar quién tendrá autoridad para firmar en nombre de la LLC.");
        return false;
      }
      for (let i = 0; i < formData.members.length; i++) {
        const m = formData.members[i];
        if (!m.fullName.trim() || !m.address.trim() || !m.email.trim() || !m.phone.trim()) {
          setStepError(`Por favor completa los datos obligatorios del Miembro ${i + 1}.`);
          return false;
        }
      }
      const totalPercent = formData.members.reduce((acc, m) => acc + (Number(m.ownershipPercentage) || 0), 0);
      if (totalPercent !== 100) {
        setStepError(`La suma de los porcentajes de propiedad debe ser exactamente 100%. Actualmente suma ${totalPercent}%.`);
        return false;
      }
    } else if (step === 3) {
      if (!formData.ein.responsiblePartyName.trim() || !formData.ein.ssnOrItin.trim() || !formData.ein.responsiblePartyAddress.trim()) {
        setStepError("Por favor completa los datos obligatorios del Responsible Party (Nombre, SSN/ITIN y Dirección).");
        return false;
      }
      if (!formData.ein.irsActivity.trim()) {
        setStepError("La actividad principal para fines del IRS es obligatoria.");
        return false;
      }
    } else if (step === 4) {
      if (!formData.operatingAgreement.profitLossDistribution.trim()) {
        setStepError("Indica cómo se distribuirán las ganancias y pérdidas.");
        return false;
      }
    } else if (step === 5) {
      if (!formData.registeredOffice.confirmedService) {
        setStepError("Debes confirmar el uso del servicio de Registered Office de CAMIKK Holdings.");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep(currentStep)) {
      handleSaveProgress();
      setCurrentStep((prev) => Math.min(prev + 1, 6));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setStepError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError(null);

    if (
      !formData.certifications.accurate ||
      !formData.certifications.authorized ||
      !formData.certifications.governmentContactNotice ||
      !formData.certifications.delaysNotice
    ) {
      setStepError("Debes marcar todas las certificaciones legales obligatorias para continuar.");
      return;
    }

    if (!formData.certifications.signature.trim()) {
      setStepError("Por favor escribe tu firma electrónica legal.");
      return;
    }

    try {
      setIsSubmitting(true);
      let activeToken = dossierToken;
      if (!activeToken) {
        const initRes = await fetch(`${API_BASE}/api/dossiers/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, currentStep }),
        });
        const initData = await initRes.json();
        if (initData?.token) {
          activeToken = initData.token;
          setDossierToken(activeToken);
        }
      }

      const submitEndpoint = activeToken
        ? `${API_BASE}/api/dossiers/${activeToken}/submit`
        : "/api/dossier/submit";

      const clientLanguage =
        (typeof window !== "undefined" ? window.localStorage.getItem("camikk-language") : null) ||
        (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "es");

      const res = await fetch(submitEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          language: clientLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al radicar.");
      setSubmissionSuccess(data.submissionNumber || data.submissionId);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("camikk_dossier_draft");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setStepError(err instanceof Error ? err.message : "Error al enviar el formulario.");
      setIsSubmitting(false);
    }
  };

  // Manejo de miembros dinámicos
  const handleAddMember = () => {
    setFormData((prev) => ({
      ...prev,
      members: [
        ...prev.members,
        {
          id: `member-${prev.members.length + 1}`,
          fullName: "",
          address: "",
          cityStateZip: "",
          email: "",
          phone: "",
          ownershipPercentage: 0,
          initialCapital: "",
          roleOrTitle: "Member",
        },
      ],
      structure: {
        ...prev.structure,
        totalMembers: prev.members.length + 1,
      },
    }));
  };

  const handleRemoveMember = (indexToRemove: number) => {
    if (formData.members.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== indexToRemove),
      structure: {
        ...prev.structure,
        totalMembers: prev.members.length - 1,
      },
    }));
  };

  const updateMember = (index: number, field: keyof MemberData, value: unknown) => {
    setFormData((prev) => {
      const nextMembers = [...prev.members];
      nextMembers[index] = { ...nextMembers[index], [field]: value };
      return { ...prev, members: nextMembers };
    });
  };

  const stepsList = [
    { num: 1, title: "Compañía", icon: Building2 },
    { num: 2, title: "Miembros", icon: Users },
    { num: 3, title: "EIN / IRS", icon: FileText },
    { num: 4, title: "Operating Agreement", icon: FileCheck2 },
    { num: 5, title: "Documentos", icon: Upload },
    { num: 6, title: "Revisar y Enviar", icon: UserCheck },
  ];

  if (submissionSuccess) {
    return (
      <div className="dossier-success-container">
        <div className="dossier-success-card">
          <div className="success-icon-badge">
            <CheckCircle2 size={54} className="text-gold" />
          </div>
          <span className="badge-pill">Expediente Recibido</span>
          <h1>¡Expediente de LLC Completado con Éxito!</h1>
          <p className="lead">
            Hemos recibido toda la información y documentación requerida para la preparación de tu LLC.
          </p>

          <div className="submission-id-box">
            <span>Número de Expediente:</span>
            <strong>{submissionSuccess}</strong>
          </div>

          <div className="next-steps-list">
            <h3>Próximos pasos con CAMIKK Holdings:</h3>
            <ul>
              <li>
                <Check size={18} />
                <span>
                  <strong>Revisión legal:</strong> Nuestro equipo legal verificará la disponibilidad del nombre ante la Secretaría de Estado correspondiente.
                </span>
              </li>
              <li>
                <Check size={18} />
                <span>
                  <strong>Presentación estatal:</strong> Radicamos los Artículos de Organización de tu compañía.
                </span>
              </li>
              <li>
                <Check size={18} />
                <span>
                  <strong>Gestión de EIN y Documentos:</strong> Tramitamos tu EIN ante el IRS y estructuramos tu Operating Agreement, Corporate Book y sellos.
                </span>
              </li>
            </ul>
          </div>

          <div className="success-contact-box">
            <p>
              ¿Tienes alguna pregunta inmediata? Contáctanos a <a href={BRAND.emailHref}>{BRAND.email}</a> o al{" "}
              <a href={BRAND.phoneHref}>{BRAND.phone}</a>.
            </p>
          </div>

          <Link href="/" className="button button-primary">
            Volver a la Página Principal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dossier-page-wrapper">
      {/* Header del Expediente */}
      <header className="dossier-header">
        <div className="container dossier-header-inner">
          <Link href="/" className="dossier-brand-link">
            <BrandLogo />
          </Link>
          <div className="dossier-header-actions">
            {dossierToken && (
              <button
                type="button"
                onClick={handleCopyDeviceLink}
                className="button button-device-link"
                title="Copiar enlace de tu expediente"
              >
                {linkCopied ? <Check size={15} /> : <Smartphone size={15} />}
                <span>{linkCopied ? "¡Enlace copiado!" : "Copiar enlace"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container dossier-main">
        {/* Stepper Superior */}
        <nav aria-label="Progreso del expediente" className="dossier-stepper-nav">
          <div className="stepper-track">
            {stepsList.map((step) => {
              const Icon = step.icon;
              const isPast = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep || validateCurrentStep(currentStep)) {
                      setCurrentStep(step.num);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={`stepper-step-btn ${isCurrent ? "current" : ""} ${isPast ? "completed" : ""}`}
                >
                  <div className="step-icon-wrap">
                    {isPast ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span className="step-label">
                    <span className="step-num">Paso {step.num}</span>
                    <span className="step-name">{step.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {stepError && (
          <div className="step-error-banner" role="alert">
            <Info size={18} />
            <span>{stepError}</span>
          </div>
        )}

        {/* CONTENIDO DE CADA PASO */}
        <div className="dossier-step-container">
          {/* PASO 1: A. Información de la Compañía */}
          {currentStep === 1 && (
            <section className="step-panel" aria-labelledby="step-1-title">
              <div className="step-panel-head">
                <span className="step-badge">Sección A</span>
                <h2 id="step-1-title">Información de la Compañía</h2>
                <p className="step-desc">
                  Indica los datos constitutivos y de contacto comercial de tu nueva empresa.
                </p>
              </div>

              <div className="form-fields-grid">
                <div className="form-group highlight-group">
                  <label htmlFor="company-state">
                    Estado de registro <span className="req">*</span>
                  </label>
                  <select
                    id="company-state"
                    value={formData.company.state}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        company: { ...p.company, state: e.target.value as StateName },
                      }))
                    }
                    className="form-select state-select-large"
                    required
                  >
                    <option value="">Selecciona uno de los 50 estados</option>
                    {(Object.keys(STATE_FEES) as StateName[]).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="company-name">
                    Nombre aprobado o solicitado de la LLC <span className="req">*</span>
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    required
                    placeholder="Ej. Nova Global Logistics LLC"
                    value={formData.company.name}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        company: { ...p.company, name: e.target.value },
                      }))
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="company-second-choice">Segunda opción de nombre</label>
                    <input
                      id="company-second-choice"
                      type="text"
                      placeholder="Ej. Nova Logistics Group LLC"
                      value={formData.company.secondChoice}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, secondChoice: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="company-third-choice">Tercera opción de nombre</label>
                    <input
                      id="company-third-choice"
                      type="text"
                      placeholder="Ej. Nova Express Solutions LLC"
                      value={formData.company.thirdChoice}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, thirdChoice: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="company-start-date">Fecha deseada de inicio (si aplica)</label>
                    <input
                      id="company-start-date"
                      type="date"
                      value={formData.company.startDate}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, startDate: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="company-activity">
                      Actividad principal del negocio <span className="req">*</span>
                    </label>
                    <input
                      id="company-activity"
                      type="text"
                      required
                      placeholder="Ej. Consultoría financiera y de negocios"
                      value={formData.company.activity}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, activity: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="company-desc">
                    Descripción detallada de los productos o servicios <span className="req">*</span>
                  </label>
                  <textarea
                    id="company-desc"
                    rows={3}
                    required
                    placeholder="Describe detalladamente qué comercializa o prestará tu empresa, a qué tipo de clientes y en qué canales..."
                    value={formData.company.description}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        company: { ...p.company, description: e.target.value },
                      }))
                    }
                    className="form-textarea"
                  />
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="company-address">
                      Dirección principal del negocio <span className="req">*</span>
                    </label>
                    <input
                      id="company-address"
                      type="text"
                      required
                      placeholder="Ej. 101 Hamilton St. Suite 351"
                      value={formData.company.address}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, address: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="company-city-zip">
                      Ciudad / Estado / ZIP <span className="req">*</span>
                    </label>
                    <input
                      id="company-city-zip"
                      type="text"
                      required
                      placeholder="Ej. Allentown, PA 18101"
                      value={formData.company.cityStateZip}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, cityStateZip: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="company-phone">Teléfono del negocio</label>
                    <input
                      id="company-phone"
                      type="tel"
                      placeholder="Ej. +1 (330) 449-1683"
                      value={formData.company.phone}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, phone: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="company-email">Email del negocio</label>
                    <input
                      id="company-email"
                      type="email"
                      placeholder="Ej. contacto@tuempresa.com"
                      value={formData.company.email}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, email: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="company-website">Sitio web (si ya existe)</label>
                    <input
                      id="company-website"
                      type="url"
                      placeholder="Ej. https://tuempresa.com"
                      value={formData.company.website}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, website: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* PASO 2: B. Estructura y C. Miembros */}
          {currentStep === 2 && (
            <section className="step-panel" aria-labelledby="step-2-title">
              <div className="step-panel-head">
                <span className="step-badge">Secciones B y C</span>
                <h2 id="step-2-title">Estructura, Administración y Miembros</h2>
                <p className="step-desc">
                  Define la administración y añade la información detallada de cada socio o propietario.
                </p>
              </div>

              {/* B. Estructura y administración */}
              <div className="sub-section-box">
                <h3 className="sub-title">B. Estructura y Administración</h3>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="mgmt-type">
                      ¿La LLC será Member-Managed o Manager-Managed? <span className="req">*</span>
                    </label>
                    <select
                      id="mgmt-type"
                      value={formData.structure.managementType}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          structure: {
                            ...p.structure,
                            managementType: e.target.value as "Member-Managed" | "Manager-Managed",
                          },
                        }))
                      }
                      className="form-select"
                    >
                      <option value="Member-Managed">Member-Managed (Administrada por los Propietarios)</option>
                      <option value="Manager-Managed">Manager-Managed (Administrada por Gerentes designados)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="signing-auth">
                      ¿Quién tendrá autoridad para firmar en nombre de la LLC? <span className="req">*</span>
                    </label>
                    <input
                      id="signing-auth"
                      type="text"
                      required
                      placeholder="Ej. Nombre del miembro principal o todos los miembros"
                      value={formData.structure.signingAuthority}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          structure: { ...p.structure, signingAuthority: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="non-owner-managers">¿Habrá managers que no sean propietarios?</label>
                    <select
                      id="non-owner-managers"
                      value={formData.structure.hasNonOwnerManagers}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          structure: {
                            ...p.structure,
                            hasNonOwnerManagers: e.target.value as "Si" | "No",
                          },
                        }))
                      }
                      className="form-select"
                    >
                      <option value="No">No</option>
                      <option value="Si">Sí</option>
                    </select>
                  </div>

                  {formData.structure.hasNonOwnerManagers === "Si" && (
                    <div className="form-group">
                      <label htmlFor="manager-names">Nombre completo de cada manager</label>
                      <input
                        id="manager-names"
                        type="text"
                        placeholder="Ej. Pedro Gómez, María Morales"
                        value={formData.structure.managerNames}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            structure: { ...p.structure, managerNames: e.target.value },
                          }))
                        }
                        className="form-input"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* C. Información de cada miembro / propietario */}
              <div className="sub-section-box">
                <div className="sub-section-header">
                  <div>
                    <h3 className="sub-title">C. Información de cada Miembro / Propietario</h3>
                    <p className="sub-desc">
                      Total de miembros configurados: {formData.members.length}. La suma de participación debe ser 100%.
                    </p>
                  </div>
                  <button type="button" onClick={handleAddMember} className="button button-add-member">
                    <Plus size={16} />
                    <span>Agregar Miembro</span>
                  </button>
                </div>

                {formData.members.map((member, index) => (
                  <div key={member.id} className="member-card">
                    <div className="member-card-top">
                      <span className="member-badge">Miembro #{index + 1}</span>
                      {formData.members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(index)}
                          className="member-delete-btn"
                          aria-label={`Eliminar miembro ${index + 1}`}
                        >
                          <Trash2 size={16} />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor={`m-name-${index}`}>
                          Nombre legal completo <span className="req">*</span>
                        </label>
                        <input
                          id={`m-name-${index}`}
                          type="text"
                          required
                          placeholder="Tal como figura en el pasaporte o ID"
                          value={member.fullName}
                          onChange={(e) => updateMember(index, "fullName", e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-percent-${index}`}>
                          Porcentaje de propiedad (%) <span className="req">*</span>
                        </label>
                        <input
                          id={`m-percent-${index}`}
                          type="number"
                          min={1}
                          max={100}
                          required
                          value={member.ownershipPercentage}
                          onChange={(e) =>
                            updateMember(index, "ownershipPercentage", Number(e.target.value))
                          }
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor={`m-addr-${index}`}>
                          Dirección residencial <span className="req">*</span>
                        </label>
                        <input
                          id={`m-addr-${index}`}
                          type="text"
                          required
                          placeholder="Calle, número, depto / apto"
                          value={member.address}
                          onChange={(e) => updateMember(index, "address", e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-city-${index}`}>
                          Ciudad / Estado / ZIP <span className="req">*</span>
                        </label>
                        <input
                          id={`m-city-${index}`}
                          type="text"
                          required
                          placeholder="Ciudad, Provincia o Estado, Código Postal"
                          value={member.cityStateZip}
                          onChange={(e) => updateMember(index, "cityStateZip", e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor={`m-email-${index}`}>
                          Correo electrónico <span className="req">*</span>
                        </label>
                        <input
                          id={`m-email-${index}`}
                          type="email"
                          required
                          value={member.email}
                          onChange={(e) => updateMember(index, "email", e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-phone-${index}`}>
                          Teléfono <span className="req">*</span>
                        </label>
                        <input
                          id={`m-phone-${index}`}
                          type="tel"
                          required
                          value={member.phone}
                          onChange={(e) => updateMember(index, "phone", e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor={`m-capital-${index}`}>Capital inicial aportado (si aplica)</label>
                        <input
                          id={`m-capital-${index}`}
                          type="text"
                          placeholder="Ej. USD 1,000"
                          value={member.initialCapital}
                          onChange={(e) => updateMember(index, "initialCapital", e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-role-${index}`}>Cargo o función dentro de la compañía</label>
                        <input
                          id={`m-role-${index}`}
                          type="text"
                          placeholder="Ej. Presidente, Director de Operaciones"
                          value={member.roleOrTitle}
                          onChange={(e) => updateMember(index, "roleOrTitle", e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PASO 3: D. Información para el EIN / IRS */}
          {currentStep === 3 && (
            <section className="step-panel" aria-labelledby="step-3-title">
              <div className="step-panel-head">
                <span className="step-badge">Sección D</span>
                <h2 id="step-3-title">Información para el EIN / IRS</h2>
                <p className="step-desc">
                  Datos requeridos por el Servicio de Impuestos Internos (IRS) para la emisión del Número de Identificación Patronal (EIN).
                </p>
              </div>

              <div className="form-fields-grid">
                <div className="form-group highlight-group">
                  <label htmlFor="ein-resp-name">
                    Nombre completo del Responsable <span className="req">*</span>
                  </label>
                  <input
                    id="ein-resp-name"
                    type="text"
                    required
                    placeholder="Nombre del individuo que controla o gestiona la entidad"
                    value={formData.ein.responsiblePartyName}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        ein: { ...p.ein, responsiblePartyName: e.target.value },
                      }))
                    }
                    className="form-input"
                  />
                  <p className="input-hint">
                    El IRS exige un individuo como persona responsable. Si eres extranjero sin SSN, coloca tu nombre y déjalo indicado abajo.
                  </p>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="ein-ssn-itin">
                      SSN o ITIN del Responsible Party <span className="req">*</span>
                    </label>
                    <input
                      id="ein-ssn-itin"
                      type="text"
                      required
                      placeholder="SSN, ITIN o escribe 'NO POSEE / EXTRANJERO'"
                      value={formData.ein.ssnOrItin}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          ein: { ...p.ein, ssnOrItin: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ein-resp-addr">
                      Dirección del Responsable <span className="req">*</span>
                    </label>
                    <input
                      id="ein-resp-addr"
                      type="text"
                      required
                      placeholder="Dirección física residencial completa"
                      value={formData.ein.responsiblePartyAddress}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          ein: { ...p.ein, responsiblePartyAddress: e.target.value },
                        }))
                      }
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="ein-has-employees">
                      ¿La LLC espera tener empleados en los próximos 12 meses?
                    </label>
                    <select
                      id="ein-has-employees"
                      value={formData.ein.hasEmployeesNext12Months}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          ein: {
                            ...p.ein,
                            hasEmployeesNext12Months: e.target.value as "Si" | "No",
                          },
                        }))
                      }
                      className="form-select"
                    >
                      <option value="No">No</option>
                      <option value="Si">Sí</option>
                    </select>
                  </div>

                  {formData.ein.hasEmployeesNext12Months === "Si" && (
                    <>
                      <div className="form-group">
                        <label htmlFor="ein-emp-count">Número estimado de empleados</label>
                        <input
                          id="ein-emp-count"
                          type="number"
                          placeholder="Ej. 2"
                          value={formData.ein.estimatedEmployeesCount}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              ein: { ...p.ein, estimatedEmployeesCount: e.target.value },
                            }))
                          }
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="ein-wage-date">Fecha en que comenzará a pagar salarios</label>
                        <input
                          id="ein-wage-date"
                          type="date"
                          value={formData.ein.firstWageDate}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              ein: { ...p.ein, firstWageDate: e.target.value },
                            }))
                          }
                          className="form-input"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="ein-fiscal-month">
                      Mes de cierre del año fiscal (por defecto diciembre) <span className="req">*</span>
                    </label>
                    <select
                      id="ein-fiscal-month"
                      value={formData.ein.fiscalYearEndMonth}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          ein: { ...p.ein, fiscalYearEndMonth: e.target.value },
                        }))
                      }
                      className="form-select"
                    >
                      {[
                        "Diciembre",
                        "Enero",
                        "Febrero",
                        "Marzo",
                        "Abril",
                        "Mayo",
                        "Junio",
                        "Julio",
                        "Agosto",
                        "Septiembre",
                        "Octubre",
                        "Noviembre",
                      ].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ein-applied-before">
                      ¿Ha solicitado anteriormente un EIN para esta entidad? <span className="req">*</span>
                    </label>
                    <select
                      id="ein-applied-before"
                      value={formData.ein.previouslyAppliedEin}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          ein: {
                            ...p.ein,
                            previouslyAppliedEin: e.target.value as "Si" | "No",
                          },
                        }))
                      }
                      className="form-select"
                    >
                      <option value="No">No</option>
                      <option value="Si">Sí</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ein-irs-act">
                    Actividad principal para fines del IRS <span className="req">*</span>
                  </label>
                  <input
                    id="ein-irs-act"
                    type="text"
                    required
                    placeholder="Ej. Servicios de consultoría empresarial o comercio minorista en línea"
                    value={formData.ein.irsActivity}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        ein: { ...p.ein, irsActivity: e.target.value },
                      }))
                    }
                    className="form-input"
                  />
                </div>
              </div>
            </section>
          )}

          {/* PASO 4: E. Operating Agreement */}
          {currentStep === 4 && (
            <section className="step-panel" aria-labelledby="step-4-title">
              <div className="step-panel-head">
                <span className="step-badge">Sección E</span>
                <h2 id="step-4-title">Operating Agreement (Acuerdo Operativo)</h2>
                <p className="step-desc">
                  Reglas internas de gobernanza, toma de decisiones y distribución de beneficios de la LLC.
                </p>
              </div>

              <div className="form-fields-grid">
                <div className="form-group">
                  <label htmlFor="oa-distribution">
                    ¿Cómo se distribuirán ganancias y pérdidas? <span className="req">*</span>
                  </label>
                  <input
                    id="oa-distribution"
                    type="text"
                    required
                    value={formData.operatingAgreement.profitLossDistribution}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        operatingAgreement: {
                          ...p.operatingAgreement,
                          profitLossDistribution: e.target.value,
                        },
                      }))
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="oa-proportional">
                      ¿La distribución será proporcional al porcentaje de propiedad? <span className="req">*</span>
                    </label>
                    <select
                      id="oa-proportional"
                      value={formData.operatingAgreement.isDistributionProportional}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          operatingAgreement: {
                            ...p.operatingAgreement,
                            isDistributionProportional: e.target.value as "Si" | "No",
                          },
                        }))
                      }
                      className="form-select"
                    >
                      <option value="Si">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {formData.operatingAgreement.isDistributionProportional === "No" && (
                    <div className="form-group">
                      <label htmlFor="oa-dist-explain">Explicar la distribución acordada</label>
                      <input
                        id="oa-dist-explain"
                        type="text"
                        placeholder="Ej. 60% socio A, 40% socio B independientemente del capital"
                        value={formData.operatingAgreement.agreedDistributionExplanation}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            operatingAgreement: {
                              ...p.operatingAgreement,
                              agreedDistributionExplanation: e.target.value,
                            },
                          }))
                        }
                        className="form-input"
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="oa-decisions">
                    ¿Cómo se tomarán las decisiones importantes? <span className="req">*</span>
                  </label>
                  <select
                    id="oa-decisions"
                    value={formData.operatingAgreement.decisionMaking}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        operatingAgreement: {
                          ...p.operatingAgreement,
                          decisionMaking: e.target.value as "Mayoría" | "Unanimidad" | "Otro",
                        },
                      }))
                    }
                    className="form-select"
                  >
                    <option value="Mayoría">Mayoría de votos (más del 50%)</option>
                    <option value="Unanimidad">Unanimidad (100% de los votos)</option>
                    <option value="Otro">Otro criterio especial</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="oa-withdrawal">
                    ¿Qué sucederá si un miembro desea retirarse o vender su participación?
                  </label>
                  <textarea
                    id="oa-withdrawal"
                    rows={3}
                    placeholder="Ej. Los miembros restantes tienen derecho preferente de compra durante 30 días..."
                    value={formData.operatingAgreement.memberWithdrawalTerms}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        operatingAgreement: {
                          ...p.operatingAgreement,
                          memberWithdrawalTerms: e.target.value,
                        },
                      }))
                    }
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="oa-special">
                    ¿Hay acuerdos especiales entre los miembros que deban incluirse?
                  </label>
                  <textarea
                    id="oa-special"
                    rows={2}
                    placeholder="Cualquier cláusula adicional o acuerdo específico entre socios..."
                    value={formData.operatingAgreement.specialAgreements}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        operatingAgreement: {
                          ...p.operatingAgreement,
                          specialAgreements: e.target.value,
                        },
                      }))
                    }
                    className="form-textarea"
                  />
                </div>
              </div>
            </section>
          )}

          {/* PASO 5: F. Registered Office y G. Documentos */}
          {currentStep === 5 && (
            <section className="step-panel" aria-labelledby="step-5-title">
              <div className="step-panel-head">
                <span className="step-badge">Secciones F y G</span>
                <h2 id="step-5-title">Registered Office y Subida de Documentos</h2>
                <p className="step-desc">
                  Confirma el servicio de sede registrada y adjunta las identificaciones requeridas.
                </p>
              </div>

              {/* F. Registered Office y correspondencia */}
              <div className="sub-section-box">
                <h3 className="sub-title">F. Registered Office y Correspondencia</h3>

                <label className="checkbox-item highlight-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.registeredOffice.confirmedService}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        registeredOffice: {
                          ...p.registeredOffice,
                          confirmedService: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>
                    <strong>Confirmo que utilizaré el servicio de Registered Office de CAMIKK Holdings</strong> (Primer año incluido en el paquete. La renovación posterior es voluntaria).
                  </span>
                </label>

                <div className="form-group-row" style={{ marginTop: "20px" }}>
                  <div className="form-group">
                    <label htmlFor="reg-mail-addr">
                      Dirección postal preferida para recibir correspondencia de la compañía
                    </label>
                    <input
                      id="reg-mail-addr"
                      type="text"
                      placeholder="Dirección física o postal de tu preferencia"
                      value={formData.registeredOffice.preferredMailingAddress}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          registeredOffice: {
                            ...p.registeredOffice,
                            preferredMailingAddress: e.target.value,
                          },
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-contact-person">
                      Persona de contacto principal para avisos y documentos
                    </label>
                    <input
                      id="reg-contact-person"
                      type="text"
                      placeholder="Nombre de la persona autorizada para recibir notificaciones"
                      value={formData.registeredOffice.primaryContactPerson}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          registeredOffice: {
                            ...p.registeredOffice,
                            primaryContactPerson: e.target.value,
                          },
                        }))
                      }
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* G. Documentos y verificaciones */}
              <div className="sub-section-box">
                <h3 className="sub-title">G. Documentos y Verificaciones</h3>
                <p className="sub-desc">
                  Sube imágenes claras o PDFs de los documentos de identidad vigentes (Pasaporte, Licencia de Conducir o Cédula).
                </p>

                <div className="upload-grid">
                  {/* Documento 1: Responsible Party */}
                  {(() => {
                    const doc = uploadedS3Docs.find((d) => d.documentType === "RESPONSIBLE_PARTY_ID");
                    const isUploading = uploadingDocType === "RESPONSIBLE_PARTY_ID";
                    return (
                      <div className="upload-box">
                        <div className="upload-icon">
                          <Upload size={24} />
                        </div>
                        <strong>Identificación vigente del Responsible Party *</strong>
                        <p>Pasaporte o ID emitido por gobierno</p>

                        {isUploading ? (
                          <div style={{ padding: "10px", color: "var(--petrol)", fontSize: "13px" }}>
                            <LoaderCircle className="spinner" size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                            <span>Subiendo documento...</span>
                          </div>
                        ) : doc ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", width: "100%" }}>
                            <span style={{ fontSize: "12px", background: "#e6f9ed", color: "#107e3e", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ {doc.originalName}
                            </span>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <a href={doc.viewUrl || doc.s3Url} target="_blank" rel="noopener noreferrer" className="button button-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                <ExternalLink size={14} /> Ver documento
                              </a>
                              <button type="button" onClick={() => handleDeleteFile(doc.id, "responsiblePartyIdName")} className="button button-ghost" style={{ fontSize: "12px", color: "#b91c1c", padding: "4px 8px" }}>
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              id="upload-resp-id"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, "RESPONSIBLE_PARTY_ID", "responsiblePartyIdName");
                              }}
                            />
                            <label htmlFor="upload-resp-id" className="upload-browse-btn">
                              {formData.documents.responsiblePartyIdName || "Seleccionar archivo"}
                            </label>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Documento 2: Miembros adicionales */}
                  {(() => {
                    const doc = uploadedS3Docs.find((d) => d.documentType === "ADDITIONAL_MEMBER_ID");
                    const isUploading = uploadingDocType === "ADDITIONAL_MEMBER_ID";
                    return (
                      <div className="upload-box">
                        <div className="upload-icon">
                          <Upload size={24} />
                        </div>
                        <strong>Identificación de los demás miembros</strong>
                        <p>Requerido para sociedades con varios socios</p>

                        {isUploading ? (
                          <div style={{ padding: "10px", color: "var(--petrol)", fontSize: "13px" }}>
                            <LoaderCircle className="spinner" size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                            <span>Subiendo documento...</span>
                          </div>
                        ) : doc ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", width: "100%" }}>
                            <span style={{ fontSize: "12px", background: "#e6f9ed", color: "#107e3e", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ {doc.originalName}
                            </span>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <a href={doc.viewUrl || doc.s3Url} target="_blank" rel="noopener noreferrer" className="button button-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                <ExternalLink size={14} /> Ver documento
                              </a>
                              <button type="button" onClick={() => handleDeleteFile(doc.id, "additionalMembersIdName")} className="button button-ghost" style={{ fontSize: "12px", color: "#b91c1c", padding: "4px 8px" }}>
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              id="upload-members-id"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, "ADDITIONAL_MEMBER_ID", "additionalMembersIdName");
                              }}
                            />
                            <label htmlFor="upload-members-id" className="upload-browse-btn">
                              {formData.documents.additionalMembersIdName || "Seleccionar archivo"}
                            </label>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Documento 3: Entidad relacionada */}
                  {(() => {
                    const doc = uploadedS3Docs.find((d) => d.documentType === "RELATED_ENTITY_DOC");
                    const isUploading = uploadingDocType === "RELATED_ENTITY_DOC";
                    return (
                      <div className="upload-box">
                        <div className="upload-icon">
                          <Upload size={24} />
                        </div>
                        <strong>Documentos de entidad relacionada</strong>
                        <p>Si el miembro es otra empresa o holding</p>

                        {isUploading ? (
                          <div style={{ padding: "10px", color: "var(--petrol)", fontSize: "13px" }}>
                            <LoaderCircle className="spinner" size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                            <span>Subiendo documento...</span>
                          </div>
                        ) : doc ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", width: "100%" }}>
                            <span style={{ fontSize: "12px", background: "#e6f9ed", color: "#107e3e", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ {doc.originalName}
                            </span>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <a href={doc.viewUrl || doc.s3Url} target="_blank" rel="noopener noreferrer" className="button button-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                <ExternalLink size={14} /> Ver documento
                              </a>
                              <button type="button" onClick={() => handleDeleteFile(doc.id, "relatedEntityDocsName")} className="button button-ghost" style={{ fontSize: "12px", color: "#b91c1c", padding: "4px 8px" }}>
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              id="upload-entity-doc"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, "RELATED_ENTITY_DOC", "relatedEntityDocsName");
                              }}
                            />
                            <label htmlFor="upload-entity-doc" className="upload-browse-btn">
                              {formData.documents.relatedEntityDocsName || "Seleccionar archivo"}
                            </label>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Documento 4: Instrucción adicional */}
                  {(() => {
                    const doc = uploadedS3Docs.find((d) => d.documentType === "ADDITIONAL_DOC");
                    const isUploading = uploadingDocType === "ADDITIONAL_DOC";
                    return (
                      <div className="upload-box">
                        <div className="upload-icon">
                          <Upload size={24} />
                        </div>
                        <strong>Documento o instrucción adicional</strong>
                        <p>Opcional (cualquier detalle relevante)</p>

                        {isUploading ? (
                          <div style={{ padding: "10px", color: "var(--petrol)", fontSize: "13px" }}>
                            <LoaderCircle className="spinner" size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                            <span>Subiendo documento...</span>
                          </div>
                        ) : doc ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", width: "100%" }}>
                            <span style={{ fontSize: "12px", background: "#e6f9ed", color: "#107e3e", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ {doc.originalName}
                            </span>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <a href={doc.viewUrl || doc.s3Url} target="_blank" rel="noopener noreferrer" className="button button-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                <ExternalLink size={14} /> Ver documento
                              </a>
                              <button type="button" onClick={() => handleDeleteFile(doc.id, "additionalDocsName")} className="button button-ghost" style={{ fontSize: "12px", color: "#b91c1c", padding: "4px 8px" }}>
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              id="upload-extra-doc"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, "ADDITIONAL_DOC", "additionalDocsName");
                              }}
                            />
                            <label htmlFor="upload-extra-doc" className="upload-browse-btn">
                              {formData.documents.additionalDocsName || "Seleccionar archivo"}
                            </label>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </section>
          )}

          {/* PASO 6: H. Certificaciones Finales y Revisión */}
          {currentStep === 6 && (
            <section className="step-panel" aria-labelledby="step-6-title">
              <div className="step-panel-head">
                <span className="step-badge">Sección H</span>
                <h2 id="step-6-title">Certificaciones Finales y Firma Electrónica</h2>
                <p className="step-desc">
                  Revisa el resumen de tu expediente y completa las certificaciones legales obligatorias para radicar tu LLC.
                </p>
              </div>

              {/* Resumen sintético */}
              <div className="dossier-summary-card">
                <h3>Resumen del Expediente:</h3>
                <div className="summary-data-grid">
                  <div>
                    <span>Compañía solicitada:</span>
                    <strong>{formData.company.name || "—"}</strong>
                  </div>
                  <div>
                    <span>Estado de registro:</span>
                    <strong>{formData.company.state || "—"}</strong>
                  </div>
                  <div>
                    <span>Total miembros:</span>
                    <strong>{formData.members.length} propietario(s)</strong>
                  </div>
                  <div>
                    <span>Responsable:</span>
                    <strong>{formData.ein.responsiblePartyName || "—"}</strong>
                  </div>
                  <div>
                    <span>Administración:</span>
                    <strong>{formData.structure.managementType}</strong>
                  </div>
                  <div>
                    <span>Registered Office:</span>
                    <strong>CAMIKK Holdings (1 año incluido)</strong>
                  </div>
                </div>
              </div>

              {/* H. Certificaciones legales */}
              <form onSubmit={handleFinalSubmit} className="certifications-form">
                <div className="legal-checkboxes-block">
                  <label className="checkbox-item legal-item">
                    <input
                      type="checkbox"
                      required
                      checked={formData.certifications.accurate}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          certifications: {
                            ...p.certifications,
                            accurate: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span>
                      Confirmo que toda la información proporcionada es verdadera y correcta. <span className="req">*</span>
                    </span>
                  </label>

                  <label className="checkbox-item legal-item">
                    <input
                      type="checkbox"
                      required
                      checked={formData.certifications.authorized}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          certifications: {
                            ...p.certifications,
                            authorized: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span>
                      Autorizo a CAMIKK Holdings a utilizar esta información para preparar y presentar los documentos relacionados con el servicio contratado. <span className="req">*</span>
                    </span>
                  </label>

                  <label className="checkbox-item legal-item">
                    <input
                      type="checkbox"
                      required
                      checked={formData.certifications.governmentContactNotice}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          certifications: {
                            ...p.certifications,
                            governmentContactNotice: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span>
                      Entiendo que CAMIKK Holdings puede contactarme si falta información o si una agencia gubernamental requiere datos adicionales. <span className="req">*</span>
                    </span>
                  </label>

                  <label className="checkbox-item legal-item">
                    <input
                      type="checkbox"
                      required
                      checked={formData.certifications.delaysNotice}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          certifications: {
                            ...p.certifications,
                            delaysNotice: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span>
                      Entiendo que proporcionar información incorrecta o incompleta puede retrasar el proceso. <span className="req">*</span>
                    </span>
                  </label>
                </div>

                <div className="signature-box">
                  <div className="form-group-row">
                    <div className="form-group" style={{ flex: "2" }}>
                      <label htmlFor="final-signature">
                        Firma electrónica del solicitante <span className="req">*</span>
                      </label>
                      <input
                        id="final-signature"
                        type="text"
                        required
                        placeholder="Escribe tu nombre completo como firma legal"
                        value={formData.certifications.signature}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            certifications: {
                              ...p.certifications,
                              signature: e.target.value,
                            },
                          }))
                        }
                        className="form-input form-input-signature"
                      />
                      <small className="input-hint">
                        Al escribir tu nombre aquí certificas electrónicamente la veracidad del expediente con validez legal.
                      </small>
                    </div>

                    <div className="form-group" style={{ flex: "1" }}>
                      <label htmlFor="final-date">
                        Fecha <span className="req">*</span>
                      </label>
                      <input
                        id="final-date"
                        type="date"
                        required
                        value={formData.certifications.date}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            certifications: { ...p.certifications, date: e.target.value },
                          }))
                        }
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="submit-action-area">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="button button-primary submit-final-button"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="spinner" size={20} />
                        <span>Enviando expediente...</span>
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        <span>ENVIAR INFORMACION Y CONTINUAR CON MI REGISTRO</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* BARRA DE NAVEGACIÓN INFERIOR DEL WIZARD */}
          <footer className="dossier-wizard-footer">
            <div>
              {currentStep > 1 && (
                <button type="button" onClick={handlePrevStep} className="button button-secondary btn-wizard-prev">
                  <ArrowLeft size={16} />
                  <span>Paso Anterior</span>
                </button>
              )}
            </div>

            <div className="footer-right-actions">
              {currentStep < 6 && (
                <button type="button" onClick={handleNextStep} className="button button-primary btn-wizard-next">
                  <span>Siguiente Paso</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
