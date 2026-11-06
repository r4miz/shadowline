"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StageKey } from "@/lib/company-context";

export function StageRail({ companyId, stages }: { companyId: string; stages: Array<{ key: StageKey; short: string; done: boolean }> }) {
  const pathname = usePathname();
  const base = `/app/companies/${companyId}`;
  return (
    <nav aria-label="Audit stages" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ol className="flex min-w-max items-center gap-1 border-b border-border">
        {stages.map((s, i) => {
          const href = s.key === "overview" ? base : `${base}/${s.key}`;
          const active = s.key === "overview" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={s.key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-1.5 px-2.5 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border font-mono text-[9px] tabular transition-colors",
                    s.done ? "border-success bg-success text-success-foreground" : active ? "border-foreground text-foreground" : "border-border text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {s.done ? <Check className="size-2.5" strokeWidth={3} /> : i}
                </span>
                <span className={cn(active && "font-medium")}>{s.short}</span>
                <span className={cn("absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground transition-opacity", active ? "opacity-100" : "opacity-0")} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
