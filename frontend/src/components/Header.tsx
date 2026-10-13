"use client";

import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BRAND } from "@/data/brand";
import type { Language, Translation } from "@/locales";
import { BrandLogo } from "./BrandLogo";
import { CheckoutButton } from "./CheckoutButton";

const links = ["#que-incluye", "#como-funciona", "#resenas", "#preguntas"];

export function Header({ t, language, onLanguageChange }: { t: Translation; language: Language; onLanguageChange: (language: Language) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand-link" href="#top" aria-label={t.a11y.logo}><BrandLogo /></a>
        <nav className="desktop-nav" aria-label={t.a11y.mainNav}>
          {links.map((href, index) => <a href={href} key={href}>{t.nav[index]}</a>)}
        </nav>
        <div className="header-actions">
          <a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a>
          <div className="language-switch" role="group" aria-label={t.a11y.language}>
            <button type="button" aria-pressed={language === "es"} data-analytics="language-es-selected" onClick={() => onLanguageChange("es")}>ES</button>
            <span aria-hidden="true">|</span>
            <button type="button" aria-pressed={language === "en"} data-analytics="language-en-selected" onClick={() => onLanguageChange("en")}>EN</button>
          </div>
          <CheckoutButton label={t.cta.start} analytics="llc-checkout-disabled" className="header-cta" language={language} />
          <button type="button" className="menu-trigger icon-button" aria-label={menuOpen ? t.a11y.menuClose : t.a11y.menuOpen} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
      </div>
      {menuOpen && <nav className="mobile-nav" aria-label={t.a11y.mainNav}>
        <div className="container mobile-nav-inner">
          {links.map((href, index) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{t.nav[index]}<ArrowUpRight size={18} aria-hidden="true" /></a>)}
          <a className="mobile-nav-phone" href={BRAND.phoneHref}>{BRAND.phone}</a>
        </div>
      </nav>}
    </header>
  );
}
