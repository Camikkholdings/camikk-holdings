"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
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
import { DOSSIER_TEXT } from "./dossierLocales";

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

  updated.ein.fiscalYearEndMonth = "Diciembre";

  return updated;
}

export function PostPaymentDossier() {
  const [language, setLanguage] = useState<"es" | "en">("es");
  const t = DOSSIER_TEXT[language];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang");
    const storedLang = typeof window !== "undefined" ? window.localStorage.getItem("camikk-language") : null;
    if (urlLang === "en" || (!urlLang && storedLang === "en")) {
      setLanguage("en");
    } else {
      setLanguage("es");
    }
  }, []);

  const handleLanguageChange = (next: "es" | "en") => {
    setLanguage(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("camikk-language", next);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DossierFormState>(getInitialDossier);
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadedFromServer, setIsLoadedFromServer] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dossierToken, setDossierToken] = useState<string | null>(null);
  const [uploadedS3Docs, setUploadedS3Docs] = useState<S3Document[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

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
          fiscalYearEndMonth: "Diciembre",
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
      ? `${window.location.origin}/dossier?token=${dossierToken}&lang=${language}`
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
        clearFieldError(`doc_${documentType}`);
        setStepError(null);
      } else {
        // Fallback local
        setFormData((prev) => ({
          ...prev,
          documents: { ...prev.documents, [stateKey]: file.name },
        }));
        clearFieldError(`doc_${documentType}`);
        setStepError(null);
      }
    } catch {
      setFormData((prev) => ({
        ...prev,
        documents: { ...prev.documents, [stateKey]: file.name },
      }));
      clearFieldError(`doc_${documentType}`);
      setStepError(null);
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
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.company.state) {
        errors["company.state"] = t.validations.state;
      }
      if (!formData.company.name.trim()) {
        errors["company.name"] = t.validations.name;
      }
      if (!formData.company.activity.trim()) {
        errors["company.activity"] = t.validations.activity;
      }
      if (!formData.company.description.trim()) {
        errors["company.description"] = t.validations.desc;
      }
      if (!formData.company.address.trim()) {
        errors["company.address"] = t.validations.address;
      }
      if (!formData.company.cityStateZip.trim()) {
        errors["company.cityStateZip"] = t.validations.cityZip;
      }
    } else if (step === 2) {
      if (!formData.structure.signingAuthority.trim()) {
        errors["structure.signingAuthority"] = t.validations.signingAuthority;
      }
      for (let i = 0; i < formData.members.length; i++) {
        const m = formData.members[i];
        if (!m.fullName.trim()) {
          errors[`member_${i}_fullName`] = t.validations.memberName;
        }
        if (!m.ownershipPercentage || m.ownershipPercentage <= 0) {
          errors[`member_${i}_ownershipPercentage`] = t.validations.memberPercent;
        }
        if (!m.address.trim()) {
          errors[`member_${i}_address`] = t.validations.memberAddress;
        }
        if (!m.cityStateZip.trim()) {
          errors[`member_${i}_cityStateZip`] = t.validations.memberCityZip;
        }
        if (!m.email.trim()) {
          errors[`member_${i}_email`] = t.validations.memberEmail;
        }
        if (!m.phone.trim()) {
          errors[`member_${i}_phone`] = t.validations.memberPhone;
        }
      }
      const totalPercent = formData.members.reduce((acc, m) => acc + (Number(m.ownershipPercentage) || 0), 0);
      if (totalPercent !== 100) {
        errors["members_totalPercent"] = t.validations.totalPercent(totalPercent);
      }
    } else if (step === 3) {
      if (!formData.ein.responsiblePartyName.trim()) {
        errors["ein.responsiblePartyName"] = t.validations.respName;
      }
      if (!formData.ein.ssnOrItin.trim()) {
        errors["ein.ssnOrItin"] = t.validations.ssn;
      }
      if (!formData.ein.responsiblePartyAddress.trim()) {
        errors["ein.responsiblePartyAddress"] = t.validations.respAddress;
      }
      if (!formData.ein.irsActivity.trim()) {
        errors["ein.irsActivity"] = t.validations.irsActivity;
      }
    } else if (step === 4) {
      if (!formData.operatingAgreement.profitLossDistribution.trim()) {
        errors["operatingAgreement.profitLossDistribution"] = t.validations.profitLoss;
      }
    } else if (step === 5) {
      if (!formData.registeredOffice.confirmedService) {
        errors["registeredOffice.confirmedService"] = t.validations.roConfirm;
      }

      // VALIDACIÓN OBLIGATORIA DE SUBIDA DE DOCUMENTOS:
      const hasResponsibleId =
        uploadedS3Docs.some((d) => d.documentType === "RESPONSIBLE_PARTY_ID") ||
        Boolean(formData.documents.responsiblePartyIdName);
      if (!hasResponsibleId) {
        errors["doc_RESPONSIBLE_PARTY_ID"] = t.validations.docRespId;
      }

      const isMultiMember = formData.members.length > 1 || formData.structure.totalMembers > 1;
      if (isMultiMember) {
        const hasAdditionalMemberId =
          uploadedS3Docs.some((d) => d.documentType === "ADDITIONAL_MEMBER_ID") ||
          Boolean(formData.documents.additionalMembersIdName);
        if (!hasAdditionalMemberId) {
          errors["doc_ADDITIONAL_MEMBER_ID"] = t.validations.docAddId;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setStepError(firstError);
      return false;
    }

    setFieldErrors({});
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
    setFieldErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError(null);

    const errors: Record<string, string> = {};
    if (!formData.certifications.accurate) {
      errors["certifications.accurate"] = t.validations.certAccurate;
    }
    if (!formData.certifications.authorized) {
      errors["certifications.authorized"] = t.validations.certAuthorized;
    }
    if (!formData.certifications.governmentContactNotice) {
      errors["certifications.governmentContactNotice"] = t.validations.certGovNotice;
    }
    if (!formData.certifications.delaysNotice) {
      errors["certifications.delaysNotice"] = t.validations.certDelaysNotice;
    }
    if (!formData.certifications.signature.trim()) {
      errors["certifications.signature"] = t.validations.signature;
    }
    if (!formData.certifications.date.trim()) {
      errors["certifications.date"] = t.validations.date;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStepError(Object.values(errors)[0]);
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
    { num: 1, title: t.stepper.steps[0].title, icon: Building2 },
    { num: 2, title: t.stepper.steps[1].title, icon: Users },
    { num: 3, title: t.stepper.steps[2].title, icon: FileText },
    { num: 4, title: t.stepper.steps[3].title, icon: FileCheck2 },
    { num: 5, title: t.stepper.steps[4].title, icon: Upload },
    { num: 6, title: t.stepper.steps[5].title, icon: UserCheck },
  ];

  if (submissionSuccess) {
    return (
      <div className="dossier-success-container">
        <div className="dossier-success-card">
          <div className="success-icon-badge">
            <CheckCircle2 size={54} className="text-gold" />
          </div>
          <span className="badge-pill">{t.success.badge}</span>
          <h1>{t.success.title}</h1>
          <p className="lead">{t.success.lead}</p>

          <div className="submission-id-box">
            <span>{t.success.dossierNumber}</span>
            <strong>{submissionSuccess}</strong>
          </div>

          <div className="next-steps-list">
            <h3>{t.success.nextStepsTitle}</h3>
            <ul>
              <li>
                <Check size={18} />
                <span>
                  <strong>{t.success.legalReview}</strong> {t.success.legalReviewDesc}
                </span>
              </li>
              <li>
                <Check size={18} />
                <span>
                  <strong>{t.success.stateFiling}</strong> {t.success.stateFilingDesc}
                </span>
              </li>
              <li>
                <Check size={18} />
                <span>
                  <strong>{t.success.einAndDocs}</strong> {t.success.einAndDocsDesc}
                </span>
              </li>
            </ul>
          </div>

          <div className="success-contact-box">
            <p>
              {t.success.questions} <a href={BRAND.emailHref}>{BRAND.email}</a> {t.success.orAt}{" "}
              <a href={BRAND.phoneHref}>{BRAND.phone}</a>.
            </p>
          </div>

          <Link href={language === "en" ? "/?lang=en" : "/"} className="button button-primary">
            {t.success.backHome}
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
          <Link href={language === "en" ? "/?lang=en" : "/"} className="dossier-brand-link">
            <BrandLogo />
          </Link>
          <div className="dossier-header-actions" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              className="language-switch"
              role="group"
              aria-label={t.header.langAria}
              style={{
                display: "inline-flex",
                gap: "6px",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.08)",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <button
                type="button"
                aria-pressed={language === "es"}
                style={{
                  background: "none",
                  border: "none",
                  color: language === "es" ? "#fff" : "rgba(255, 255, 255, 0.5)",
                  fontWeight: language === "es" ? "700" : "400",
                  cursor: "pointer",
                  fontSize: "13px",
                  padding: "0 2px",
                }}
                onClick={() => handleLanguageChange("es")}
              >
                ES
              </button>
              <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "12px" }} aria-hidden="true">|</span>
              <button
                type="button"
                aria-pressed={language === "en"}
                style={{
                  background: "none",
                  border: "none",
                  color: language === "en" ? "#fff" : "rgba(255, 255, 255, 0.5)",
                  fontWeight: language === "en" ? "700" : "400",
                  cursor: "pointer",
                  fontSize: "13px",
                  padding: "0 2px",
                }}
                onClick={() => handleLanguageChange("en")}
              >
                EN
              </button>
            </div>
            {dossierToken && (
              <button
                type="button"
                onClick={handleCopyDeviceLink}
                className="button button-device-link"
                title={t.header.copyTitle}
              >
                {linkCopied ? <Check size={15} /> : <Smartphone size={15} />}
                <span>{linkCopied ? t.header.linkCopied : t.header.copyLink}</span>
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
                    <span className="step-num">{t.stepper.stepLabel(step.num)}</span>
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
                <span className="step-badge">{t.step1.badge}</span>
                <h2 id="step-1-title">{t.step1.title}</h2>
                <p className="step-desc">{t.step1.desc}</p>
              </div>

              <div className="form-fields-grid">
                <div className="form-group highlight-group">
                  <label htmlFor="company-state">
                    {t.step1.stateLabel} <span className="req">*</span>
                  </label>
                  <select
                    id="company-state"
                    value={formData.company.state}
                    onChange={(e) => {
                      clearFieldError("company.state");
                      setFormData((p) => ({
                        ...p,
                        company: { ...p.company, state: e.target.value as StateName },
                      }));
                    }}
                    className={`form-select state-select-large ${fieldErrors["company.state"] ? "has-error" : ""}`}
                    required
                  >
                    <option value="">{t.step1.statePlaceholder}</option>
                    {(Object.keys(STATE_FEES) as StateName[]).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  {fieldErrors["company.state"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["company.state"]}</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="company-name">
                    {t.step1.nameLabel} <span className="req">*</span>
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    required
                    placeholder={t.step1.namePlaceholder}
                    value={formData.company.name}
                    onChange={(e) => {
                      clearFieldError("company.name");
                      setFormData((p) => ({
                        ...p,
                        company: { ...p.company, name: e.target.value },
                      }));
                    }}
                    className={`form-input ${fieldErrors["company.name"] ? "has-error" : ""}`}
                  />
                  {fieldErrors["company.name"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["company.name"]}</span>
                    </div>
                  )}
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="company-second-choice">{t.step1.secondChoiceLabel}</label>
                    <input
                      id="company-second-choice"
                      type="text"
                      placeholder={t.step1.secondChoicePlaceholder}
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
                    <label htmlFor="company-third-choice">{t.step1.thirdChoiceLabel}</label>
                    <input
                      id="company-third-choice"
                      type="text"
                      placeholder={t.step1.thirdChoicePlaceholder}
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
                    <label htmlFor="company-start-date">{t.step1.startDateLabel}</label>
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
                      {t.step1.activityLabel} <span className="req">*</span>
                    </label>
                    <input
                      id="company-activity"
                      type="text"
                      required
                      placeholder={t.step1.activityPlaceholder}
                      value={formData.company.activity}
                      onChange={(e) => {
                        clearFieldError("company.activity");
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, activity: e.target.value },
                        }));
                      }}
                      className={`form-input ${fieldErrors["company.activity"] ? "has-error" : ""}`}
                    />
                    {fieldErrors["company.activity"] && (
                      <div className="field-error-msg">
                        <AlertCircle size={14} />
                        <span>{fieldErrors["company.activity"]}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="company-desc">
                    {t.step1.descriptionLabel} <span className="req">*</span>
                  </label>
                  <textarea
                    id="company-desc"
                    rows={3}
                    required
                    placeholder={t.step1.descriptionPlaceholder}
                    value={formData.company.description}
                    onChange={(e) => {
                      clearFieldError("company.description");
                      setFormData((p) => ({
                        ...p,
                        company: { ...p.company, description: e.target.value },
                      }));
                    }}
                    className={`form-textarea ${fieldErrors["company.description"] ? "has-error" : ""}`}
                  />
                  {fieldErrors["company.description"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["company.description"]}</span>
                    </div>
                  )}
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="company-address">
                      {t.step1.addressLabel} <span className="req">*</span>
                    </label>
                    <input
                      id="company-address"
                      type="text"
                      required
                      placeholder={t.step1.addressPlaceholder}
                      value={formData.company.address}
                      onChange={(e) => {
                        clearFieldError("company.address");
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, address: e.target.value },
                        }));
                      }}
                      className={`form-input ${fieldErrors["company.address"] ? "has-error" : ""}`}
                    />
                    {fieldErrors["company.address"] && (
                      <div className="field-error-msg">
                        <AlertCircle size={14} />
                        <span>{fieldErrors["company.address"]}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="company-city-zip">
                      {t.step1.cityZipLabel} <span className="req">*</span>
                    </label>
                    <input
                      id="company-city-zip"
                      type="text"
                      required
                      placeholder={t.step1.cityZipPlaceholder}
                      value={formData.company.cityStateZip}
                      onChange={(e) => {
                        clearFieldError("company.cityStateZip");
                        setFormData((p) => ({
                          ...p,
                          company: { ...p.company, cityStateZip: e.target.value },
                        }));
                      }}
                      className={`form-input ${fieldErrors["company.cityStateZip"] ? "has-error" : ""}`}
                    />
                    {fieldErrors["company.cityStateZip"] && (
                      <div className="field-error-msg">
                        <AlertCircle size={14} />
                        <span>{fieldErrors["company.cityStateZip"]}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="company-phone">{t.step1.phoneLabel}</label>
                    <input
                      id="company-phone"
                      type="tel"
                      placeholder={t.step1.phonePlaceholder}
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
                    <label htmlFor="company-email">{t.step1.emailLabel}</label>
                    <input
                      id="company-email"
                      type="email"
                      placeholder={t.step1.emailPlaceholder}
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
                    <label htmlFor="company-website">{t.step1.websiteLabel}</label>
                    <input
                      id="company-website"
                      type="url"
                      placeholder={t.step1.websitePlaceholder}
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
                <span className="step-badge">{t.step2.badge}</span>
                <h2 id="step-2-title">{t.step2.title}</h2>
                <p className="step-desc">{t.step2.desc}</p>
              </div>

              {/* B. Estructura y administración */}
              <div className="sub-section-box">
                <h3 className="sub-title">{t.step2.sectionBTitle}</h3>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="mgmt-type">
                      {t.step2.mgmtTypeLabel} <span className="req">*</span>
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
                      <option value="Member-Managed">{t.step2.mgmtTypeMember}</option>
                      <option value="Manager-Managed">{t.step2.mgmtTypeManager}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="signing-auth">
                      {t.step2.signingAuthLabel} <span className="req">*</span>
                    </label>
                    <input
                      id="signing-auth"
                      type="text"
                      required
                      placeholder={t.step2.signingAuthPlaceholder}
                      value={formData.structure.signingAuthority}
                      onChange={(e) => {
                        clearFieldError("structure.signingAuthority");
                        setFormData((p) => ({
                          ...p,
                          structure: { ...p.structure, signingAuthority: e.target.value },
                        }));
                      }}
                      className={`form-input ${fieldErrors["structure.signingAuthority"] ? "has-error" : ""}`}
                    />
                    {fieldErrors["structure.signingAuthority"] && (
                      <div className="field-error-msg">
                        <AlertCircle size={14} />
                        <span>{fieldErrors["structure.signingAuthority"]}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="non-owner-managers">{t.step2.hasNonOwnerManagersLabel}</label>
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
                      <option value="No">{t.step2.no}</option>
                      <option value="Si">{t.step2.yes}</option>
                    </select>
                  </div>

                  {formData.structure.hasNonOwnerManagers === "Si" && (
                    <div className="form-group">
                      <label htmlFor="manager-names">{t.step2.managerNamesLabel}</label>
                      <input
                        id="manager-names"
                        type="text"
                        placeholder={t.step2.managerNamesPlaceholder}
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
                    <h3 className="sub-title">{t.step2.sectionCTitle}</h3>
                    <p className="sub-desc">{t.step2.membersCountInfo(formData.members.length)}</p>
                  </div>
                  <button type="button" onClick={handleAddMember} className="button button-add-member">
                    <Plus size={16} />
                    <span>{t.step2.addMember}</span>
                  </button>
                </div>

                {fieldErrors["members_totalPercent"] && (
                  <div className="field-error-msg" style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "10px 14px", margin: "12px 0", fontSize: "0.875rem" }}>
                    <AlertCircle size={16} />
                    <span>{fieldErrors["members_totalPercent"]}</span>
                  </div>
                )}

                {formData.members.map((member, index) => (
                  <div key={member.id} className="member-card">
                    <div className="member-card-top">
                      <span className="member-badge">{t.step2.memberBadge(index + 1)}</span>
                      {formData.members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(index)}
                          className="member-delete-btn"
                          aria-label={t.step2.deleteAria(index + 1)}
                        >
                          <Trash2 size={16} />
                          <span>{t.step2.deleteMember}</span>
                        </button>
                      )}
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor={`m-name-${index}`}>
                          {t.step2.fullNameLabel} <span className="req">*</span>
                        </label>
                        <input
                          id={`m-name-${index}`}
                          type="text"
                          required
                          placeholder={t.step2.fullNamePlaceholder}
                          value={member.fullName}
                          onChange={(e) => {
                            clearFieldError(`member_${index}_fullName`);
                            updateMember(index, "fullName", e.target.value);
                          }}
                          className={`form-input ${fieldErrors[`member_${index}_fullName`] ? "has-error" : ""}`}
                        />
                        {fieldErrors[`member_${index}_fullName`] && (
                          <div className="field-error-msg">
                            <AlertCircle size={14} />
                            <span>{fieldErrors[`member_${index}_fullName`]}</span>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-percent-${index}`}>
                          {t.step2.ownershipLabel} <span className="req">*</span>
                        </label>
                        <input
                          id={`m-percent-${index}`}
                          type="number"
                          min={1}
                          max={100}
                          required
                          value={member.ownershipPercentage}
                          onChange={(e) => {
                            clearFieldError(`member_${index}_ownershipPercentage`);
                            clearFieldError("members_totalPercent");
                            updateMember(index, "ownershipPercentage", Number(e.target.value));
                          }}
                          className={`form-input ${fieldErrors[`member_${index}_ownershipPercentage`] ? "has-error" : ""}`}
                        />
                        {fieldErrors[`member_${index}_ownershipPercentage`] && (
                          <div className="field-error-msg">
                            <AlertCircle size={14} />
                            <span>{fieldErrors[`member_${index}_ownershipPercentage`]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor={`m-addr-${index}`}>
                          {t.step2.residentialAddressLabel} <span className="req">*</span>
                        </label>
                        <input
                          id={`m-addr-${index}`}
                          type="text"
                          required
                          placeholder={t.step2.residentialAddressPlaceholder}
                          value={member.address}
                          onChange={(e) => {
                            clearFieldError(`member_${index}_address`);
                            updateMember(index, "address", e.target.value);
                          }}
                          className={`form-input ${fieldErrors[`member_${index}_address`] ? "has-error" : ""}`}
                        />
                        {fieldErrors[`member_${index}_address`] && (
                          <div className="field-error-msg">
                            <AlertCircle size={14} />
                            <span>{fieldErrors[`member_${index}_address`]}</span>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-city-${index}`}>
                          {t.step2.cityZipLabel} <span className="req">*</span>
                        </label>
                        <input
                          id={`m-city-${index}`}
                          type="text"
                          required
                          placeholder={t.step2.cityZipPlaceholder}
                          value={member.cityStateZip}
                          onChange={(e) => {
                            clearFieldError(`member_${index}_cityStateZip`);
                            updateMember(index, "cityStateZip", e.target.value);
                          }}
                          className={`form-input ${fieldErrors[`member_${index}_cityStateZip`] ? "has-error" : ""}`}
                        />
                        {fieldErrors[`member_${index}_cityStateZip`] && (
                          <div className="field-error-msg">
                            <AlertCircle size={14} />
                            <span>{fieldErrors[`member_${index}_cityStateZip`]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor={`m-email-${index}`}>
                          {t.step2.emailLabel} <span className="req">*</span>
                        </label>
                        <input
                          id={`m-email-${index}`}
                          type="email"
                          required
                          value={member.email}
                          onChange={(e) => {
                            clearFieldError(`member_${index}_email`);
                            updateMember(index, "email", e.target.value);
                          }}
                          className={`form-input ${fieldErrors[`member_${index}_email`] ? "has-error" : ""}`}
                        />
                        {fieldErrors[`member_${index}_email`] && (
                          <div className="field-error-msg">
                            <AlertCircle size={14} />
                            <span>{fieldErrors[`member_${index}_email`]}</span>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-phone-${index}`}>
                          {t.step2.phoneLabel} <span className="req">*</span>
                        </label>
                        <input
                          id={`m-phone-${index}`}
                          type="tel"
                          required
                          value={member.phone}
                          onChange={(e) => {
                            clearFieldError(`member_${index}_phone`);
                            updateMember(index, "phone", e.target.value);
                          }}
                          className={`form-input ${fieldErrors[`member_${index}_phone`] ? "has-error" : ""}`}
                        />
                        {fieldErrors[`member_${index}_phone`] && (
                          <div className="field-error-msg">
                            <AlertCircle size={14} />
                            <span>{fieldErrors[`member_${index}_phone`]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor={`m-capital-${index}`}>{t.step2.capitalLabel}</label>
                        <input
                          id={`m-capital-${index}`}
                          type="text"
                          placeholder={t.step2.capitalPlaceholder}
                          value={member.initialCapital}
                          onChange={(e) => updateMember(index, "initialCapital", e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-role-${index}`}>{t.step2.roleLabel}</label>
                        <input
                          id={`m-role-${index}`}
                          type="text"
                          placeholder={t.step2.rolePlaceholder}
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
                <span className="step-badge">{t.step3.badge}</span>
                <h2 id="step-3-title">{t.step3.title}</h2>
                <p className="step-desc">{t.step3.desc}</p>
              </div>

              <div className="form-fields-grid">
                <div className="form-group highlight-group">
                  <label htmlFor="ein-resp-name">
                    {t.step3.respNameLabel} <span className="req">*</span>
                  </label>
                  <input
                    id="ein-resp-name"
                    type="text"
                    required
                    placeholder={t.step3.respNamePlaceholder}
                    value={formData.ein.responsiblePartyName}
                    onChange={(e) => {
                      clearFieldError("ein.responsiblePartyName");
                      setFormData((p) => ({
                        ...p,
                        ein: { ...p.ein, responsiblePartyName: e.target.value },
                      }));
                    }}
                    className={`form-input ${fieldErrors["ein.responsiblePartyName"] ? "has-error" : ""}`}
                  />
                  {fieldErrors["ein.responsiblePartyName"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["ein.responsiblePartyName"]}</span>
                    </div>
                  )}
                  <p className="input-hint">{t.step3.respNameHint}</p>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="ein-ssn-itin">
                      {t.step3.ssnItinLabel} <span className="req">*</span>
                    </label>
                    <input
                      id="ein-ssn-itin"
                      type="text"
                      required
                      placeholder={t.step3.ssnItinPlaceholder}
                      value={formData.ein.ssnOrItin}
                      onChange={(e) => {
                        clearFieldError("ein.ssnOrItin");
                        setFormData((p) => ({
                          ...p,
                          ein: { ...p.ein, ssnOrItin: e.target.value },
                        }));
                      }}
                      className={`form-input ${fieldErrors["ein.ssnOrItin"] ? "has-error" : ""}`}
                    />
                    {fieldErrors["ein.ssnOrItin"] && (
                      <div className="field-error-msg">
                        <AlertCircle size={14} />
                        <span>{fieldErrors["ein.ssnOrItin"]}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="ein-resp-addr">
                      {t.step3.respAddressLabel} <span className="req">*</span>
                    </label>
                    <input
                      id="ein-resp-addr"
                      type="text"
                      required
                      placeholder={t.step3.respAddressPlaceholder}
                      value={formData.ein.responsiblePartyAddress}
                      onChange={(e) => {
                        clearFieldError("ein.responsiblePartyAddress");
                        setFormData((p) => ({
                          ...p,
                          ein: { ...p.ein, responsiblePartyAddress: e.target.value },
                        }));
                      }}
                      className={`form-input ${fieldErrors["ein.responsiblePartyAddress"] ? "has-error" : ""}`}
                    />
                    {fieldErrors["ein.responsiblePartyAddress"] && (
                      <div className="field-error-msg">
                        <AlertCircle size={14} />
                        <span>{fieldErrors["ein.responsiblePartyAddress"]}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="ein-has-employees">{t.step3.hasEmployeesLabel}</label>
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
                      <option value="No">{t.step2.no}</option>
                      <option value="Si">{t.step2.yes}</option>
                    </select>
                  </div>

                  {formData.ein.hasEmployeesNext12Months === "Si" && (
                    <>
                      <div className="form-group">
                        <label htmlFor="ein-emp-count">{t.step3.employeeCountLabel}</label>
                        <input
                          id="ein-emp-count"
                          type="number"
                          placeholder={t.step3.employeeCountPlaceholder}
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
                        <label htmlFor="ein-wage-date">{t.step3.wageDateLabel}</label>
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
                      {t.step3.fiscalMonthLabel} <span className="req">*</span>
                    </label>
                    <select
                      id="ein-fiscal-month"
                      disabled
                      value="Diciembre"
                      className="form-select"
                      style={{
                        backgroundColor: "#f8fafc",
                        cursor: "not-allowed",
                        color: "var(--petrol, #0f2b38)",
                        opacity: 0.95,
                      }}
                      title={language === "en" ? "Fixed by default to December" : "Predefinido fijo a Diciembre"}
                    >
                      <option value="Diciembre">
                        {t.step3.fiscalMonths[0]}
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ein-applied-before">
                      {t.step3.previouslyAppliedLabel} <span className="req">*</span>
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
                      <option value="No">{t.step2.no}</option>
                      <option value="Si">{t.step2.yes}</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ein-irs-act">
                    {t.step3.irsActivityLabel} <span className="req">*</span>
                  </label>
                  <input
                    id="ein-irs-act"
                    type="text"
                    required
                    placeholder={t.step3.irsActivityPlaceholder}
                    value={formData.ein.irsActivity}
                    onChange={(e) => {
                      clearFieldError("ein.irsActivity");
                      setFormData((p) => ({
                        ...p,
                        ein: { ...p.ein, irsActivity: e.target.value },
                      }));
                    }}
                    className={`form-input ${fieldErrors["ein.irsActivity"] ? "has-error" : ""}`}
                  />
                  {fieldErrors["ein.irsActivity"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["ein.irsActivity"]}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* PASO 4: E. Operating Agreement */}
          {currentStep === 4 && (
            <section className="step-panel" aria-labelledby="step-4-title">
              <div className="step-panel-head">
                <span className="step-badge">{t.step4.badge}</span>
                <h2 id="step-4-title">{t.step4.title}</h2>
                <p className="step-desc">{t.step4.desc}</p>
              </div>

              <div className="form-fields-grid">
                <div className="form-group">
                  <label htmlFor="oa-distribution">
                    {t.step4.distributionLabel} <span className="req">*</span>
                  </label>
                  <input
                    id="oa-distribution"
                    type="text"
                    required
                    value={formData.operatingAgreement.profitLossDistribution}
                    onChange={(e) => {
                      clearFieldError("operatingAgreement.profitLossDistribution");
                      setFormData((p) => ({
                        ...p,
                        operatingAgreement: {
                          ...p.operatingAgreement,
                          profitLossDistribution: e.target.value,
                        },
                      }));
                    }}
                    className={`form-input ${fieldErrors["operatingAgreement.profitLossDistribution"] ? "has-error" : ""}`}
                  />
                  {fieldErrors["operatingAgreement.profitLossDistribution"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["operatingAgreement.profitLossDistribution"]}</span>
                    </div>
                  )}
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="oa-proportional">
                      {t.step4.proportionalLabel} <span className="req">*</span>
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
                      <option value="Si">{t.step2.yes}</option>
                      <option value="No">{t.step2.no}</option>
                    </select>
                  </div>

                  {formData.operatingAgreement.isDistributionProportional === "No" && (
                    <div className="form-group">
                      <label htmlFor="oa-dist-explain">{t.step4.distExplainLabel}</label>
                      <input
                        id="oa-dist-explain"
                        type="text"
                        placeholder={t.step4.distExplainPlaceholder}
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
                    {t.step4.decisionsLabel} <span className="req">*</span>
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
                    <option value="Mayoría">{t.step4.decisionsMajority}</option>
                    <option value="Unanimidad">{t.step4.decisionsUnanimity}</option>
                    <option value="Otro">{t.step4.decisionsOther}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="oa-withdrawal">
                    {t.step4.withdrawalLabel}
                  </label>
                  <textarea
                    id="oa-withdrawal"
                    rows={3}
                    placeholder={t.step4.withdrawalPlaceholder}
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
                    {t.step4.specialAgreementsLabel}
                  </label>
                  <textarea
                    id="oa-special"
                    rows={2}
                    placeholder={t.step4.specialAgreementsPlaceholder}
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
                <span className="step-badge">{t.step5.badge}</span>
                <h2 id="step-5-title">{t.step5.title}</h2>
                <p className="step-desc">{t.step5.desc}</p>
              </div>

              {/* F. Registered Office y correspondencia */}
              <div className="sub-section-box">
                <h3 className="sub-title">{t.step5.sectionFTitle}</h3>

                <label className={`checkbox-item highlight-checkbox ${fieldErrors["registeredOffice.confirmedService"] ? "has-error" : ""}`}>
                  <input
                    type="checkbox"
                    checked={formData.registeredOffice.confirmedService}
                    onChange={(e) => {
                      clearFieldError("registeredOffice.confirmedService");
                      setFormData((p) => ({
                        ...p,
                        registeredOffice: {
                          ...p.registeredOffice,
                          confirmedService: e.target.checked,
                        },
                      }));
                    }}
                  />
                  <span>
                    <strong>{t.step5.roConfirmLabel}</strong> {t.step5.roConfirmDetail} <span className="req">*</span>
                  </span>
                </label>
                {fieldErrors["registeredOffice.confirmedService"] && (
                  <div className="field-error-msg" style={{ marginTop: "8px" }}>
                    <AlertCircle size={14} />
                    <span>{fieldErrors["registeredOffice.confirmedService"]}</span>
                  </div>
                )}

                <div className="form-group-row" style={{ marginTop: "20px" }}>
                  <div className="form-group">
                    <label htmlFor="reg-mail-addr">
                      {t.step5.roAddressLabel}
                    </label>
                    <input
                      id="reg-mail-addr"
                      type="text"
                      placeholder={t.step5.roAddressPlaceholder}
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
                      {t.step5.roContactLabel}
                    </label>
                    <input
                      id="reg-contact-person"
                      type="text"
                      placeholder={t.step5.roContactPlaceholder}
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
                <h3 className="sub-title">{t.step5.sectionGTitle}</h3>
                <p className="sub-desc">{t.step5.sectionGDesc}</p>

                <div className="upload-grid">
                  {/* Documento 1: Responsible Party */}
                  {(() => {
                    const doc = uploadedS3Docs.find((d) => d.documentType === "RESPONSIBLE_PARTY_ID");
                    const isUploading = uploadingDocType === "RESPONSIBLE_PARTY_ID";
                    const hasError = Boolean(fieldErrors["doc_RESPONSIBLE_PARTY_ID"]);
                    return (
                      <div className={`upload-box ${hasError ? "has-error" : ""}`}>
                        <div className="upload-icon">
                          <Upload size={24} />
                        </div>
                        <strong>{t.step5.doc1Title} <span className="req">*</span></strong>
                        <p>{t.step5.doc1Desc}</p>

                        {isUploading ? (
                          <div style={{ padding: "10px", color: "var(--petrol)", fontSize: "13px" }}>
                            <LoaderCircle className="spinner" size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                            <span>{t.step5.uploading}</span>
                          </div>
                        ) : doc ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", width: "100%" }}>
                            <span style={{ fontSize: "12px", background: "#e6f9ed", color: "#107e3e", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ {doc.originalName}
                            </span>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <a href={doc.viewUrl || doc.s3Url} target="_blank" rel="noopener noreferrer" className="button button-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                <ExternalLink size={14} /> {t.step5.viewDoc}
                              </a>
                              <button type="button" onClick={() => handleDeleteFile(doc.id, "responsiblePartyIdName")} className="button button-ghost" style={{ fontSize: "12px", color: "#b91c1c", padding: "4px 8px" }}>
                                <Trash2 size={14} /> {t.step5.deleteDoc}
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
                              {formData.documents.responsiblePartyIdName || t.step5.selectFile}
                            </label>
                          </>
                        )}

                        {hasError && (
                          <div className="upload-error-msg">
                            <AlertCircle size={15} />
                            <span>{fieldErrors["doc_RESPONSIBLE_PARTY_ID"]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Documento 2: Miembros adicionales */}
                  {(() => {
                    const doc = uploadedS3Docs.find((d) => d.documentType === "ADDITIONAL_MEMBER_ID");
                    const isUploading = uploadingDocType === "ADDITIONAL_MEMBER_ID";
                    const isMulti = formData.members.length > 1 || formData.structure.totalMembers > 1;
                    const hasError = Boolean(fieldErrors["doc_ADDITIONAL_MEMBER_ID"]);
                    return (
                      <div className={`upload-box ${hasError ? "has-error" : ""}`}>
                        <div className="upload-icon">
                          <Upload size={24} />
                        </div>
                        <strong>{t.step5.doc2Title} {isMulti ? <span className="req">*</span> : ""}</strong>
                        <p>{isMulti ? t.step5.doc2DescMulti : t.step5.doc2DescSingle}</p>

                        {isUploading ? (
                          <div style={{ padding: "10px", color: "var(--petrol)", fontSize: "13px" }}>
                            <LoaderCircle className="spinner" size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                            <span>{t.step5.uploading}</span>
                          </div>
                        ) : doc ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", width: "100%" }}>
                            <span style={{ fontSize: "12px", background: "#e6f9ed", color: "#107e3e", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ {doc.originalName}
                            </span>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <a href={doc.viewUrl || doc.s3Url} target="_blank" rel="noopener noreferrer" className="button button-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                <ExternalLink size={14} /> {t.step5.viewDoc}
                              </a>
                              <button type="button" onClick={() => handleDeleteFile(doc.id, "additionalMembersIdName")} className="button button-ghost" style={{ fontSize: "12px", color: "#b91c1c", padding: "4px 8px" }}>
                                <Trash2 size={14} /> {t.step5.deleteDoc}
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
                              {formData.documents.additionalMembersIdName || t.step5.selectFile}
                            </label>
                          </>
                        )}

                        {hasError && (
                          <div className="upload-error-msg">
                            <AlertCircle size={15} />
                            <span>{fieldErrors["doc_ADDITIONAL_MEMBER_ID"]}</span>
                          </div>
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
                        <strong>{t.step5.doc3Title}</strong>
                        <p>{t.step5.doc3Desc}</p>

                        {isUploading ? (
                          <div style={{ padding: "10px", color: "var(--petrol)", fontSize: "13px" }}>
                            <LoaderCircle className="spinner" size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                            <span>{t.step5.uploading}</span>
                          </div>
                        ) : doc ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", width: "100%" }}>
                            <span style={{ fontSize: "12px", background: "#e6f9ed", color: "#107e3e", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ {doc.originalName}
                            </span>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <a href={doc.viewUrl || doc.s3Url} target="_blank" rel="noopener noreferrer" className="button button-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                <ExternalLink size={14} /> {t.step5.viewDoc}
                              </a>
                              <button type="button" onClick={() => handleDeleteFile(doc.id, "relatedEntityDocsName")} className="button button-ghost" style={{ fontSize: "12px", color: "#b91c1c", padding: "4px 8px" }}>
                                <Trash2 size={14} /> {t.step5.deleteDoc}
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
                              {formData.documents.relatedEntityDocsName || t.step5.selectFile}
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
                        <strong>{t.step5.doc4Title}</strong>
                        <p>{t.step5.doc4Desc}</p>

                        {isUploading ? (
                          <div style={{ padding: "10px", color: "var(--petrol)", fontSize: "13px" }}>
                            <LoaderCircle className="spinner" size={18} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
                            <span>{t.step5.uploading}</span>
                          </div>
                        ) : doc ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", width: "100%" }}>
                            <span style={{ fontSize: "12px", background: "#e6f9ed", color: "#107e3e", padding: "4px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              ✓ {doc.originalName}
                            </span>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <a href={doc.viewUrl || doc.s3Url} target="_blank" rel="noopener noreferrer" className="button button-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                <ExternalLink size={14} /> {t.step5.viewDoc}
                              </a>
                              <button type="button" onClick={() => handleDeleteFile(doc.id, "additionalDocsName")} className="button button-ghost" style={{ fontSize: "12px", color: "#b91c1c", padding: "4px 8px" }}>
                                <Trash2 size={14} /> {t.step5.deleteDoc}
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
                              {formData.documents.additionalDocsName || t.step5.selectFile}
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
          {/* PASO 6: H. Certificaciones Finales y Revisión */}
          {currentStep === 6 && (
            <section className="step-panel" aria-labelledby="step-6-title">
              <div className="step-panel-head">
                <span className="step-badge">{t.step6.badge}</span>
                <h2 id="step-6-title">{t.step6.title}</h2>
                <p className="step-desc">
                  {t.step6.desc}
                </p>
              </div>

              {/* Resumen sintético */}
              <div className="dossier-summary-card">
                <h3>{t.step6.summaryTitle}</h3>
                <div className="summary-data-grid">
                  <div>
                    <span>{t.step6.summaryCompany}</span>
                    <strong>{formData.company.name || "—"}</strong>
                  </div>
                  <div>
                    <span>{t.step6.summaryState}</span>
                    <strong>{formData.company.state || "—"}</strong>
                  </div>
                  <div>
                    <span>{t.step6.summaryMembers}</span>
                    <strong>{t.step6.summaryMembersCount(formData.members.length)}</strong>
                  </div>
                  <div>
                    <span>{t.step6.summaryResponsible}</span>
                    <strong>{formData.ein.responsiblePartyName || "—"}</strong>
                  </div>
                  <div>
                    <span>{t.step6.summaryManagement}</span>
                    <strong>{formData.structure.managementType}</strong>
                  </div>
                  <div>
                    <span>{t.step6.summaryRegisteredOffice}</span>
                    <strong>{t.step6.summaryRoVal}</strong>
                  </div>
                </div>
              </div>

              {/* H. Certificaciones legales */}
              <form onSubmit={handleFinalSubmit} className="certifications-form">
                <div className="legal-checkboxes-block">
                  <label className={`checkbox-item legal-item ${fieldErrors["certifications.accurate"] ? "has-error" : ""}`}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.certifications.accurate}
                      onChange={(e) => {
                        clearFieldError("certifications.accurate");
                        setFormData((p) => ({
                          ...p,
                          certifications: {
                            ...p.certifications,
                            accurate: e.target.checked,
                          },
                        }));
                      }}
                    />
                    <span>
                      {t.step6.certAccurate} <span className="req">*</span>
                    </span>
                  </label>
                  {fieldErrors["certifications.accurate"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["certifications.accurate"]}</span>
                    </div>
                  )}

                  <label className={`checkbox-item legal-item ${fieldErrors["certifications.authorized"] ? "has-error" : ""}`}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.certifications.authorized}
                      onChange={(e) => {
                        clearFieldError("certifications.authorized");
                        setFormData((p) => ({
                          ...p,
                          certifications: {
                            ...p.certifications,
                            authorized: e.target.checked,
                          },
                        }));
                      }}
                    />
                    <span>
                      {t.step6.certAuthorized} <span className="req">*</span>
                    </span>
                  </label>
                  {fieldErrors["certifications.authorized"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["certifications.authorized"]}</span>
                    </div>
                  )}

                  <label className={`checkbox-item legal-item ${fieldErrors["certifications.governmentContactNotice"] ? "has-error" : ""}`}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.certifications.governmentContactNotice}
                      onChange={(e) => {
                        clearFieldError("certifications.governmentContactNotice");
                        setFormData((p) => ({
                          ...p,
                          certifications: {
                            ...p.certifications,
                            governmentContactNotice: e.target.checked,
                          },
                        }));
                      }}
                    />
                    <span>
                      {t.step6.certGovNotice} <span className="req">*</span>
                    </span>
                  </label>
                  {fieldErrors["certifications.governmentContactNotice"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["certifications.governmentContactNotice"]}</span>
                    </div>
                  )}

                  <label className={`checkbox-item legal-item ${fieldErrors["certifications.delaysNotice"] ? "has-error" : ""}`}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.certifications.delaysNotice}
                      onChange={(e) => {
                        clearFieldError("certifications.delaysNotice");
                        setFormData((p) => ({
                          ...p,
                          certifications: {
                            ...p.certifications,
                            delaysNotice: e.target.checked,
                          },
                        }));
                      }}
                    />
                    <span>
                      {t.step6.certDelaysNotice} <span className="req">*</span>
                    </span>
                  </label>
                  {fieldErrors["certifications.delaysNotice"] && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      <span>{fieldErrors["certifications.delaysNotice"]}</span>
                    </div>
                  )}
                </div>

                <div className="signature-box">
                  <div className="form-group-row">
                    <div className="form-group" style={{ flex: "2" }}>
                      <label htmlFor="final-signature">
                        {t.step6.signatureLabel} <span className="req">*</span>
                      </label>
                      <input
                        id="final-signature"
                        type="text"
                        required
                        placeholder={t.step6.signaturePlaceholder}
                        value={formData.certifications.signature}
                        onChange={(e) => {
                          clearFieldError("certifications.signature");
                          setFormData((p) => ({
                            ...p,
                            certifications: {
                              ...p.certifications,
                              signature: e.target.value,
                            },
                          }));
                        }}
                        className={`form-input form-input-signature ${fieldErrors["certifications.signature"] ? "has-error" : ""}`}
                      />
                      {fieldErrors["certifications.signature"] && (
                        <div className="field-error-msg">
                          <AlertCircle size={14} />
                          <span>{fieldErrors["certifications.signature"]}</span>
                        </div>
                      )}
                      <small className="input-hint">
                        {t.step6.signatureHint}
                      </small>
                    </div>

                    <div className="form-group" style={{ flex: "1" }}>
                      <label htmlFor="final-date">
                        {t.step6.dateLabel} <span className="req">*</span>
                      </label>
                      <input
                        id="final-date"
                        type="date"
                        required
                        value={formData.certifications.date}
                        onChange={(e) => {
                          clearFieldError("certifications.date");
                          setFormData((p) => ({
                            ...p,
                            certifications: { ...p.certifications, date: e.target.value },
                          }));
                        }}
                        className={`form-input ${fieldErrors["certifications.date"] ? "has-error" : ""}`}
                      />
                      {fieldErrors["certifications.date"] && (
                        <div className="field-error-msg">
                          <AlertCircle size={14} />
                          <span>{fieldErrors["certifications.date"]}</span>
                        </div>
                      )}
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
                        <span>{t.step6.submittingBtn}</span>
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        <span>{t.step6.submitBtn}</span>
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
                  <span>{t.footer.prev}</span>
                </button>
              )}
            </div>

            <div className="footer-right-actions">
              {currentStep < 6 && (
                <button type="button" onClick={handleNextStep} className="button button-primary btn-wizard-next">
                  <span>{t.footer.next}</span>
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
