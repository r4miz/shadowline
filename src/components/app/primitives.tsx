import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page title block with a monospace eyebrow and optional actions. */
export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Section heading inside a page. */
export function SectionTitle({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A headline number. */
export function Stat({ label, value, hint, tone = "default", className }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "good" | "warn" | "bad" | "accent"; className?: string }) {
  const toneClass = {
    default: "text-foreground",
    good: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
    accent: "text-brand-accent",
  }[tone];
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-heading text-3xl font-semibold tabular leading-none", toneClass)}>{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Dashed empty state with one action. */
export function EmptyState({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="paper-grain flex flex-col items-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="font-heading text-base font-semibold">{title}</p>
      {body && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-border bg-card p-5 sm:p-6", className)}>{children}</div>;
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}

export function InlineNote({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" }) {
  const cls = {
    neutral: "border-border bg-secondary/60 text-foreground",
    good: "border-success/30 bg-success/5 text-foreground",
    warn: "border-warning/40 bg-warning/5 text-foreground",
  }[tone];
  return <p className={cn("rounded-md border px-3 py-2 text-sm", cls)}>{children}</p>;
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-secondary text-foreground" },
    in_progress: { label: "In progress", cls: "bg-warning/15 text-warning" },
    review: { label: "In review", cls: "bg-brand-accent/15 text-brand-accent" },
    complete: { label: "Complete", cls: "bg-success/15 text-success" },
  };
  const m = map[status] ?? { label: status, cls: "bg-secondary text-foreground" };
  return <span className={cn("inline-flex h-5 items-center rounded-full px-2 font-mono text-[11px] font-medium uppercase tracking-wide", m.cls)}>{m.label}</span>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "accent" }) {
  const cls = {
    neutral: "bg-secondary text-foreground",
    good: "bg-success/15 text-success",
    warn: "bg-warning/15 text-warning",
    bad: "bg-destructive/10 text-destructive",
    accent: "bg-brand-accent/15 text-brand-accent",
  }[tone];
  return <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium", cls)}>{children}</span>;
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "n/a";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "n/a";
  return new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
