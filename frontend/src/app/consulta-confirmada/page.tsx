import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ConsultaConfirmadaContent } from "@/components/consulta/ConsultaConfirmadaContent";

export const metadata: Metadata = {
  title: "Consulta Confirmada y Agendada | CAMIKK HOLDINGS",
  description: "Tu consulta empresarial de 45 minutos ha sido confirmada y agendada exitosamente.",
};

type Props = { searchParams: Promise<{ lang?: string }> };

export default async function ConsultaConfirmadaPage({ searchParams }: Props) {
  const params = await searchParams;
  const isEn = params.lang === "en";

  return (
    <div className="consulta-confirmada-page" style={{ minHeight: "100vh", background: "#f4f8f8" }}>
      <header className="dossier-header">
        <div className="container dossier-header-inner">
          <Link href={isEn ? "/?lang=en" : "/"} className="dossier-brand-link">
            <BrandLogo />
          </Link>
          <Link href={isEn ? "/?lang=en" : "/"} className="text-link" style={{ color: "white" }}>
            <ArrowLeft size={16} />
            <span>{isEn ? "Back to home" : "Volver al inicio"}</span>
          </Link>
        </div>
      </header>

      <main className="container" style={{ paddingBlock: "48px 80px" }}>
        <Suspense
          fallback={
            <div className="container" style={{ padding: "60px 0", textAlign: "center", color: "var(--petrol)" }}>
              Cargando confirmación de cita...
            </div>
          }
        >
          <ConsultaConfirmadaContent />
        </Suspense>
      </main>
    </div>
  );
}
