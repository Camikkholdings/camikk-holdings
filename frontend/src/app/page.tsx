import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";
import { BRAND } from "@/data/brand";
import { getTranslation, type Language } from "@/locales";

type Props = { searchParams: Promise<{ lang?: string | string[] }> };

function languageFromParam(value?: string | string[]): Language {
  return value === "en" ? "en" : "es";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const language = languageFromParam((await searchParams).lang);
  const t = getTranslation(language);
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    title: t.metadata.title,
    description: t.metadata.description,
    ...(base ? { metadataBase: new URL(base) } : {}),
    ...(base ? { alternates: { canonical: base } } : {}),
    openGraph: {
      title: t.metadata.title,
      description: t.metadata.description,
      type: "website",
      locale: language === "es" ? "es_US" : "en_US",
      alternateLocale: language === "es" ? ["en_US"] : ["es_US"],
      ...(base ? { images: [{ url: "/images/camikk-logo.png", width: 1024, height: 1024, alt: BRAND.name }] } : {}),
    },
  };
}

export default async function Home({ searchParams }: Props) {
  const language = languageFromParam((await searchParams).lang);
  const structuredData = [
    {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.website,
      email: BRAND.email,
      telephone: BRAND.phone,
      logo: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/images/camikk-logo.png` : undefined,
      address: { "@type": "PostalAddress", streetAddress: "101 Hamilton St. Suite 351", addressLocality: "Allentown", addressRegion: "PA", postalCode: "18101", addressCountry: "US" },
    },
    {
      "@type": "Service",
      name: language === "es" ? "Creación de LLC en Estados Unidos" : "U.S. LLC formation",
      provider: { "@type": "Organization", name: BRAND.name, url: BRAND.website },
      serviceType: "LLC formation",
      areaServed: { "@type": "Country", name: "United States" },
    },
  ];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": structuredData }).replace(/</g, "\\u003c") }} />
    <LandingPage initialLanguage={language} />
  </>;
}
