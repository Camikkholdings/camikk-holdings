"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  ShieldCheck,
  Clock3,
  ArrowLeft,
} from "lucide-react";

export const ALL_TIME_SLOTS = [
  "08:00 AM",
  "08:45 AM",
  "09:30 AM",
  "10:15 AM",
  "11:00 AM",
  "11:45 AM",
  "01:15 PM",
  "02:00 PM",
  "02:45 PM",
  "03:30 PM",
  "04:15 PM",
];

type CalendlyStyleBookingProps = {
  onCancel?: () => void;
};

export function CalendlyStyleBooking({ onCancel }: CalendlyStyleBookingProps) {
  const today = useMemo(() => new Date(), []);

  // Paso actual: "datetime" (Selección fecha y hora) o "details" (Datos de contacto y pago)
  const [step, setStep] = useState<"datetime" | "details">("datetime");

  // Mes y año actual visible en el calendario
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth()); // 0-11

  // Día seleccionado (por defecto mañana hábil)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);
    if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2);
    return nextDay.getDate();
  });

  const [selectedSlot, setSelectedSlot] = useState<string>("10:15 AM");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Formulario del cliente
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fecha seleccionada formateada
  const selectedDateString = useMemo(() => {
    const y = currentYear;
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(selectedDay).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [currentYear, currentMonth, selectedDay]);

  // Cargar slots ocupados desde la API / base de datos para el día seleccionado
  useEffect(() => {
    let isCancelled = false;
    async function fetchSlotAvailability() {
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/consultations/slots?date=${selectedDateString}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setBookedSlots(data.bookedSlots || []);
          }
        }
      } catch {
        if (!isCancelled) setBookedSlots([]);
      } finally {
        if (!isCancelled) setLoadingSlots(false);
      }
    }

    fetchSlotAvailability();
    return () => {
      isCancelled = true;
    };
  }, [selectedDateString]);

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

  // Cuadrícula de días
  const monthData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // 0 = Domingo, convertimos a lunes = 0
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return { days, daysInMonth };
  }, [currentYear, currentMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const isDayAvailable = (d: number) => {
    const date = new Date(currentYear, currentMonth, d);
    const dateZero = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (dateZero < todayZero) return false;
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Fines de semana no disponibles
    return true;
  };

  const handleSelectDay = (d: number) => {
    if (!isDayAvailable(d)) return;
    setSelectedDay(d);
  };

  // Nombre legible del día seleccionado
  const selectedDateObj = useMemo(() => {
    return new Date(currentYear, currentMonth, selectedDay);
  }, [currentYear, currentMonth, selectedDay]);

  const selectedWeekdayName = useMemo(() => {
    const dayIndex = selectedDateObj.getDay();
    const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return map[dayIndex];
  }, [selectedDateObj]);

  // Envío a Stripe Checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim() || !email.trim() || !email.includes("@")) {
      setError("Por favor completa tu nombre completo, teléfono y un correo electrónico válido.");
      return;
    }

    if (!selectedSlot) {
      setError("Por favor selecciona un horario disponible.");
      return;
    }

    if (bookedSlots.includes(selectedSlot)) {
      setError("El horario seleccionado ya no está disponible. Por favor elige otro horario.");
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
          topic: "Consulta General",
          description,
          scheduledDate: selectedDateString,
          timeSlot: selectedSlot,
          timeZone: "America/New_York",
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
    <div className="calendly-wrapper">
      {/* Columna Izquierda: Información de la Asesoría (Fija) */}
      <aside className="calendly-sidebar">
        <div>
          <span className="calendly-host-name">Miguel · CAMIKK Holdings</span>
          <h2 className="calendly-service-title">Asesoría Estratégica 1-a-1</h2>
        </div>

        <div className="calendly-meta-list">
          <div className="calendly-meta-item">
            <Clock3 size={18} />
            <span>45 minutos de sesión</span>
          </div>
          <div className="calendly-meta-item">
            <ShieldCheck size={18} />
            <span>USD $50 (Tarifa oficial única)</span>
          </div>
          <div className="calendly-meta-item">
            <Globe size={18} />
            <span>America/New_York (EST / EDT)</span>
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: 0 }}>
          Sesión individualizada para estructurar tu LLC, solicitud de EIN ante el IRS, apertura de cuentas bancarias en EE.UU. y cumplimiento tributario.
        </p>

        {selectedSlot && (
          <div className="calendly-selected-highlight">
            <span className="highlight-label">Horario seleccionado</span>
            <div className="highlight-val">
              {selectedWeekdayName}, {monthNames[currentMonth]} {selectedDay}, {currentYear}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#1d4ed8", marginTop: "2px" }}>
              {selectedSlot} (Hora New York)
            </div>
          </div>
        )}
      </aside>

      {/* Columna Derecha: Contenido Principal (Expansivo) */}
      <main className="calendly-main">
        {step === "datetime" ? (
          <div>
            <h3 className="calendly-main-title">Select Date & Time</h3>

            <div className="calendly-datetime-grid">
              {/* Columna Calendario */}
              <div className="calendly-calendar-col">
                <div className="calendly-month-nav">
                  <button
                    type="button"
                    className="calendly-circle-btn"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="calendly-month-label">
                    {monthNames[currentMonth]} {currentYear}
                  </div>
                  <button
                    type="button"
                    className="calendly-circle-btn"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Días de la semana */}
                <div className="calendly-weekdays-row">
                  {weekdayLabels.map((w) => (
                    <div key={w} className="calendly-weekday">
                      {w}
                    </div>
                  ))}
                </div>

                {/* Cuadrícula de días */}
                <div className="calendly-days-grid">
                  {monthData.days.map((dayNum, i) => {
                    if (dayNum === null) {
                      return <div key={`empty-${i}`} className="calendly-day-btn" />;
                    }

                    const available = isDayAvailable(dayNum);
                    const isSelected = selectedDay === dayNum;

                    return (
                      <button
                        key={`day-${dayNum}`}
                        type="button"
                        disabled={!available}
                        onClick={() => handleSelectDay(dayNum)}
                        className={`calendly-day-btn ${available ? "available" : ""} ${
                          isSelected ? "selected" : ""
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Zona Horaria */}
                <div className="calendly-timezone-box">
                  <span className="calendly-timezone-label">Time zone</span>
                  <div className="calendly-timezone-display">
                    <Globe size={16} style={{ color: "#64748b" }} />
                    <span>America/New_York (EST / EDT)</span>
                  </div>
                </div>
              </div>

              {/* Columna Horarios (Slots) con amplitud suficiente para evitar saltos de línea */}
              <div className="calendly-slots-col">
                <div className="calendly-slots-header">
                  <span className="calendly-slots-date-title">
                    {selectedWeekdayName}, {monthNames[currentMonth]} {selectedDay}
                  </span>
                  <span className="calendly-slots-duration">45 min / slot</span>
                </div>

                {loadingSlots ? (
                  <div style={{ padding: "30px 0", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                    Actualizando disponibilidad...
                  </div>
                ) : (
                  <div className="calendly-slots-list">
                    {ALL_TIME_SLOTS.map((slot) => {
                      const isBooked = bookedSlots.includes(slot);
                      const isSelected = selectedSlot === slot && !isBooked;

                      return (
                        <div key={slot} className="calendly-slot-item-group">
                          <button
                            type="button"
                            disabled={isBooked}
                            onClick={() => setSelectedSlot(slot)}
                            className={`calendly-slot-card ${isSelected ? "selected" : ""} ${
                              isBooked ? "disabled" : ""
                            }`}
                          >
                            <span>{slot}</span>
                            {isBooked && <span className="slot-occupied-tag">Ocupado</span>}
                          </button>

                          {/* Botón Siguiente exacto de Calendly al seleccionar un horario */}
                          {isSelected && (
                            <button
                              type="button"
                              className="calendly-slot-next-btn"
                              onClick={() => setStep("details")}
                            >
                              Siguiente
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Barra de confirmación rápida */}
                {selectedSlot && !bookedSlots.includes(selectedSlot) && (
                  <div className="calendly-continue-bar">
                    <button
                      type="button"
                      className="calendly-continue-cta"
                      onClick={() => setStep("details")}
                    >
                      <span>Continuar con las {selectedSlot}</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Paso 2: Datos de Contacto y Pago en USD */
          <div className="calendly-step2-wrapper">
            <button
              type="button"
              className="calendly-back-link"
              onClick={() => setStep("datetime")}
            >
              <ArrowLeft size={16} />
              <span>Volver a selección de horario</span>
            </button>

            <div className="calendly-step2-banner">
              <div className="calendly-step2-banner-info">
                <span className="calendly-step2-banner-label">Cita Seleccionada</span>
                <span className="calendly-step2-banner-val">
                  {selectedWeekdayName}, {monthNames[currentMonth]} {selectedDay}, {currentYear} a las {selectedSlot} (Hora New York)
                </span>
              </div>
              <div className="calendly-step2-price">
                <span className="calendly-step2-price-label">Tarifa Oficial</span>
                <div className="calendly-step2-price-val">$50 USD</div>
              </div>
            </div>

            <form onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="modal-name">
                    Nombre completo <span className="req">*</span>
                  </label>
                  <input
                    id="modal-name"
                    type="text"
                    required
                    placeholder="Ej. Carlos Mendoza"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-phone">
                    Teléfono / WhatsApp <span className="req">*</span>
                  </label>
                  <input
                    id="modal-phone"
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-email">
                  Correo electrónico <span className="req">*</span>
                </label>
                <input
                  id="modal-email"
                  type="email"
                  required
                  placeholder="carlos@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-desc">Cuéntanos brevemente sobre tu negocio o dudas (opcional)</label>
                <textarea
                  id="modal-desc"
                  rows={2}
                  placeholder="Detalles sobre tu proyecto, tipo de actividad o preguntas específicas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                />
              </div>

              {error && (
                <div className="form-error-alert" role="alert">
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button button-primary"
                  style={{ width: "100%", minHeight: "52px", fontSize: "16px", fontWeight: "800" }}
                >
                  <Lock size={18} />
                  <span>
                    {isSubmitting ? "Conectando con Stripe..." : "PAGAR $50 USD CON STRIPE Y CONFIRMAR"}
                  </span>
                </button>

                <div className="stripe-secure-badge">
                  <ShieldCheck size={16} style={{ color: "#2b8a3e" }} />
                  <span>Pago 100% en Dólares (USD). Redirección inmediata a tu confirmación.</span>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
