"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { X } from "lucide-react";
import { BRAND } from "@/data/brand";
import type { Translation } from "@/locales";

type Props = { open: boolean; onClose: () => void; t: Translation };

export function ConsultationCalendarModal({ open, onClose, t }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href], iframe, [tabindex]:not([tabindex='-1'])") ?? []);
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
      setLoaded(false);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="calendar-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="calendar-title" aria-describedby="calendar-description">
        <div className="calendar-heading">
          <div>
            <p className="eyebrow eyebrow-brown">{t.modal.eyebrow}</p>
            <h2 id="calendar-title">{t.modal.title}</h2>
            <p id="calendar-description">{t.modal.body}</p>
          </div>
          <button ref={closeRef} className="icon-button" type="button" aria-label={t.a11y.closeModal} data-analytics="consultation-calendar-close" onClick={onClose}><X size={22} /></button>
        </div>
        {!loaded && <p className="calendar-loading" role="status">{t.modal.loading}</p>}
        <iframe
          src={BRAND.calendar}
          id="hHJcb7fWgRkuEwZHMDQr_1790615099448"
          title={t.a11y.calendar}
          allow="payment"
          scrolling="no"
          onLoad={() => setLoaded(true)}
        />
        <Script src="https://link.msgsndr.com/js/form_embed.js" strategy="afterInteractive" />
      </div>
    </div>
  );
}
