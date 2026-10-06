import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-logo ${className}`}>
      <Image src="/images/camikk-logo.png" alt="CAMIKK HOLDINGS" width={1024} height={1024} priority />
    </span>
  );
}
