"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3, Globe2, Headphones, MoveUpRight, Star } from "lucide-react";
import { BRAND } from "@/data/brand";
import type { Translation, Language } from "@/locales";
import { BrandLogo } from "./BrandLogo";
import { CheckoutButton } from "./CheckoutButton";

type Props = { t: Translation; language: Language; onConsult: () => void };

function ConsultButton({ children, onClick, analytics, className = "" }: { children: React.ReactNode; onClick: () => void; analytics: string; className?: string }) {
  return <button type="button" className={`button button-secondary ${className}`} onClick={onClick} data-analytics={analytics} data-calendar-action="consultation-calendar-open"><span>{children}</span><ArrowUpRight size={18} aria-hidden="true" /></button>;
}

export function Hero({ t, language, onConsult }: Props) {
  return <section className="hero" id="top">
    <Image className="hero-photo" src="/images/camikk-hero-bg.png" alt="" fill priority sizes="100vw" />
    <div className="hero-shade" />
    <div className="hero-ambient-glow" aria-hidden="true" />
    <div className="container hero-inner">
      <div className="hero-copy">
        <p className="eyebrow hero-eyebrow"><span className="eyebrow-line" />{t.hero.eyebrow}</p>
        <h1>{t.hero.title}</h1>
        <p className="hero-description">{t.hero.description}</p>
        <p className="hero-price">{t.hero.price}</p>
        <div className="hero-buttons">
          <CheckoutButton label={t.cta.start} analytics="hero-start-llc" language={language} />
          <ConsultButton onClick={onConsult} analytics="hero-book-consultation" className="hero-consult">{t.cta.questions}</ConsultButton>
        </div>
        <p className="hero-microcopy">{t.hero.microcopy}</p>
        <p className="hero-trust"><Globe2 size={16} aria-hidden="true" />{t.hero.trust}</p>
      </div>
    </div>
  </section>;
}

export function TrustMetrics({ t }: Props) {
  const numbers = ["8+", "1,000+", "250+"];
  return <section className="trust-strip reveal-on-scroll"><div className="container trust-grid">{t.metrics.map((metric, index) => <div className="trust-item" key={metric}><strong>{numbers[index]}</strong><span>{metric}</span></div>)}</div></section>;
}

export function DecisionPaths({ t, language, onConsult }: Props) {
  return <section className="paths-section section-space reveal-on-scroll"><div className="container">
    <div className="section-topline"><span className="section-index">01 / 05</span><span className="section-rule" /></div>
    <h2 className="paths-heading">{t.paths.title}</h2>
    <div className="paths-grid">
      <div className="path-card path-primary"><div className="path-icon"><MoveUpRight size={28} strokeWidth={1.4} aria-hidden="true" /></div><p className="eyebrow">{t.paths.first.eyebrow}</p><h3>{t.paths.first.title}</h3><p>{t.paths.first.body}</p><CheckoutButton label={t.cta.start} analytics="decision-start-llc" language={language} /></div>
      <div className="path-card path-secondary"><div className="path-icon"><Headphones size={27} strokeWidth={1.5} aria-hidden="true" /></div><p className="eyebrow eyebrow-brown">{t.paths.second.eyebrow}</p><h3>{t.paths.second.title}</h3><p>{t.paths.second.body}</p><div className="path-bottom"><strong>USD 50 · 45 min</strong><ConsultButton onClick={onConsult} analytics="decision-book-consultation">{t.cta.consult}</ConsultButton></div></div>
    </div>
  </div></section>;
}

export function IncludedServices({ t }: Props) {
  return <section className="included-section section-space reveal-on-scroll" id="que-incluye"><div className="container included-layout">
    <div className="included-intro"><p className="eyebrow eyebrow-brown">{t.included.eyebrow}</p><h2>{t.included.title}</h2><p className="lead">{t.included.intro}</p><div className="included-rule" /></div>
    <div className="included-list">{t.included.items.map((item, index) => <div className="included-row" key={item}><span className="included-number">{String(index + 1).padStart(2, "0")}</span><h3>{item}</h3><Check size={19} aria-hidden="true" /></div>)}<p className="included-note">{t.included.renewal}</p></div>
  </div></section>;
}

export function ProcessSteps({ t }: Props) {
  return <section className="process-section section-space reveal-on-scroll" id="como-funciona"><div className="container">
    <div className="section-heading-row"><div><p className="eyebrow eyebrow-brown">{t.process.eyebrow}</p><h2>{t.process.title}</h2></div><span className="large-section-number">02</span></div>
    <div className="process-grid">{t.process.steps.map((step, index) => <div className="process-step" key={step.title}><span className="step-number">0{index + 1}</span><span className="step-line" /><h3>{step.title}</h3><p>{step.body}</p></div>)}</div>
  </div></section>;
}

export function WhyCamikk({ t }: Props) {
  return <section className="why-section section-space reveal-on-scroll"><div className="container why-layout"><div><p className="eyebrow">{t.why.eyebrow}</p><h2>{t.why.title}</h2></div><div className="why-list">{t.why.items.map((item) => <div className="why-item" key={item}><Check size={19} aria-hidden="true" /><span>{item}</span></div>)}</div></div></section>;
}

