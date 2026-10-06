import type { Metadata } from "next";
import { Suspense } from "react";
import { LlcRegistrationPage } from "@/components/comenzar-llc/LlcRegistrationPage";

export const metadata: Metadata = {
  title: "Comenzar mi LLC | CAMIKK HOLDINGS",
  description: "Ingresa los datos iniciales de tu compañía para calcular la tarifa oficial y procesar el registro de tu LLC en Estados Unidos.",
};

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: "60px 0", textAlign: "center" }}>Cargando formulario de registro...</div>}>
      <LlcRegistrationPage />
    </Suspense>
  );
}
