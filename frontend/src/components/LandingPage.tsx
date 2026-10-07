"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "./Header";
import { ConsultationCalendarModal } from "./ConsultationCalendarModal";
import { StatePriceSelector } from "./StatePriceSelector";
import { ConsultationSection, DecisionPaths, FaqAccordion, FinalCta, Footer, GoogleReviews, Hero, IncludedServices, MobileConversionBar, ProcessSteps, TrustMetrics, WhyCamikk } from "./Sections";
import { getTranslation, type Language } from "@/locales";

export function LandingPage({ initialLanguage }: { initialLanguage: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [hydrated, setHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const t = getTranslation(language);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const urlLanguage = new URLSearchParams(window.location.search).get("lang");
      const stored = window.localStorage.getItem("camikk-language");
      if (urlLanguage === "en" || urlLanguage === "es") setLanguage(urlLanguage);
      else if (stored === "en" || stored === "es") setLanguage(stored);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = language;
    window.localStorage.setItem("camikk-language", language);
    document.title = t.metadata.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.metadata.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", t.metadata.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", t.metadata.description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", language === "es" ? "es_US" : "en_US");
    document.querySelector('meta[property="og:locale:alternate"]')?.setAttribute("content", language === "es" ? "en_US" : "es_US");
  }, [hydrated, language, t]);

  const changeLanguage = useCallback((next: Language) => {
    setLanguage(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", url);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const next = new URLSearchParams(window.location.search).get("lang");
      if (next === "es" || next === "en") setLanguage(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Efecto de aparición suave (fade-in-up scroll reveal) para las secciones
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const openConsultation = useCallback(() => setModalOpen(true), []);
  const closeConsultation = useCallback(() => setModalOpen(false), []);
  const sectionProps = { t, language, onConsult: openConsultation };

  return <>
    <a className="skip-link" href="#content">{t.a11y.skip}</a>
    <Header t={t} language={language} onLanguageChange={changeLanguage} />
    <main id="content">
      <Hero {...sectionProps} />
      <TrustMetrics {...sectionProps} />
      <DecisionPaths {...sectionProps} />
      <IncludedServices {...sectionProps} />
      <StatePriceSelector t={t} language={language} />
      <ProcessSteps {...sectionProps} />
      <WhyCamikk {...sectionProps} />
      <GoogleReviews {...sectionProps} />
      <ConsultationSection {...sectionProps} />
      <FaqAccordion {...sectionProps} />
      <FinalCta {...sectionProps} />
    </main>
    <Footer {...sectionProps} />
    <MobileConversionBar {...sectionProps} modalOpen={modalOpen} />
    <ConsultationCalendarModal open={modalOpen} onClose={closeConsultation} t={t} />
  </>;
}
