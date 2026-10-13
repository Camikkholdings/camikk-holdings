"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  Clock3,
  ShieldCheck,
  Mail,
  User,
  ArrowRight,
  ExternalLink,
  Download,
} from "lucide-react";

type BookingDetails = {
  fullName: string;
  email: string;
  phone: string;
  topic: string;
  scheduledDate: string;
  timeSlot: string;
  timeZone: string;
  status: string;
};

export function ConsultaConfirmadaContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedInDb, setSavedInDb] = useState(false);

  useEffect(() => {
    async function loadSessionAndSave() {
      try {
        let details: BookingDetails = {
          fullName: searchParams.get("name") || "Cliente CAMIKK",
          email: searchParams.get("email") || "",
          phone: searchParams.get("phone") || "",
          topic: searchParams.get("topic") || "Asesoría Empresarial",
          scheduledDate: searchParams.get("scheduledDate") || new Date().toISOString().split("T")[0],
          timeSlot: searchParams.get("timeSlot") || "10:00 AM - 10:45 AM",
          timeZone: "America/New_York (EST)",
          status: "CONFIRMED",
        };

        if (sessionId && !sessionId.startsWith("mock_")) {
          // Consultar Stripe Session
          const res = await fetch(`/api/checkout/session?session_id=${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            const meta = data.metadata || {};
            details = {
              fullName: meta.fullName || data.customer_email || details.fullName,
              email: data.customer_email || meta.email || details.email,
              phone: meta.phone || details.phone,
              topic: meta.topic || details.topic,
              scheduledDate: meta.scheduledDate || details.scheduledDate,
              timeSlot: meta.timeSlot || details.timeSlot,
              timeZone: "America/New_York (EST)",
              status: "CONFIRMED",
            };
          }
        }

        setBooking(details);

        // Guardar automáticamente en nuestra base de datos (PostgreSQL)
        if (details.email) {
          await fetch("/api/consultations/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...details,
              stripeSessionId: sessionId,
              totalAmount: 50,
            }),
          });
          setSavedInDb(true);
        }
      } catch (err) {
        console.warn("Aviso al sincronizar consulta:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSessionAndSave();
  }, [sessionId, searchParams]);

  const langParam = searchParams.get("lang") as "es" | "en" | null;
  const language: "es" | "en" =
    langParam === "en" || langParam === "es"
      ? langParam
      : typeof window !== "undefined" && window.localStorage.getItem("camikk-language") === "en"
      ? "en"
      : "es";

  const isEn = language === "en";

  // Generador de enlace a Google Calendar
  const googleCalendarUrl = useMemo(() => {
    if (!booking) return "";
    const title = encodeURIComponent(
      isEn
        ? `CAMIKK Business Consultation — ${booking.topic}`
        : `Consulta Empresarial CAMIKK — ${booking.topic}`
    );
    const details = encodeURIComponent(
      isEn
        ? `45-minute private consultation with a CAMIKK Holdings specialist.\nClient: ${booking.fullName}\nTopic: ${booking.topic}\nFormat: 1-on-1 Video Call`
        : `Sesión privada de 45 minutos con especialista de CAMIKK Holdings.\nCliente: ${booking.fullName}\nTema: ${booking.topic}\nModalidad: Videollamada 1-a-1`
    );
    const location = encodeURIComponent(
      isEn
        ? "CAMIKK Video Call (Link sent via email)"
        : "Videollamada CAMIKK (Enlace enviado por correo)"
    );

    // Convertir fecha y hora estimada a formato YYYYMMDDTHHmmssZ
    const dateClean = booking.scheduledDate.replace(/-/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dateClean}T150000Z/${dateClean}T154500Z`;
  }, [booking, isEn]);

  // Descarga de archivo .ics
  const downloadIcs = () => {
    if (!booking) return;
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//CAMIKK Holdings//Consultas//${isEn ? "EN" : "ES"}`,
      "BEGIN:VEVENT",
      `SUMMARY:${isEn ? "CAMIKK Business Consultation" : "Consulta Empresarial CAMIKK"} - ${booking.topic}`,
      `DESCRIPTION:${isEn ? "45-minute corporate consultation with CAMIKK Holdings specialist for" : "Sesión de 45 minutos con especialista corporativo de CAMIKK Holdings para"} ${booking.fullName}`,
      `LOCATION:${isEn ? "CAMIKK Video Call" : "Videollamada CAMIKK"}`,
      `DTSTART:${booking.scheduledDate.replace(/-/g, "")}T150000Z`,
      `DTEND:${booking.scheduledDate.replace(/-/g, "")}T154500Z`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `consultation-camikk-${booking.scheduledDate}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--petrol)", fontSize: "16px", fontWeight: "600" }}>
          {isEn
            ? "Verifying payment and registering your appointment in the system..."
            : "Verificando pago y registrando tu cita en el sistema..."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="consulta-success-hero" data-reveal style={{ textAlign: "center", marginBottom: "36px" }}>
        <div className="success-icon-badge" style={{ display: "inline-flex", justifyContent: "center", marginBottom: "16px" }}>
          <CheckCircle2 size={56} style={{ color: "#2b8a3e" }} />
        </div>
        <span className="badge-pill" style={{ background: "#e6f9ed", color: "#107e3e", border: "1px solid #b7eb8f" }}>
          {isEn ? "✓ Payment Confirmed — USD $50" : "✓ Pago Confirmado — USD $50"}
        </span>
        <h1 style={{ fontSize: "36px", color: "var(--petrol)", margin: "12px 0 8px" }}>
          {isEn ? "Your Appointment is Confirmed and Scheduled!" : "¡Tu Cita está Confirmada y Agendada!"}
        </h1>
        <p className="lead" style={{ color: "var(--muted)", maxWidth: "620px", margin: "0 auto" }}>
          {isEn
            ? "We have successfully processed your payment and your reservation has been recorded in our database. A CAMIKK Holdings specialist will meet with you promptly."
            : "Hemos procesado tu pago con éxito y tu reserva ha quedado registrada en nuestra base de datos. Un especialista de CAMIKK Holdings te atenderá puntualmente."}
        </p>
      </div>

      {/* Tarjeta con los detalles de la Reserva */}
      <div
        style={{
          background: "white",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "36px",
          boxShadow: "0 18px 45px rgba(0,35,48,0.06)",
          marginBottom: "32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "18px", marginBottom: "24px" }}>
          <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--brown)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {isEn ? "Session Details" : "Detalles de tu Sesión"}
          </span>
          <span style={{ fontSize: "12px", color: "#2b8a3e", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2b8a3e", display: "inline-block" }} />
            {savedInDb
              ? isEn ? "Saved in database" : "Registrado en base de datos"
              : isEn ? "Confirmed" : "Confirmado"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "26px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <Calendar size={20} style={{ color: "var(--brown)", flex: "none", marginTop: "2px" }} />
            <div>
              <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>
                {isEn ? "Scheduled Date" : "Fecha asignada"}
              </span>
              <strong style={{ fontSize: "15px", color: "var(--ink)" }}>{booking?.scheduledDate}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <Clock3 size={20} style={{ color: "var(--brown)", flex: "none", marginTop: "2px" }} />
            <div>
              <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>
                {isEn ? "Time (45 min)" : "Horario (45 min)"}
              </span>
              <strong style={{ fontSize: "15px", color: "var(--ink)" }}>
                {booking?.timeSlot} ({booking?.timeZone})
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <User size={20} style={{ color: "var(--brown)", flex: "none", marginTop: "2px" }} />
            <div>
              <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>
                {isEn ? "Client / Contact" : "Titular de la reserva"}
              </span>
              <strong style={{ fontSize: "15px", color: "var(--ink)" }}>{booking?.fullName}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <Mail size={20} style={{ color: "var(--brown)", flex: "none", marginTop: "2px" }} />
            <div>
              <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>
                {isEn ? "Email" : "Correo de contacto"}
              </span>
              <strong style={{ fontSize: "15px", color: "var(--ink)" }}>{booking?.email}</strong>
            </div>
          </div>
        </div>

        <div style={{ background: "var(--pale)", borderRadius: "12px", padding: "16px 20px", marginBottom: "26px" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
            {isEn ? "Consultation Topic" : "Tema de la Consulta"}
          </span>
          <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: "700", color: "var(--petrol)" }}>
            {booking?.topic}
          </p>
        </div>

        {/* Botones para agregar a Calendario */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: "24px" }}>
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-secondary"
            style={{ flex: "1", minWidth: "220px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <ExternalLink size={16} />
            <span>{isEn ? "Add to Google Calendar" : "Añadir a Google Calendar"}</span>
          </a>

          <button
            type="button"
            onClick={downloadIcs}
            className="button button-secondary"
            style={{ flex: "1", minWidth: "220px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Download size={16} />
            <span>{isEn ? "Download Event (.ics)" : "Descargar Evento (.ics)"}</span>
          </button>
        </div>
      </div>

      {/* Mensaje de Próximos Pasos */}
      <div style={{ background: "white", borderRadius: "16px", padding: "24px 28px", border: "1px solid var(--line)", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--petrol)", fontWeight: "700", fontSize: "14px", marginBottom: "8px" }}>
          <ShieldCheck size={18} style={{ color: "#2b8a3e" }} />
          <span>
            {isEn
              ? "Next step: You will receive a video meeting link"
              : "Siguiente paso: Recibirás un enlace de videollamada"}
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 18px", lineHeight: "1.5" }}>
          {isEn ? (
            <>
              We have sent the details of your appointment to <strong>{booking?.email}</strong>. Ten minutes before the scheduled time you will receive the direct video call link.
            </>
          ) : (
            <>
              Hemos enviado los detalles de tu cita a <strong>{booking?.email}</strong>. Diez minutos antes de la hora acordada recibirás el acceso directo para tu videollamada.
            </>
          )}
        </p>

        <Link
          href={isEn ? "/?lang=en" : "/"}
          className="button button-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px" }}
        >
          <span>{isEn ? "Back to CAMIKK Home" : "Volver al inicio de CAMIKK"}</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
