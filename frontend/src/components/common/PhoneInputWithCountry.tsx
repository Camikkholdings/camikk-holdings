"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

export interface CountryOption {
  code: string;
  dialCode: string;
  nameEs: string;
  nameEn: string;
  flag: string;
  placeholder: string;
}

export const COUNTRIES: CountryOption[] = [
  // Prioritarios: EE.UU. (Default), Puerto Rico, Canadá, y toda Latinoamérica
  { code: "US", dialCode: "+1", nameEs: "Estados Unidos", nameEn: "United States", flag: "🇺🇸", placeholder: "(330) 449-1683" },
  { code: "PR", dialCode: "+1", nameEs: "Puerto Rico", nameEn: "Puerto Rico", flag: "🇵🇷", placeholder: "(787) 123-4567" },
  { code: "CA", dialCode: "+1", nameEs: "Canadá", nameEn: "Canada", flag: "🇨🇦", placeholder: "(416) 123-4567" },
  { code: "MX", dialCode: "+52", nameEs: "México", nameEn: "Mexico", flag: "🇲🇽", placeholder: "55 1234 5678" },
  { code: "CO", dialCode: "+57", nameEs: "Colombia", nameEn: "Colombia", flag: "🇨🇴", placeholder: "300 123 4567" },
  { code: "ES", dialCode: "+34", nameEs: "España", nameEn: "Spain", flag: "🇪🇸", placeholder: "612 345 678" },
  { code: "AR", dialCode: "+54", nameEs: "Argentina", nameEn: "Argentina", flag: "🇦🇷", placeholder: "11 1234-5678" },
  { code: "CL", dialCode: "+56", nameEs: "Chile", nameEn: "Chile", flag: "🇨🇱", placeholder: "9 1234 5678" },
  { code: "PE", dialCode: "+51", nameEs: "Perú", nameEn: "Peru", flag: "🇵🇪", placeholder: "912 345 678" },
  { code: "VE", dialCode: "+58", nameEs: "Venezuela", nameEn: "Venezuela", flag: "🇻🇪", placeholder: "412 123 4567" },
  { code: "EC", dialCode: "+593", nameEs: "Ecuador", nameEn: "Ecuador", flag: "🇪🇨", placeholder: "99 123 4567" },
  { code: "DO", dialCode: "+1", nameEs: "República Dominicana", nameEn: "Dominican Republic", flag: "🇩🇴", placeholder: "(809) 123-4567" },
  { code: "PA", dialCode: "+507", nameEs: "Panamá", nameEn: "Panama", flag: "🇵🇦", placeholder: "6123-4567" },
  { code: "CR", dialCode: "+506", nameEs: "Costa Rica", nameEn: "Costa Rica", flag: "🇨🇷", placeholder: "8123-4567" },
  { code: "GT", dialCode: "+502", nameEs: "Guatemala", nameEn: "Guatemala", flag: "🇬🇹", placeholder: "5123 4567" },
  { code: "HN", dialCode: "+504", nameEs: "Honduras", nameEn: "Honduras", flag: "🇭🇳", placeholder: "9123 4567" },
  { code: "SV", dialCode: "+503", nameEs: "El Salvador", nameEn: "El Salvador", flag: "🇸🇻", placeholder: "7123 4567" },
  { code: "NI", dialCode: "+505", nameEs: "Nicaragua", nameEn: "Nicaragua", flag: "🇳🇮", placeholder: "8123 4567" },
  { code: "BO", dialCode: "+591", nameEs: "Bolivia", nameEn: "Bolivia", flag: "🇧🇴", placeholder: "7123 4567" },
  { code: "PY", dialCode: "+595", nameEs: "Paraguay", nameEn: "Paraguay", flag: "🇵🇾", placeholder: "981 123456" },
  { code: "UY", dialCode: "+598", nameEs: "Uruguay", nameEn: "Uruguay", flag: "🇺🇾", placeholder: "91 234 567" },
  { code: "BR", dialCode: "+55", nameEs: "Brasil", nameEn: "Brazil", flag: "🇧🇷", placeholder: "(11) 91234-5678" },

  // Europa y resto del mundo
  { code: "GB", dialCode: "+44", nameEs: "Reino Unido", nameEn: "United Kingdom", flag: "🇬🇧", placeholder: "7123 456789" },
  { code: "FR", dialCode: "+33", nameEs: "Francia", nameEn: "France", flag: "🇫🇷", placeholder: "6 12 34 56 78" },
  { code: "DE", dialCode: "+49", nameEs: "Alemania", nameEn: "Germany", flag: "🇩🇪", placeholder: "151 12345678" },
  { code: "IT", dialCode: "+39", nameEs: "Italia", nameEn: "Italy", flag: "🇮🇹", placeholder: "312 345 6789" },
  { code: "PT", dialCode: "+351", nameEs: "Portugal", nameEn: "Portugal", flag: "🇵🇹", placeholder: "912 345 678" },
  { code: "CH", dialCode: "+41", nameEs: "Suiza", nameEn: "Switzerland", flag: "🇨🇭", placeholder: "78 123 45 67" },
  { code: "NL", dialCode: "+31", nameEs: "Países Bajos", nameEn: "Netherlands", flag: "🇳🇱", placeholder: "6 12345678" },
  { code: "BE", dialCode: "+32", nameEs: "Bélgica", nameEn: "Belgium", flag: "🇧🇪", placeholder: "470 12 34 56" },
  { code: "SE", dialCode: "+46", nameEs: "Suecia", nameEn: "Sweden", flag: "🇸🇪", placeholder: "70 123 45 67" },
  { code: "NO", dialCode: "+47", nameEs: "Noruega", nameEn: "Norway", flag: "🇳🇴", placeholder: "412 34 567" },
  { code: "AU", dialCode: "+61", nameEs: "Australia", nameEn: "Australia", flag: "🇦🇺", placeholder: "412 345 678" },
  { code: "NZ", dialCode: "+64", nameEs: "Nueva Zelanda", nameEn: "New Zealand", flag: "🇳🇿", placeholder: "21 123 4567" },
  { code: "IN", dialCode: "+91", nameEs: "India", nameEn: "India", flag: "🇮🇳", placeholder: "98765 43210" },
  { code: "CN", dialCode: "+86", nameEs: "China", nameEn: "China", flag: "🇨🇳", placeholder: "138 1234 5678" },
  { code: "JP", dialCode: "+81", nameEs: "Japón", nameEn: "Japan", flag: "🇯🇵", placeholder: "90-1234-5678" },
  { code: "KR", dialCode: "+82", nameEs: "Corea del Sur", nameEn: "South Korea", flag: "🇰🇷", placeholder: "10-1234-5678" },
  { code: "AE", dialCode: "+971", nameEs: "Emiratos Árabes", nameEn: "United Arab Emirates", flag: "🇦🇪", placeholder: "50 123 4567" },
  { code: "SA", dialCode: "+966", nameEs: "Arabia Saudita", nameEn: "Saudi Arabia", flag: "🇸🇦", placeholder: "50 123 4567" },
  { code: "IL", dialCode: "+972", nameEs: "Israel", nameEn: "Israel", flag: "🇮🇱", placeholder: "50-123-4567" },
  { code: "TR", dialCode: "+90", nameEs: "Turquía", nameEn: "Turkey", flag: "🇹🇷", placeholder: "512 345 67 89" },
  { code: "ZA", dialCode: "+27", nameEs: "Sudáfrica", nameEn: "South Africa", flag: "🇿🇦", placeholder: "71 123 4567" },
];