export function GoogleReviews({ t, language }: Props) {
  const names = ["Maximo Garcia", "Karina Diaz", "clemente cabrera"];
  return <section className="reviews-section section-space reveal-on-scroll" id="resenas"><div className="container">
    <div className="reviews-head"><div><p className="eyebrow eyebrow-brown">{t.reviews.eyebrow}</p><h2>{t.reviews.title}</h2><p className="lead">{t.reviews.subtitle}</p></div><a href={BRAND.reviews} target="_blank" rel="noopener noreferrer nofollow" data-analytics="google-reviews-open" className="text-link">{t.reviews.link}<ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only">{t.a11y.external}</span></a></div>
    <div className="reviews-grid">{names.map((name, index) => <figure className="review-card" key={name}><div className="review-stars" aria-label="5/5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="currentColor" aria-hidden="true" />)}</div><blockquote>“{t.reviews.quotes[index]}”</blockquote><figcaption><span className="review-initials" aria-hidden="true">{name.split(" ").map(part => part[0].toUpperCase()).join("")}</span><span><strong>{name}</strong>{language === "en" && <small>{t.reviews.translated}</small>}</span></figcaption></figure>)}</div>
  </div></section>;
}

export function ConsultationSection({ t, onConsult }: Props) {
  return <section className="consult-section section-space reveal-on-scroll"><div className="container consult-layout"><div><p className="eyebrow">{t.consult.eyebrow}</p><h2>{t.consult.title}</h2><p className="lead">{t.consult.body}</p></div><div className="consult-action"><span className="consult-price">USD 50</span><span className="consult-duration"><Clock3 size={17} aria-hidden="true" />{t.consult.duration}</span><ConsultButton onClick={onConsult} analytics="consultation-calendar-open">{t.cta.consult}</ConsultButton></div></div></section>;
}

export function FaqAccordion({ t, onConsult }: Props) {
  return <section className="faq-section section-space reveal-on-scroll" id="preguntas"><div className="container faq-layout"><div className="faq-intro"><p className="eyebrow eyebrow-brown">{t.faq.eyebrow}</p><h2>{t.faq.title}</h2><ConsultButton onClick={onConsult} analytics="consultation-calendar-open">{t.cta.consult}</ConsultButton></div><div className="faq-list">{t.faq.items.map((item, index) => <details key={item.question}><summary><span className="faq-number">{String(index + 1).padStart(2, "0")}</span><span>{item.question}</span><ChevronDown size={20} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div></div></section>;
}

export function FinalCta({ t, language, onConsult }: Props) {
  return <section className="final-section section-space reveal-on-scroll"><div className="container final-inner"><p className="eyebrow eyebrow-brown">{t.final.eyebrow}</p><h2>{t.final.title}</h2><p className="lead">{t.final.body}</p><div className="final-actions"><CheckoutButton label={t.cta.final} analytics="final-start-llc" language={language} /><ConsultButton onClick={onConsult} analytics="final-book-consultation">{t.cta.consult}</ConsultButton></div></div></section>;
}

export function Footer({ t }: Props) {
  return <footer className="site-footer"><div className="container footer-main"><div className="footer-brand"><a href="#top" aria-label={t.a11y.logo}><BrandLogo className="brand-logo-large" /></a><p>{t.footer.tagline}</p></div><div className="footer-contact"><h2>{t.footer.contact}</h2><div><span>{t.footer.phone}</span><a href={BRAND.phoneHref}>{BRAND.phone}</a></div><div><span>{t.footer.email}</span><a href={BRAND.emailHref}>{BRAND.email}</a></div><div><span>{t.footer.website}</span><a href={BRAND.website} target="_blank" rel="noopener noreferrer">camikk.com <ArrowUpRight size={15} aria-hidden="true" /></a></div></div><div className="footer-address"><h2>{t.footer.address}</h2><p>{BRAND.address}</p><a href={BRAND.reviews} target="_blank" rel="noopener noreferrer nofollow">Google Maps <ArrowUpRight size={15} aria-hidden="true" /></a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} CAMIKK Holdings. {t.footer.rights}</span><div><a href={BRAND.privacy} target="_blank" rel="noopener noreferrer">{t.footer.privacy}</a><a href={BRAND.terms} target="_blank" rel="noopener noreferrer">{t.footer.terms}</a></div></div></footer>;
}

export function MobileConversionBar({ t, language, onConsult, modalOpen }: Props & { modalOpen: boolean }) {
  if (modalOpen) return null;
  return <div className="mobile-conversion-bar"><CheckoutButton label={t.cta.start} analytics="llc-checkout-disabled" language={language} /><button type="button" className="button mobile-question-button" onClick={onConsult} data-calendar-action="consultation-calendar-open" data-analytics="consultation-calendar-open">{t.cta.mobileQuestions}<ArrowRight size={17} aria-hidden="true" /></button></div>;
}
