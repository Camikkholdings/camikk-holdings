import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsultationBookingPage } from "@/components/consulta/ConsultationBookingPage";

export const metadata: Metadata = {
  title: "Consulta Empresarial (45 min - $50) | CAMIKK HOLDINGS",
  description:
    "Recibe orientación personalizada con un especialista de CAMIKK Holdings para resolver tus dudas sobre creación de LLC, impuestos y estructura corporativa.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--petrol)" }}>
          Cargando formulario de consulta...
        </div>
      }
    >
      <ConsultationBookingPage />
    </Suspense>
  );
}
