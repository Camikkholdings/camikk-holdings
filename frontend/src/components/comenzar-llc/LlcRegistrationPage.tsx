"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { CAMIKK_SERVICE_FEE, STATE_FEES, type StateName } from "@/data/stateFees";
import { BRAND } from "@/data/brand";
import { PhoneInputWithCountry } from "@/components/common/PhoneInputWithCountry";

const TXT = {
  es: {
    backHome: "Volver a la página principal",
    badge: "2. RUTA — COMENZAR MI LLC",
    title: "Datos iniciales antes del pago",
    lead: "Ingresa la información básica de tu compañía para calcular la tarifa de radicación y proceder al pago seguro con Stripe.",
    requiredData: "Datos Requeridos",
    fieldsNote: "Los campos con asterisco (*) son obligatorios.",
    fullName: "Nombre completo",
    fullNamePlaceholder: "Ej. Juan Pérez",
    phone: "Número de teléfono",
    email: "Correo electrónico",
    emailPlaceholder: "Ej. juan@tuempresa.com",
    stateLabel: "Estado donde desea registrar la LLC",
    stateSelectPlaceholder: "Selecciona uno de los 50 estados",
    stateFeeSuffix: "Tarifa estatal:",
    companyName: "Nombre deseado para la compañía",
    companyNamePlaceholder: "Ej. Innova Solutions LLC",
    secondName: "Segunda opción de nombre",
    secondNamePlaceholder: "Ej. Innova Group LLC",
    businessActivity: "Actividad principal del negocio",
    businessActivityPlaceholder: "Ej. Comercio electrónico, consultoría en gestión, desarrollo tecnológico...",
    ownersCount: "Cantidad de propietarios",
    owner1: "1 propietario",
    owner2: "2 propietarios",
    owner3: "3 o más",
    packageTitle: "3. Registro completo de tu LLC",
    includedLead: "El servicio incluye:",
    benefits: [
      "Registro de la LLC ante el estado",
      "EIN con el IRS",
      "Operating Agreement",
      "Corporate Book",
      "Sello corporativo",
      "Certificados corporativos",
      "Registered Office por el primer año",
      "Acompañamiento durante el proceso",
    ],
    registeredRenewalBadge: "Registered Office: primer año 100% incluido. La renovación posterior es voluntaria ($127/año opcional).",
    priceTitle: "4. Lógica automática del precio",
    priceFormula: "Fórmula: $725 CAMIKK Service Fee + State Filing Fee = Total a pagar hoy.",
    serviceFee: "Servicio CAMIKK",
    stateFeeLabel: "Tarifa estatal",
    totalToPay: "Total a pagar hoy",
    autoRenewActive: "✓ Renovación voluntaria activada: Se programará la renovación de Registered Office ($127 USD/año) a partir del año 2.",
    autoRenewInactive: "○ Sin renovación automática: Solo pagarás la constitución hoy. Primer año de Registered Office incluido sin cargos recurrentes.",
    selectStatePrompt: "Selecciona un estado en la lista para calcular el total.",
    confirmationsTitle: "5. Confirmaciones antes del pago",
    confirmAccurate: "Confirmo que la información proporcionada es correcta.",
    confirmStateApproval: "Entiendo que el nombre solicitado está sujeto a disponibilidad y aprobación del estado.",
    confirmAdditionalFees: "Entiendo que pueden existir requisitos o cargos adicionales según el estado.",
    termsLabel: "Términos y Condiciones",
    privacyLabel: "Política de Privacidad",
    termsPrefix: "Acepto los",
    termsMiddle: "y la",
    termsSuffix: "de CAMIKK Holdings.",
    autoRenewCheckboxTitle: "Deseo activar la renovación automática del servicio de Registered Office",
    autoRenewBadgeActive: "Suscripción activada",
    autoRenewBadgeOptional: "Opcional / Voluntario",
    autoRenewDescription: "El primer año está 100% incluido en tu pago de hoy. Marca esta casilla únicamente si decides que tu servicio de Registered Office se renueve automáticamente a partir del segundo año por $127 USD anuales para mantener la sede legal de tu empresa activa. Puedes cancelar o pausar esta suscripción en cualquier momento.",
    errorSelectState: "Por favor selecciona el estado donde deseas registrar la LLC.",
    errorRequiredFields: "Por favor completa todos los campos obligatorios (*) antes de continuar.",
    errorConfirmations: "Debes marcar las 4 confirmaciones obligatorias antes de proceder al pago.",
    errorStripeConnect: "Error al conectar con Stripe.",
    submittingStripe: "Conectando con Stripe seguro...",
    payAndStart: (amount: string) => `Pagar ${amount} y Comenzar mi LLC`,
    payDefault: "Pagar y Comenzar mi LLC",
    secureStripe: "Pago seguro y encriptado con Stripe (256-bit SSL)",
    modalSuccessTitle: "¡Pago Realizado con Éxito!",
    modalVerifying: "Confirmando la transacción y generando tu expediente digital...",
    modalConfirmed: "Tu orden de constitución ha sido confirmada y procesada de forma segura.",
    modalEmailSentPrefix: "Hemos enviado un correo a",
    modalEmailSentSuffix: "con el enlace exclusivo para completar el formulario oficial de tu LLC.",
    modalEmailDefault: "tu correo registrado",
    modalEmailNote: "Por favor revisa tu bandeja de entrada o spam. Puedes completar el formulario ahora o retomarlo en cualquier momento a través de tu enlace.",
    modalCompany: "Empresa Solicitada",
    modalState: "Estado de Radicación",
    modalClient: "Titular / Cliente",
    modalTotalPaid: "Total Pagado",
    modalCopied: "¡Copiado!",
    modalCopyLink: "Copiar enlace",
    modalCompleteNow: "Completar Formulario Ahora",
    modalCompleteLater: "Cerrar y completar más tarde desde el correo",
  },
  en: {
    backHome: "Back to home",
    badge: "2. ROUTE — START MY LLC",
    title: "Initial Details Before Payment",
    lead: "Enter your initial company information to calculate the state filing fee and proceed to secure checkout with Stripe.",
    requiredData: "Required Information",
    fieldsNote: "Fields marked with an asterisk (*) are required.",
    fullName: "Full Name",
    fullNamePlaceholder: "e.g. John Doe",
    phone: "Phone Number",
    email: "Email Address",
    emailPlaceholder: "e.g. john@yourcompany.com",
    stateLabel: "State where you want to register the LLC",
    stateSelectPlaceholder: "Select one of the 50 states",
    stateFeeSuffix: "State fee:",
    companyName: "Desired Company Name",
    companyNamePlaceholder: "e.g. Innova Solutions LLC",
    secondName: "Second Choice Company Name",
    secondNamePlaceholder: "e.g. Innova Group LLC",
    businessActivity: "Primary Business Activity",
    businessActivityPlaceholder: "e.g. E-commerce, management consulting, software development...",
    ownersCount: "Number of Owners",
    owner1: "1 owner",
    owner2: "2 owners",
    owner3: "3 or more",
    packageTitle: "3. Complete LLC Formation Package",
    includedLead: "The service includes:",
    benefits: [
      "State LLC registration",
      "EIN from the IRS",
      "Operating Agreement",
      "Corporate Book",
      "Corporate seal",
      "Corporate certificates",
      "Registered Office for the first year",
      "Guidance throughout the process",
    ],
    registeredRenewalBadge: "Registered Office: first year 100% included. Subsequent renewal is voluntary ($127/year optional).",
    priceTitle: "4. Automatic Price Calculation",
    priceFormula: "Formula: $725 CAMIKK Service Fee + State Filing Fee = Total to pay today.",
    serviceFee: "CAMIKK Service",
    stateFeeLabel: "State Filing Fee",
    totalToPay: "Total to pay today",
    autoRenewActive: "✓ Voluntary renewal activated: Registered Office renewal ($127 USD/year) will be scheduled starting in year 2.",
    autoRenewInactive: "○ No automatic renewal: You only pay formation today. First year of Registered Office included with no recurring charges.",
    selectStatePrompt: "Select a state from the list to calculate the total.",
    confirmationsTitle: "5. Confirmations Before Payment",
    confirmAccurate: "I confirm that the information provided is correct.",
    confirmStateApproval: "I understand that the requested name is subject to availability and state approval.",
    confirmAdditionalFees: "I understand that additional requirements or fees may exist depending on the state.",
    termsLabel: "Terms and Conditions",
    privacyLabel: "Privacy Policy",
    termsPrefix: "I accept the",
    termsMiddle: "and",
    termsSuffix: "of CAMIKK Holdings.",
    autoRenewCheckboxTitle: "I wish to activate automatic renewal for the Registered Office service",
    autoRenewBadgeActive: "Subscription activated",
    autoRenewBadgeOptional: "Optional / Voluntary",
    autoRenewDescription: "The first year is 100% included in today's payment. Check this box only if you choose to have your Registered Office service renew automatically starting in year two for $127 USD annually to keep your company's legal address active. You can cancel or pause this subscription at any time.",
    errorSelectState: "Please select the state where you wish to register the LLC.",
    errorRequiredFields: "Please complete all required fields (*) before continuing.",
    errorConfirmations: "You must check all 4 required confirmations before proceeding to payment.",
    errorStripeConnect: "Error connecting to Stripe.",
    submittingStripe: "Connecting to secure Stripe...",
    payAndStart: (amount: string) => `Pay ${amount} and Start My LLC`,
    payDefault: "Pay and Start My LLC",
    secureStripe: "Secure 256-bit SSL encrypted checkout with Stripe",
    modalSuccessTitle: "Payment Successful!",
    modalVerifying: "Verifying transaction and generating your digital dossier...",
    modalConfirmed: "Your company formation order has been confirmed and securely processed.",
    modalEmailSentPrefix: "We have sent an email to",
    modalEmailSentSuffix: "with the exclusive link to complete your official LLC dossier.",
    modalEmailDefault: "your registered email",
    modalEmailNote: "Please check your inbox or spam folder. You can complete the dossier now or return at any time using your link.",
    modalCompany: "Requested Company",
    modalState: "Filing State",
    modalClient: "Account Holder / Client",
    modalTotalPaid: "Total Paid",
    modalCopied: "Copied!",
    modalCopyLink: "Copy link",
    modalCompleteNow: "Complete Dossier Now",
    modalCompleteLater: "Close and complete later via email",
  },
};

