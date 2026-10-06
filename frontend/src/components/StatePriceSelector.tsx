"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import { CAMIKK_SERVICE_FEE, STATE_FEES, type StateName } from "@/data/stateFees";
import type { Language, Translation } from "@/locales";
import { CheckoutButton, type CheckoutSelection } from "./CheckoutButton";

export function StatePriceSelector({ t, language }: { t: Translation; language: Language }) {
  const [selected, setSelected] = useState<StateName | "">("");
  const money = useMemo(() => new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }), [language]);
  const stateFee = selected ? STATE_FEES[selected] : null;
  const selection: CheckoutSelection | null = selected && stateFee !== null ? { state: selected, stateFee, serviceFee: CAMIKK_SERVICE_FEE, total: CAMIKK_SERVICE_FEE + stateFee } : null;

  return (
    <section id="crear-llc" className="price-section section-space">
      <div className="container price-layout">
        <div className="price-intro">
          <p className="eyebrow eyebrow-brown">{t.price.eyebrow}</p>
          <h2>{t.price.title}</h2>
          <p className="lead">{t.price.intro}</p>
          <a className="text-link" href="#que-incluye">{t.nav[0]} <ArrowRight size={17} aria-hidden="true" /></a>
        </div>
        <div className="price-panel">
          <label htmlFor="state-select">{t.price.selectLabel}</label>
          <select id="state-select" value={selected} data-analytics="state-selector-selected" onChange={(event) => setSelected(event.target.value as StateName | "")}>
            <option value="">{t.price.placeholder}</option>
            {(Object.keys(STATE_FEES) as StateName[]).map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <div className="price-rows">
            <div><span>{t.price.service}</span><strong>{money.format(CAMIKK_SERVICE_FEE)}</strong></div>
            <div><span>{t.price.filing}</span><strong>{stateFee === null ? "—" : money.format(stateFee)}</strong></div>
          </div>
          <div className="price-total" aria-live="polite">
            <span>{t.price.total}</span><strong>{selection ? money.format(selection.total) : "—"}</strong>
          </div>
          {!selection && <p className="price-empty">{t.price.empty}</p>}
          <CheckoutButton
            label={selection ? `${t.cta.start} — ${money.format(selection.total)}` : t.cta.start}
            analytics="state-selector-checkout"
            selection={selection}
            className="full-width"
          />
          {process.env.NODE_ENV === "development" && <small className="dev-note">{t.price.technical}</small>}
          <p className="price-note"><Info size={16} aria-hidden="true" />{t.price.availability}</p>
          <p className="price-disclaimer">{t.price.disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
