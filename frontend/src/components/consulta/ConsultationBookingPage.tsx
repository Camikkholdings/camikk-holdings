"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const LEADCONNECTOR_BOOKING_URL = "https://api.leadconnectorhq.com/widget/booking/hHJcb7fWgRkuEwZHMDQr";

export function ConsultationBookingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<"es" | "en">("es");

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
      window.history.replaceState({}, "", url);
    }
  };

  useEffect(() => {
    const scriptId = "leadconnector-form-embed-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://link.msgsndr.com/js/form_embed.js";
      script.type = "text/javascript";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const isEn = language === "en";

  return (
    <div className="dossier-page-wrapper">
      <header className="dossier-header">
        <div className="container dossier-header-inner">
          <Link href={isEn ? "/?lang=en" : "/"} className="dossier-brand-link">
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
            <Link href={isEn ? "/?lang=en" : "/"} className="text-link" style={{ color: "white" }}>
              <ArrowLeft size={16} />
              <span>{isEn ? "Back to home" : "Volver a la página principal"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingBlock: "48px 80px", maxWidth: "960px" }}>
        <div className="form-header-banner" style={{ marginBottom: "32px" }}>
          <span className="badge-pill">{isEn ? "Business Consultation" : "Consulta Empresarial"}</span>
          <h1 className="form-heading-title">
            {isEn ? "Book Your Business Consultation" : "Reserva tu Consulta Empresarial"}
          </h1>
          <p className="lead" style={{ maxWidth: "680px", margin: "0 auto" }}>
            {isEn
              ? "Select the date and time that works best for you with a CAMIKK Holdings specialist."
              : "Selecciona la fecha y el horario que mejor te convenga con un especialista de CAMIKK Holdings."}
          </p>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 25px 90px rgba(0, 35, 48, 0.25)",
            border: "1px solid rgba(0, 35, 48, 0.12)",
            minHeight: "750px",
            position: "relative",
          }}
        >
          {isLoading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "500px",
                gap: "16px",
                color: "var(--petrol)",
              }}
            >
              <Loader2 size={36} style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>
                {isEn ? "Loading appointment calendar..." : "Cargando calendario de citas..."}
              </p>
            </div>
          )}

          <iframe
            src={LEADCONNECTOR_BOOKING_URL}
            style={{
              width: "100%",
              border: "none",
              minHeight: "750px",
              height: "100%",
              display: isLoading ? "none" : "block",
            }}
            scrolling="no"
            id="hHJcb7fWgRkuEwZHMDQr_page"
            title={isEn ? "Book Business Consultation" : "Agendar Consulta Empresarial"}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </main>
    </div>
  );
}