export function LlcRegistrationPage() {
  const [selectedState, setSelectedState] = useState<StateName | "">("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [secondChoiceName, setSecondChoiceName] = useState("");
  const [businessActivity, setBusinessActivity] = useState("");
  const [ownersCount, setOwnersCount] = useState<"1" | "2" | "3+">("1");
  const [autoRenewRegisteredOffice, setAutoRenewRegisteredOffice] = useState(false);

  const [confirmations, setConfirmations] = useState({
    accurate: false,
    stateApproval: false,
    additionalFees: false,
    termsAccepted: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"es" | "en">("es");

  // Estado para la ventana flotante (Modal de pago exitoso)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    clientName: string;
    email: string;
    companyName: string;
    state: string;
    totalAmount: number;
    token: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const t = TXT[language];

  const handleLanguageChange = (next: "es" | "en") => {
    setLanguage(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("camikk-language", next);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState({}, "", url);
    }
  };

  // Leer estado e idioma de la URL si se seleccionó en la landing principal o si regresa de pago exitoso
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang");
    const storedLang = typeof window !== "undefined" ? window.localStorage.getItem("camikk-language") : null;
    if (urlLang === "en" || (!urlLang && storedLang === "en")) {
      setLanguage("en");
    } else {
      setLanguage("es");
    }

    const paramState = params.get("state") as StateName | null;
    if (paramState && paramState in STATE_FEES) {
      setSelectedState(paramState);
    }

    const isSuccess = params.get("payment") === "success";
    const sessionId = params.get("session_id") || "";
    const token = params.get("token") || "";

    if (isSuccess && (sessionId || token)) {
      setIsVerifyingPayment(true);
      setShowSuccessModal(true);

      fetch(`/api/checkout/verify-session?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.paid) {
            setPaymentDetails({
              clientName: data.clientName || "",
              email: data.email || "",
              companyName: data.companyName || (language === "en" ? "Your LLC" : "Tu LLC"),
              state: data.state || "",
              totalAmount: data.totalAmount || 0,
              token: data.token || token,
            });
          }
        })
        .catch((err) => {
          console.error("Error verificando pago:", err);
        })
        .finally(() => {
          setIsVerifyingPayment(false);
        });
    }
  }, [language]);

  const dossierLink = useMemo(() => {
    const token = paymentDetails?.token;
    if (!token) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/dossier?token=${token}&lang=${language}`;
  }, [paymentDetails?.token, language]);

  const handleCopyLink = () => {
    if (!dossierLink) return;
    navigator.clipboard.writeText(dossierLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    });
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("session_id");
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  };

  const money = useMemo(
    () =>
      new Intl.NumberFormat(language === "en" ? "en-US" : "es-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [language]
  );

  const stateFee = selectedState ? STATE_FEES[selectedState] : null;
  const totalAmount = stateFee !== null ? CAMIKK_SERVICE_FEE + stateFee : null;

  const allConfirmed =
    confirmations.accurate &&
    confirmations.stateApproval &&
    confirmations.additionalFees &&
    confirmations.termsAccepted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedState) {
      setFormError(t.errorSelectState);
      return;
    }
    if (!fullName.trim() || !phone.trim() || !email.trim() || !companyName.trim() || !businessActivity.trim()) {
      setFormError(t.errorRequiredFields);
      return;
    }
    if (!allConfirmed) {
      setFormError(t.errorConfirmations);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/checkout/llc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          state: selectedState,
          companyName,
          secondChoiceName,
          businessActivity,
          ownersCount,
          autoRenewRegisteredOffice,
          language,
          siteUrl: typeof window !== "undefined" ? window.location.origin : undefined,
          confirmations,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.errorStripeConnect);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t.errorStripeConnect);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dossier-page-wrapper">
      {/* Header dedicado */}
      <header className="dossier-header">
        <div className="container dossier-header-inner">
          <Link href={language === "en" ? "/?lang=en" : "/"} className="dossier-brand-link">
            <BrandLogo />
          </Link>
          <div className="dossier-header-actions" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              className="language-switch"
              role="group"
              aria-label="Seleccionar idioma"
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
            <Link href={language === "en" ? "/?lang=en" : "/"} className="text-link" style={{ color: "white" }}>
              <ArrowLeft size={16} />
              <span>{t.backHome}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingBlock: "48px 80px" }}>
        <div className="form-header-banner">
          <span className="badge-pill">{t.badge}</span>
          <h1 className="form-heading-title">{t.title}</h1>
          <p className="lead">{t.lead}</p>
        </div>

        <form onSubmit={handleSubmit} className="llc-form-grid">
          {/* Columna Izquierda: Datos iniciales antes del pago */}
          <div className="llc-fields-card">
            <div className="card-header-bar">
              <span className="step-tag">{t.requiredData}</span>
              <p className="card-note">{t.fieldsNote}</p>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="reg-fullname">
                  {t.fullName} <span className="req">*</span>
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  placeholder={t.fullNamePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-phone">
                  {t.phone} <span className="req">*</span>
                </label>
                <PhoneInputWithCountry
                  id="reg-phone"
                  value={phone}
                  onChange={(val) => setPhone(val)}
                  required
                  language={language}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">
                {t.email} <span className="req">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                required
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group highlight-group">
              <label htmlFor="state-select">
                {t.stateLabel} <span className="req">*</span>
              </label>
              <select
                id="state-select"
                value={selectedState}
                required
                onChange={(e) => setSelectedState(e.target.value as StateName | "")}
                className="form-select state-select-large"
              >
                <option value="">{t.stateSelectPlaceholder}</option>
                {(Object.keys(STATE_FEES) as StateName[]).map((state) => (
                  <option key={state} value={state}>
                    {state} — {t.stateFeeSuffix} {money.format(STATE_FEES[state])}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="reg-companyname">
                  {t.companyName} <span className="req">*</span>
                </label>
                <input
                  id="reg-companyname"
                  type="text"
                  required
                  placeholder={t.companyNamePlaceholder}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-secondname">{t.secondName}</label>
                <input
                  id="reg-secondname"
                  type="text"
                  placeholder={t.secondNamePlaceholder}
                  value={secondChoiceName}
                  onChange={(e) => setSecondChoiceName(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-activity">
                {t.businessActivity} <span className="req">*</span>
              </label>
              <textarea
                id="reg-activity"
                rows={2}
                required
                placeholder={t.businessActivityPlaceholder}
                value={businessActivity}
                onChange={(e) => setBusinessActivity(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label id="reg-owners-label">
                {t.ownersCount} <span className="req">*</span>
              </label>
              <div className="owners-toggle-group" role="radiogroup" aria-labelledby="reg-owners-label">
                {(["1", "2", "3+"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={ownersCount === opt}
                    className={`owners-toggle-btn ${ownersCount === opt ? "active" : ""}`}
                    onClick={() => setOwnersCount(opt)}
                  >
                    {opt === "1" ? t.owner1 : opt === "2" ? t.owner2 : t.owner3}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Paquete, Precio automático y Confirmaciones */}
          <div className="llc-pricing-card">
            {/* 3. Registro completo de tu LLC */}
            <div className="package-preview-box">
              <div className="package-header">
                <Sparkles size={18} className="sparkle-icon" />
                <h3>{t.packageTitle}</h3>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 10px" }}>
                {t.includedLead}
              </p>
              <ul className="package-checklist">
                {t.benefits.map((benefit) => (
                  <li key={benefit}>
                    <Check size={16} className="check-gold" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="registered-renewal-badge">
                <ShieldCheck size={16} />
                <span>{t.registeredRenewalBadge}</span>
              </div>
            </div>

            {/* 4. Lógica automática del precio */}
            <div className="price-breakdown-box">
              <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "8px" }}>
                {t.priceTitle}
              </h3>
              <p className="price-formula-lead">{t.priceFormula}</p>
              <div className="price-rows">
                <div className="price-row">
                  <span>{t.serviceFee}</span>
                  <strong>{money.format(CAMIKK_SERVICE_FEE)}</strong>
                </div>
                <div className="price-row">
                  <span>
                    {t.stateFeeLabel} {selectedState ? `(${selectedState})` : ""}
                  </span>
                  <strong>{stateFee === null ? "—" : money.format(stateFee)}</strong>
                </div>
              </div>

              <div className="price-total" aria-live="polite">
                <span>{t.totalToPay}</span>
                <strong className="total-highlight">
                  {totalAmount !== null ? money.format(totalAmount) : "—"}
                </strong>
              </div>

              {selectedState && (
                <div style={{ marginTop: "14px", padding: "10px 12px", borderRadius: "8px", background: autoRenewRegisteredOffice ? "#eff6ff" : "#f8fafc", border: `1px solid ${autoRenewRegisteredOffice ? "#bfdbfe" : "#e2e8f0"}`, fontSize: "12px", color: autoRenewRegisteredOffice ? "#1e40af" : "#64748b" }}>
                  {autoRenewRegisteredOffice ? (
                    <span>{t.autoRenewActive}</span>
                  ) : (
                    <span>{t.autoRenewInactive}</span>
                  )}
                </div>
              )}

              {!selectedState && (
                <p className="price-empty-prompt">{t.selectStatePrompt}</p>
              )}
            </div>

            {/* 5. Confirmaciones antes del pago */}
            <div className="confirmations-box">
              <h4 className="confirmations-heading">{t.confirmationsTitle}</h4>
              <div className="checkbox-list">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={confirmations.accurate}
                    onChange={(e) =>
                      setConfirmations((p) => ({ ...p, accurate: e.target.checked }))
                    }
                  />
                  <span>{t.confirmAccurate}</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={confirmations.stateApproval}
                    onChange={(e) =>
                      setConfirmations((p) => ({ ...p, stateApproval: e.target.checked }))
                    }
                  />
                  <span>{t.confirmStateApproval}</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={confirmations.additionalFees}
                    onChange={(e) =>
                      setConfirmations((p) => ({ ...p, additionalFees: e.target.checked }))
                    }
                  />
                  <span>{t.confirmAdditionalFees}</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={confirmations.termsAccepted}
                    onChange={(e) =>
                      setConfirmations((p) => ({ ...p, termsAccepted: e.target.checked }))
                    }
                  />
                  <span>
                    {t.termsPrefix}{" "}
                    <a href={BRAND.terms} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                      {t.termsLabel}
                    </a>{" "}
                    {t.termsMiddle}{" "}
                    <a href={BRAND.privacy} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                      {t.privacyLabel}
                    </a>{" "}
                    {t.termsSuffix}
                  </span>
                </label>
              </div>

              {/* Casilla Voluntaria de Suscripción / Renovación Automática */}
              <div className={`renewal-voluntary-box ${autoRenewRegisteredOffice ? "active" : ""}`}>
                <label className="renewal-checkbox-item">
                  <input
                    type="checkbox"
                    checked={autoRenewRegisteredOffice}
                    onChange={(e) => setAutoRenewRegisteredOffice(e.target.checked)}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "13px", color: "var(--petrol)" }}>
                        {t.autoRenewCheckboxTitle}
                      </strong>
                      <span className={`badge-optional ${autoRenewRegisteredOffice ? "selected" : ""}`}>
                        {autoRenewRegisteredOffice ? t.autoRenewBadgeActive : t.autoRenewBadgeOptional}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0", lineHeight: "1.4" }}>
                      {t.autoRenewDescription}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {formError && (
              <div className="form-error-alert" role="alert">
                <Info size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* Botón de Pago con Stripe */}
            <div className="checkout-action-area">
              <button
                type="submit"
                disabled={isSubmitting || !selectedState}
                className="button button-primary full-width button-large-checkout"
              >
                <Lock size={18} />
                <span>
                  {isSubmitting
                    ? t.submittingStripe
                    : totalAmount !== null
                    ? t.payAndStart(money.format(totalAmount))
                    : t.payDefault}
                </span>
              </button>

              <div className="stripe-secure-badge">
                <ShieldCheck size={15} />
                <span>{t.secureStripe}</span>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Ventana flotante: Confirmación de pago y notificación del enlace por correo */}
      {showSuccessModal && (
        <div className="psm-backdrop" role="dialog" aria-modal="true" aria-labelledby="psm-modal-title">
          <div className="psm-dialog">
            <button
              type="button"
              className="psm-close-btn"
              onClick={handleCloseModal}
              aria-label="Cerrar ventana"
            >
              <X size={18} />
            </button>

            <div className="psm-icon-wrapper">
              <CheckCircle2 size={38} />
            </div>

            <h2 id="psm-modal-title" className="psm-title">
              {t.modalSuccessTitle}
            </h2>
            <p className="psm-subtitle">
              {isVerifyingPayment ? t.modalVerifying : t.modalConfirmed}
            </p>

            {/* Aviso destacado: correo electrónico con el link del formulario */}
            <div className="psm-email-alert">
              <Mail size={24} className="psm-email-icon" />
              <div className="psm-email-text">
                <div>
                  {t.modalEmailSentPrefix}{" "}
                  <strong className="psm-email-highlight">
                    {paymentDetails?.email || email || t.modalEmailDefault}
                  </strong>{" "}
                  {t.modalEmailSentSuffix}
                </div>
                <div style={{ marginTop: "6px", fontSize: "12.5px", color: "#94a3b8", lineHeight: "1.45" }}>
                  {t.modalEmailNote}
                </div>
              </div>
            </div>

            {/* Resumen de la radicación */}
            {paymentDetails && (
              <div className="psm-summary-grid">
                <div className="psm-summary-item">
                  <span className="psm-summary-label">{t.modalCompany}</span>
                  <span className="psm-summary-value">{paymentDetails.companyName}</span>
                </div>
                <div className="psm-summary-item">
                  <span className="psm-summary-label">{t.modalState}</span>
                  <span className="psm-summary-value">{paymentDetails.state}</span>
                </div>
                <div className="psm-summary-item">
                  <span className="psm-summary-label">{t.modalClient}</span>
                  <span className="psm-summary-value">{paymentDetails.clientName}</span>
                </div>
                <div className="psm-summary-item">
                  <span className="psm-summary-label">{t.modalTotalPaid}</span>
                  <span className="psm-summary-value" style={{ color: "#34d399" }}>
                    {money.format(paymentDetails.totalAmount)} USD
                  </span>
                </div>
              </div>
            )}

            {/* Enlace directo y botón de copiar */}
            {dossierLink && (
              <div className="psm-link-box">
                <span className="psm-link-url" title={dossierLink}>
                  {dossierLink}
                </span>
                <button
                  type="button"
                  className="psm-copy-btn"
                  onClick={handleCopyLink}
                  title={t.modalCopyLink}
                >
                  {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{linkCopied ? t.modalCopied : t.modalCopyLink}</span>
                </button>
              </div>
            )}

            {/* Botones de acción */}
            <div className="psm-actions">
              {dossierLink && (
                <Link href={dossierLink} className="psm-primary-btn">
                  <span>{t.modalCompleteNow}</span>
                  <ArrowRight size={18} />
                </Link>
              )}
              <button
                type="button"
                className="psm-secondary-btn"
                onClick={handleCloseModal}
              >
                {t.modalCompleteLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