export interface PhoneInputWithCountryProps {
  id?: string;
  value: string;
  onChange: (fullPhoneNumber: string) => void;
  required?: boolean;
  language?: "es" | "en";
  className?: string;
  disabled?: boolean;
}

export function PhoneInputWithCountry({
  id = "phone-input",
  value = "",
  onChange,
  required = false,
  language = "es",
  className = "",
  disabled = false,
}: PhoneInputWithCountryProps) {
  // País inicial: Estados Unidos (+1) por defecto
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  // Inicializar o sincronizar si value cambia externamente
  useEffect(() => {
    if (!value) {
      setLocalNumber("");
      return;
    }

    const trimmed = value.trim();
    if (trimmed.startsWith("+")) {
      // Buscar si coincide con algún prefijo conocido
      // Ordenamos por longitud descendente para que +593 gane a +59
      const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matched = sorted.find((c) => trimmed.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        const rest = trimmed.slice(matched.dialCode.length).trim();
        setLocalNumber(rest);
        return;
      }
    }

    // Si no tiene prefijo explícito o es el mismo, lo tratamos como número local
    setLocalNumber(trimmed);
  }, [value]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus en el buscador al abrir
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        numberInputRef.current?.focus();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Lista filtrada por búsqueda
  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) return COUNTRIES;
    const term = searchTerm.toLowerCase().trim();
    return COUNTRIES.filter((c) => {
      const name = (language === "en" ? c.nameEn : c.nameEs).toLowerCase();
      const code = c.code.toLowerCase();
      const dial = c.dialCode.toLowerCase();
      return name.includes(term) || code.includes(term) || dial.includes(term);
    });
  }, [searchTerm, language]);

  // Notificar cambios al padre
  const notifyChange = (country: CountryOption, rawLocal: string) => {
    const cleanLocal = rawLocal.trim();
    if (!cleanLocal) {
      onChange("");
    } else {
      onChange(`${country.dialCode} ${cleanLocal}`);
    }
  };

  const handleSelectCountry = (country: CountryOption) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm("");
    notifyChange(country, localNumber);
    numberInputRef.current?.focus();
  };

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // Si el usuario pega o escribe un número con "+" (ej. "+57 300 123 4567")
    if (rawVal.trim().startsWith("+")) {
      const trimmed = rawVal.trim();
      const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matched = sorted.find((c) => trimmed.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        const rest = trimmed.slice(matched.dialCode.length).trim();
        setLocalNumber(rest);
        notifyChange(matched, rest);
        return;
      }
    }

    setLocalNumber(rawVal);
    notifyChange(selectedCountry, rawVal);
  };

  return (
    <div ref={containerRef} className={`phone-with-country-wrapper ${className}`} style={{ position: "relative", width: "100%" }}>
      <div
        className="phone-input-container"
        style={{
          display: "flex",
          alignItems: "stretch",
          width: "100%",
          border: "1px solid rgba(0, 35, 48, 0.22)",
          borderRadius: "9px",
          background: "#ffffff",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          overflow: "visible",
        }}
      >
        {/* Selector de País (Botón Trigger) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="phone-prefix-btn"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={language === "en" ? "Select country code" : "Seleccionar código de país"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 12px",
            background: "#f8fafc",
            border: "none",
            borderRight: "1px solid rgba(0, 35, 48, 0.16)",
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: 600,
            color: "#0f172a",
            flexShrink: 0,
            userSelect: "none",
            transition: "background 0.15s ease",
            minWidth: "96px",
            justifyContent: "space-between",
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = "#f1f5f9";
          }}
          onMouseLeave={(e) => {
            if (!disabled) e.currentTarget.style.background = "#f8fafc";
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "17px", lineHeight: 1 }} aria-hidden="true">
              {selectedCountry.flag}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
              {selectedCountry.dialCode}
            </span>
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: "#64748b",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Input del Número Local */}
        <input
          ref={numberInputRef}
          id={id}
          type="tel"
          required={required}
          disabled={disabled}
          placeholder={`Ej. ${selectedCountry.placeholder}`}
          value={localNumber}
          onChange={handleLocalNumberChange}
          className="phone-number-input"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            boxShadow: "none",
            padding: "12px 14px",
            fontSize: "14px",
            color: "var(--ink, #002330)",
            background: "transparent",
            borderRadius: "0 8px 8px 0",
          }}
        />
      </div>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div
          className="phone-country-dropdown"
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 9999,
            width: "320px",
            maxWidth: "92vw",
            background: "#ffffff",
            border: "1px solid rgba(0, 35, 48, 0.16)",
            borderRadius: "12px",
            boxShadow: "0 18px 45px rgba(0, 35, 48, 0.18)",
            padding: "8px",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {/* Campo de Búsqueda */}
          <div style={{ position: "relative", marginBottom: "8px" }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === "en" ? "Search country or prefix..." : "Buscar país o prefijo..."}
              style={{
                width: "100%",
                padding: "8px 12px 8px 30px",
                fontSize: "13px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                outline: "none",
                background: "#f8fafc",
                color: "#0f172a",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--orange, #ffae00)";
                e.target.style.background = "#ffffff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#cbd5e1";
                e.target.style.background = "#f8fafc";
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="2.5"
              style={{ position: "absolute", left: "9px", top: "10px" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Lista de Países */}
          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {filteredCountries.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
                {language === "en" ? "No countries found" : "No se encontraron países"}
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = selectedCountry.code === country.code;
                const countryName = language === "en" ? country.nameEn : country.nameEs;

                return (
                  <button
                    key={`${country.code}-${country.dialCode}`}
                    type="button"
                    onClick={() => handleSelectCountry(country)}
                    role="option"
                    aria-selected={isSelected}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "7px",
                      border: "none",
                      background: isSelected ? "rgba(255, 174, 0, 0.12)" : "transparent",
                      color: isSelected ? "var(--petrol, #002330)" : "#1e293b",
                      fontSize: "13px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      <span style={{ fontSize: "17px", lineHeight: 1 }}>{country.flag}</span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "185px" }}>
                        {countryName}
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: isSelected ? "var(--brown, #a44a1f)" : "#64748b",
                        marginLeft: "8px",
                      }}
                    >
                      {country.dialCode}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
