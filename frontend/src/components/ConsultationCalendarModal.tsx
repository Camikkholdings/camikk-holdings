"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Translation } from "@/locales";

type Props = { open: boolean; onClose: () => void; t: Translation };

const LEADCONNECTOR_BOOKING_URL = "https://api.leadconnectorhq.com/widget/booking/hHJcb7fWgRkuEwZHMDQr";

export function ConsultationCalendarModal({ open, onClose, t }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    openerRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    // Inyectar script oficial de LeadConnector para auto-resize y postMessage handling
    const scriptId = "leadconnector-form-embed-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://link.msgsndr.com/js/form_embed.js";
      script.type = "text/javascript";
      script.async = true;
      document.body.appendChild(script);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        ) ?? []
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="calendar-dialog leadconnector-modal-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Agendar Consulta Empresarial"
      >
        <button
          ref={closeRef}
          className="calendly-modal-close-btn"
          type="button"
          aria-label={t.a11y.closeModal}
          data-analytics="consultation-calendar-close"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {isLoading && (
          <div className="leadconnector-loading-spinner">
            <Loader2 size={36} className="animate-spin text-petrol" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--petrol)" }}>
              Cargando calendario de citas...
            </p>
          </div>
        )}

        <iframe
          src={LEADCONNECTOR_BOOKING_URL}
          style={{
            width: "100%",
            border: "none",
            minHeight: "720px",
            height: "100%",
            display: isLoading ? "none" : "block",
            borderRadius: "20px",
            flex: 1,
          }}
          scrolling="no"
          id="hHJcb7fWgRkuEwZHMDQr_modal"
          title="Agendar Consulta Empresarial"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
