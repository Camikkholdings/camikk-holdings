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
};

export function CheckoutButton({
  label,
  analytics,
  className = "",
  selection,
  onCheckout,
  disabled = false,
}: Props) {
  const router = useRouter();

  const handleClick = () => {
    if (disabled) return;
    if (onCheckout && selection) {
      onCheckout(selection);
      return;
    }
    const targetUrl = selection?.state
      ? `/comenzar-llc?state=${encodeURIComponent(selection.state)}`
      : "/comenzar-llc";
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
