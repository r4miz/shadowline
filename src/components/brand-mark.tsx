import { brand } from "@/lib/brand";

// Brand mark: a solid disc with a copper arc slipping out from behind it,
// the "shadow" made visible. Scales with currentColor; the arc is the accent.
export function BrandMark({ className, accentClassName }: { className?: string; accentClassName?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className} width="32" height="32">
      <circle cx="13" cy="17" r="10" fill="currentColor" />
      <path
        d="M19 7a10 10 0 0 1 0 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className={accentClassName ?? "text-brand-accent"}
      />
    </svg>
  );
}

export function BrandWordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrandMark className={markClassName ?? "size-6 text-foreground"} />
      <span className="font-heading text-[1.05em] font-semibold tracking-tight">{brand.name}</span>
    </span>
  );
}
