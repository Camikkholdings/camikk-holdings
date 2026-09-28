import { ArrowUpRight } from "lucide-react";
import { ENABLE_LLC_CHECKOUT } from "@/data/brand";
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
};

export function CheckoutButton({ label, analytics, className = "", selection, onCheckout }: Props) {
  const disabled = !ENABLE_LLC_CHECKOUT || !selection || !onCheckout;

  // TODO: Wire this callback to a secure backend; recalculate fees there before creating a Stripe session.
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
      onClick={() => {
        if (!disabled && selection) onCheckout?.(selection);
      }}
    >
      <span>{label}</span><ArrowUpRight aria-hidden="true" size={18} />
    </button>
  );
}
