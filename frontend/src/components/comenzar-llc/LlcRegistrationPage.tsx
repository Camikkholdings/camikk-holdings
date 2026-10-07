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

const INCLUDED_BENEFITS = [
  "Registro de la LLC ante el estado",
  "EIN con el IRS",
  "Operating Agreement",
  "Corporate Book",
  "Sello corporativo",
  "Certificados corporativos",
  "Registered Office por el primer año",
  "Acompañamiento durante el proceso",
];

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
    if (urlLang === "en" || storedLang === "en") {
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
              companyName: data.companyName || "Tu LLC",
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
  }, []);

  const dossierLink = useMemo(() => {
    const token = paymentDetails?.token;
    if (!token) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/dossier?token=${token}`;
    }
    return `/dossier?token=${token}`;
  }, [paymentDetails?.token]);

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
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
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
      setFormError("Por favor selecciona el estado donde deseas registrar la LLC.");
      return;
    }
    if (!fullName.trim() || !phone.trim() || !email.trim() || !companyName.trim() || !businessActivity.trim()) {
      setFormError("Por favor completa todos los campos obligatorios (*) antes de continuar.");
      return;
    }
    if (!allConfirmed) {
      setFormError("Debes marcar las 4 confirmaciones obligatorias antes de proceder al pago.");
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
        throw new Error(data.error || "Error al procesar el pago");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al conectar con Stripe.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dossier-page-wrapper">
      {/* Header dedicado */}
      <header className="dossier-header">
        <div className="container dossier-header-inner">
          <Link href="/" className="dossier-brand-link">
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
            <Link href="/" className="text-link" style={{ color: "white" }}>
              <ArrowLeft size={16} />
              <span>{language === "en" ? "Back to home" : "Volver a la página principal"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingBlock: "48px 80px" }}>
        <div className="form-header-banner">
          <span className="badge-pill">2. Ruta — Comenzar mi LLC</span>
          <h1 className="form-heading-title">Datos iniciales antes del pago</h1>
          <p className="lead">
            Ingresa la información básica de tu compañía para calcular la tarifa de radicación y proceder al pago seguro con Stripe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="llc-form-grid">
          {/* Columna Izquierda: Datos iniciales antes del pago */}
          <div className="llc-fields-card">
            <div className="card-header-bar">
              <span className="step-tag">Datos Requeridos</span>
              <p className="card-note">Los campos con asterisco (*) son obligatorios.</p>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="reg-fullname">
                  Nombre completo <span className="req">*</span>
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-phone">
                  {language === "en" ? "Phone number" : "Número de teléfono"} <span className="req">*</span>
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
                Correo electrónico <span className="req">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="Ej. juan@tuempresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group highlight-group">
              <label htmlFor="state-select">
                Estado donde desea registrar la LLC <span className="req">*</span>
              </label>
              <select
                id="state-select"
                value={selectedState}
                required
                onChange={(e) => setSelectedState(e.target.value as StateName | "")}
                className="form-select state-select-large"
              >
                <option value="">Selecciona uno de los 50 estados</option>
                {(Object.keys(STATE_FEES) as StateName[]).map((state) => (
                  <option key={state} value={state}>
                    {state} — Tarifa estatal: {money.format(STATE_FEES[state])}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="reg-companyname">
                  Nombre deseado para la compañía <span className="req">*</span>
                </label>
                <input
                  id="reg-companyname"
                  type="text"
                  required
                  placeholder="Ej. Innova Solutions LLC"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-secondname">Segunda opción de nombre</label>
                <input
                  id="reg-secondname"
                  type="text"
                  placeholder="Ej. Innova Group LLC"
                  value={secondChoiceName}
                  onChange={(e) => setSecondChoiceName(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-activity">
                Actividad principal del negocio <span className="req">*</span>
              </label>
              <textarea
                id="reg-activity"
                rows={2}
                required
                placeholder="Ej. Comercio electrónico, consultoría en gestión, desarrollo tecnológico..."
                value={businessActivity}
                onChange={(e) => setBusinessActivity(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label id="reg-owners-label">
                Cantidad de propietarios <span className="req">*</span>
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
                    {opt === "3+" ? "3 o más" : `${opt} ${opt === "1" ? "propietario" : "propietarios"}`}
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
                <h3>3. Registro completo de tu LLC</h3>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 10px" }}>
                El servicio incluye:
              </p>
              <ul className="package-checklist">
                {INCLUDED_BENEFITS.map((benefit) => (
                  <li key={benefit}>
                    <Check size={16} className="check-gold" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="registered-renewal-badge">
                <ShieldCheck size={16} />
                <span>Registered Office: primer año 100% incluido. La renovación posterior es voluntaria ($127/año opcional).</span>
              </div>
            </div>

            {/* 4. Lógica automática del precio */}
            <div className="price-breakdown-box">
              <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "8px" }}>
                4. Lógica automática del precio
              </h3>
              <p className="price-formula-lead">
                Fórmula: $725 CAMIKK Service Fee + State Filing Fee = Total a pagar hoy.
              </p>
              <div className="price-rows">
                <div className="price-row">
                  <span>Servicio CAMIKK</span>
                  <strong>{money.format(CAMIKK_SERVICE_FEE)}</strong>
                </div>
                <div className="price-row">
                  <span>
                    Tarifa estatal {selectedState ? `(${selectedState})` : ""}
                  </span>
                  <strong>{stateFee === null ? "—" : money.format(stateFee)}</strong>
                </div>
              </div>

              <div className="price-total" aria-live="polite">
                <span>Total a pagar hoy</span>
                <strong className="total-highlight">
                  {totalAmount !== null ? money.format(totalAmount) : "—"}
                </strong>
              </div>

              {selectedState && (
                <div style={{ marginTop: "14px", padding: "10px 12px", borderRadius: "8px", background: autoRenewRegisteredOffice ? "#eff6ff" : "#f8fafc", border: `1px solid ${autoRenewRegisteredOffice ? "#bfdbfe" : "#e2e8f0"}`, fontSize: "12px", color: autoRenewRegisteredOffice ? "#1e40af" : "#64748b" }}>
                  {autoRenewRegisteredOffice ? (
                    <span>✓ <strong>Renovación voluntaria activada:</strong> Se programará la renovación de Registered Office ($127 USD/año) a partir del año 2.</span>
                  ) : (
                    <span>○ <strong>Sin renovación automática:</strong> Solo pagarás la constitución hoy. Primer año de Registered Office incluido sin cargos recurrentes.</span>
                  )}
                </div>
              )}

              {!selectedState && (
                <p className="price-empty-prompt">
                  Selecciona un estado en la lista para calcular el total.
                </p>
              )}
            </div>

            {/* 5. Confirmaciones antes del pago */}
            <div className="confirmations-box">
              <h4 className="confirmations-heading">5. Confirmaciones antes del pago</h4>
              <div className="checkbox-list">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={confirmations.accurate}
                    onChange={(e) =>
                      setConfirmations((p) => ({ ...p, accurate: e.target.checked }))
                    }
                  />
                  <span>Confirmo que la información proporcionada es correcta.</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={confirmations.stateApproval}
                    onChange={(e) =>
                      setConfirmations((p) => ({ ...p, stateApproval: e.target.checked }))
                    }
                  />
                  <span>
                    Entiendo que el nombre solicitado está sujeto a disponibilidad y aprobación del estado.
                  </span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={confirmations.additionalFees}
                    onChange={(e) =>
                      setConfirmations((p) => ({ ...p, additionalFees: e.target.checked }))
                    }
                  />
                  <span>
                    Entiendo que pueden existir requisitos o cargos adicionales según el estado.
                  </span>
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
                    Acepto los <a href={BRAND.terms} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Términos y Condiciones</a> y la <a href={BRAND.privacy} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Política de Privacidad</a> de CAMIKK Holdings.
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
                        Deseo activar la renovación automática del servicio de Registered Office
                      </strong>
                      <span className={`badge-optional ${autoRenewRegisteredOffice ? "selected" : ""}`}>
                        {autoRenewRegisteredOffice ? "Suscripción activada" : "Opcional / Voluntario"}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0", lineHeight: "1.4" }}>
                      El primer año está <strong>100% incluido</strong> en tu pago de hoy. Marca esta casilla únicamente si decides que tu servicio de Registered Office se renueve automáticamente a partir del segundo año por <strong>$127 USD anuales</strong> para mantener la sede legal de tu empresa activa. Puedes cancelar o pausar esta suscripción en cualquier momento.
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
                    ? "Conectando con Stripe seguro..."
                    : totalAmount !== null
                    ? `Pagar ${money.format(totalAmount)} y Comenzar mi LLC`
                    : "Pagar y Comenzar mi LLC"}
                </span>
              </button>

              <div className="stripe-secure-badge">
                <ShieldCheck size={15} />
                <span>Pago seguro y encriptado con Stripe (256-bit SSL)</span>
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
              ¡Pago Realizado con Éxito!
            </h2>
            <p className="psm-subtitle">
              {isVerifyingPayment
                ? "Confirmando la transacción y generando tu expediente digital..."
                : "Tu orden de constitución ha sido confirmada y procesada de forma segura."}
            </p>

            {/* Aviso destacado: correo electrónico con el link del formulario */}
            <div className="psm-email-alert">
              <Mail size={24} className="psm-email-icon" />
              <div className="psm-email-text">
                <div>
                  Hemos enviado un correo a{" "}
                  <strong className="psm-email-highlight">
                    {paymentDetails?.email || email || "tu correo registrado"}
                  </strong>{" "}
                  con el <strong>enlace exclusivo</strong> para completar el formulario oficial de tu LLC.
                </div>
                <div style={{ marginTop: "6px", fontSize: "12.5px", color: "#94a3b8", lineHeight: "1.45" }}>
                  Por favor revisa tu bandeja de entrada o spam. Puedes completar el formulario ahora o retomarlo en cualquier momento a través de tu enlace.
                </div>
              </div>
            </div>

            {/* Resumen de la radicación */}
            {paymentDetails && (
              <div className="psm-summary-grid">
                <div className="psm-summary-item">
                  <span className="psm-summary-label">Empresa Solicitada</span>
                  <span className="psm-summary-value">{paymentDetails.companyName}</span>
                </div>
                <div className="psm-summary-item">
                  <span className="psm-summary-label">Estado de Radicación</span>
                  <span className="psm-summary-value">{paymentDetails.state}</span>
                </div>
                <div className="psm-summary-item">
                  <span className="psm-summary-label">Titular / Cliente</span>
                  <span className="psm-summary-value">{paymentDetails.clientName}</span>
                </div>
                <div className="psm-summary-item">
                  <span className="psm-summary-label">Total Pagado</span>
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
                  title="Copiar enlace del formulario"
                >
                  {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{linkCopied ? "¡Copiado!" : "Copiar enlace"}</span>
                </button>
              </div>
            )}

            {/* Botones de acción */}
            <div className="psm-actions">
              {dossierLink && (
                <Link href={dossierLink} className="psm-primary-btn">
                  <span>Completar Formulario Ahora</span>
                  <ArrowRight size={18} />
                </Link>
              )}
              <button
                type="button"
                className="psm-secondary-btn"
                onClick={handleCloseModal}
              >
                Cerrar y completar más tarde desde el correo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

