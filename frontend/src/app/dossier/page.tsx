import type { Metadata } from "next";
import { Suspense } from "react";
import { PostPaymentDossier } from "@/components/dossier/PostPaymentDossier";

export const metadata: Metadata = {
  title: "Expediente de Formación de LLC | CAMIKK HOLDINGS",
  description: "Completa la información necesaria para preparar correctamente tu LLC, EIN y documentos corporativos.",
};

export default function DossierPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", color: "var(--petrol)" }}>
          <p>Cargando expediente seguro de CAMIKK Holdings...</p>
        </div>
      }
    >
      <PostPaymentDossier />
    </Suspense>
  );
}
