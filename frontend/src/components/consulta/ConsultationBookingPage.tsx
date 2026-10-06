"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const LEADCONNECTOR_BOOKING_URL = "https://api.leadconnectorhq.com/widget/booking/hHJcb7fWgRkuEwZHMDQr";

export function ConsultationBookingPage() {
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="dossier-page-wrapper">
      <header className="dossier-header">
        <div className="container dossier-header-inner">
          <Link href="/" className="dossier-brand-link">
            <BrandLogo />
          </Link>
          <Link href="/" className="text-link" style={{ color: "white" }}>
            <ArrowLeft size={16} />
            <span>Volver a la página principal</span>
          </Link>
        </div>
      </header>

      <main className="container" style={{ paddingBlock: "48px 80px", maxWidth: "960px" }}>
        <div className="form-header-banner" style={{ marginBottom: "32px" }}>
          <span className="badge-pill">Consulta Empresarial</span>
          <h1 className="form-heading-title">Reserva tu Consulta Empresarial</h1>
          <p className="lead" style={{ maxWidth: "680px", margin: "0 auto" }}>
            Selecciona la fecha y el horario que mejor te convenga con un especialista de CAMIKK Holdings.
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
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Cargando calendario de citas...</p>
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
            title="Agendar Consulta Empresarial"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </main>
    </div>
  );
}
