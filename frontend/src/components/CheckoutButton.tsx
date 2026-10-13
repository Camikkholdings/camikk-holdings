"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import type { StateName } from "@/data/stateFees";

export type CheckoutSelection = {
  state: StateName;
  stateFee: number;
  serviceFee: number;
  total: number;
};

type Props = {
  label: string;
  analytics: string;
  className?: string;
  selection?: CheckoutSelection | null;
  onCheckout?: (selection: CheckoutSelection) => void;
  disabled?: boolean;
  language?: "es" | "en";
};

export function CheckoutButton({
  label,
  analytics,
  className = "",
  selection,
  onCheckout,
  disabled = false,
  language,
}: Props) {
  const router = useRouter();

  const handleClick = () => {
    if (disabled) return;
    if (onCheckout && selection) {
      onCheckout(selection);
      return;
    }
    const activeLang =
      language ||
      (typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("lang") as "es" | "en") ||
          (window.localStorage.getItem("camikk-language") as "es" | "en")
        : null) ||
      "es";

    if (typeof window !== "undefined") {
      window.localStorage.setItem("camikk-language", activeLang);
    }

    const params = new URLSearchParams();
    if (selection?.state) params.set("state", selection.state);
    if (activeLang) params.set("lang", activeLang);

    const targetUrl = `/comenzar-llc?${params.toString()}`;
    router.push(targetUrl);
  };

  return (
    <button
      type="button"
      className={`button button-primary ${className}`}
      disabled={disabled}
      aria-disabled={disabled}
      data-integration="llc-checkout"
      data-analytics={analytics}
      data-checkout-state={selection?.state ?? ""}
      data-checkout-total={selection?.total ?? ""}
      data-checkout-status={disabled ? "llc-checkout-disabled" : "ready"}
      onClick={handleClick}
    >
      <span>{label}</span>
      <ArrowUpRight aria-hidden="true" size={18} />
    </button>
  );
}
