"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Globe,
  Lock,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

const TIMEZONES = [
  { value: "America/Bogota", label: "Bogotá / Lima / Quito (GMT-5)" },
  { value: "America/New_York", label: "Nueva York / Miami (EST / GMT-4)" },
  { value: "America/Mexico_City", label: "Ciudad de México (CST / GMT-6)" },
  { value: "America/Madrid", label: "Madrid / España (CET / GMT+1)" },
];

const CONSULTATION_TOPICS = [
  "Nueva LLC en Estados Unidos",
  "Optimización de LLC existente",
  "Impuestos, EIN y cumplimiento ante el IRS",
  "Sede Registrada (Registered Office) y Agente",
  "Estructura corporativa y socios",
  "Apertura de cuenta bancaria corporativa",
  "Otro tema empresarial",
];

const AVAILABLE_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
];

type Props = {
  onSuccessRedirect?: (url: string) => void;
  compact?: boolean;
};

export function NativeConsultationScheduler({ compact = false }: Props) {
  const today = useMemo(() => new Date(), []);

  // Estado del calendario (mes y año visible)
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth()); // 0-11

  // Fecha seleccionada (por defecto mañana o primer día hábil)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);
    if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1); // Si es domingo -> lunes
    if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2); // Si es sábado -> lunes
    return nextDay;
  });

  const [selectedSlot, setSelectedSlot] = useState<string>("10:00 AM");
  const [timeZone, setTimeZone] = useState<string>("America/Bogota");

  // Datos del cliente
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Nueva LLC en Estados Unidos");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navegación de mes
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generación de la cuadrícula de días
  const monthData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // 0 = Domingo, convertimos a formato Lunes = 0
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return { days, firstDay, daysInMonth };
  }, [currentYear, currentMonth]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const weekdayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const isDayDisabled = (dayNumber: number) => {
    const date = new Date(currentYear, currentMonth, dayNumber);
    // Comparar solo fecha sin horas
    const dateZero = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (dateZero < todayZero) return true; // Días pasados
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true; // Fines de semana deshabilitados
    return false;
  };

  const handleSelectDay = (dayNumber: number) => {
    if (isDayDisabled(dayNumber)) return;
    const newDate = new Date(currentYear, currentMonth, dayNumber);
    setSelectedDate(newDate);
  };

  const formattedSelectedDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return selectedDate.toLocaleDateString("es-ES", options);
  }, [selectedDate]);

  const dateParamString = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  // Manejo del pago con Stripe
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim() || !email.trim() || !email.includes("@")) {
      setError("Por favor completa tu nombre completo, teléfono y un correo electrónico válido.");
      return;
    }

    if (!selectedSlot) {
      setError("Por favor selecciona un horario disponible para tu consulta.");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/checkout/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          topic,
          description,
          scheduledDate: dateParamString,
          timeSlot: selectedSlot,
          timeZone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el pago de la consulta.");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con la pasarela de pago.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`native-booking-layout ${compact ? "compact-mode" : ""}`}>
      {/* Columna Izquierda: Calendario y Horarios */}
      <div className="calendar-picker-card">
        <div className="calendar-controls">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="calendar-month-label">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Días de la semana */}
        <div className="calendar-weekdays-row">
          {weekdayNames.map((w) => (
            <div key={w} className="weekday-header">
              {w}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="calendar-days-grid">
          {monthData.days.map((dayNumber, idx) => {
            if (dayNumber === null) {
              return <div key={`empty-${idx}`} className="calendar-day-btn empty" />;
            }

            const isDisabled = isDayDisabled(dayNumber);
            const isSelected =
              selectedDate.getFullYear() === currentYear &&
              selectedDate.getMonth() === currentMonth &&
              selectedDate.getDate() === dayNumber;

            const isToday =
              today.getFullYear() === currentYear &&
              today.getMonth() === currentMonth &&
              today.getDate() === dayNumber;

            return (
              <button
                key={`day-${dayNumber}`}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectDay(dayNumber)}
                className={`calendar-day-btn ${isSelected ? "selected" : ""} ${
                  isToday ? "today" : ""
                } ${isDisabled ? "disabled" : ""}`}
              >
                <span>{dayNumber}</span>
              </button>
            );
          })}
        </div>

        {/* Horarios disponibles */}
        <div className="slots-container">
          <div className="slots-header">
            <span className="slots-title">
              <Clock size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
              Horarios disponibles para {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
            </span>
            <div className="timezone-tag">
              <Globe size={13} />
              <span>45 min</span>
            </div>
          </div>

          <div className="slots-grid">
            {AVAILABLE_SLOTS.map((slot) => {
              const active = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  className={`slot-pill ${active ? "active" : ""}`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {slot}
                </button>
              );
            })}
          </div>

          {/* Selector de Zona Horaria */}
          <div style={{ marginTop: "16px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
              Zona horaria
            </label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="form-select"
              style={{ height: "40px", fontSize: "13px", marginTop: "4px" }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Formulario y Pago con Stripe */}
      <div className="booking-summary-card">
        {/* Banner de Precio */}
        <div className="consult-pricing-banner">
          <div>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--brown)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Tarifa de Consulta
            </span>
            <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>
              Sesión 1-a-1 de 45 minutos
            </div>
          </div>
          <div className="amount">$50 <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--muted)" }}>USD</span></div>
        </div>

        {/* Resumen de Fecha Seleccionada */}
        <div className="selected-time-banner">
          <CalendarIcon size={18} style={{ color: "var(--brown)", flex: "none" }} />
          <div>
            <div style={{ fontSize: "12px", textTransform: "capitalize" }}>
              {formattedSelectedDate}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--petrol)" }}>
              {selectedSlot} ({timeZone.split("/")[1]?.replace("_", " ") || timeZone})
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitBooking}>
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="b-fullname">
              Nombre y Apellido <span className="req">*</span>
            </label>
            <input
              id="b-fullname"
              type="text"
              required
              placeholder="Ej. Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="b-email">
              Correo Electrónico <span className="req">*</span>
            </label>
            <input
              id="b-email"
              type="email"
              required
              placeholder="juan@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="b-phone">
              Teléfono / WhatsApp <span className="req">*</span>
            </label>
            <input
              id="b-phone"
              type="tel"
              required
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="b-topic">Tema principal de la asesoría</label>
            <select
              id="b-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="form-select"
            >
              {CONSULTATION_TOPICS.map((top) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label htmlFor="b-desc">Detalles o preguntas previas (opcional)</label>
            <textarea
              id="b-desc"
              rows={2}
              placeholder="Describe brevemente tus dudas o modelo de negocio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              style={{ minHeight: "65px" }}
            />
          </div>

          {error && (
            <div className="form-error-alert" role="alert" style={{ marginBottom: "16px" }}>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="button button-primary"
              style={{ width: "100%", minHeight: "52px", fontSize: "15px", fontWeight: "800" }}
            >
              <Lock size={17} />
              <span>{isSubmitting ? "Conectando con Stripe..." : "PAGAR $50 Y AGENDAR MI CITA"}</span>
            </button>

            <div className="stripe-secure-badge">
              <ShieldCheck size={14} style={{ color: "#2b8a3e" }} />
              <span>Pago seguro y encriptado con Stripe (256-bit SSL)</span>
            </div>
          </div>
        </form>

        <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--line)", fontSize: "11px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={13} style={{ color: "#2b8a3e" }} />
            <span>Confirmación instantánea guardada en nuestra base de datos</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={13} style={{ color: "#2b8a3e" }} />
            <span>Enlace de videollamada privado enviado a tu email</span>
          </div>
        </div>
      </div>
    </div>
  );
}
