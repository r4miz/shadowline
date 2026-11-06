"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutGrid, LogOut, Menu, Plus, Settings, X } from "lucide-react";
import { BrandWordmark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShellCompany {
  id: string;
  name: string;
  status: string;
  monitoringActive: boolean;
  openAlerts: number;
}

interface ShellProps {
  companies: ShellCompany[];
  userEmail: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground/50",
  in_progress: "bg-warning",
  review: "bg-brand-accent",
  complete: "bg-success",
};

export function AppShell({ companies, userEmail, signOutAction, children }: ShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4 lg:px-5">
        <Link href="/app" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setOpen(false)}>
          <BrandWordmark className="text-base" />
        </Link>
        <button type="button" className="rounded-md p-2 text-muted-foreground lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}>
          <X className="size-5" />
        </button>
      </div>

      <div className="px-3">
        <NavLink href="/app" icon={LayoutGrid} active={pathname === "/app"} onClick={() => setOpen(false)}>
          Dashboard
        </NavLink>
        <NavLink href="/app/settings" icon={Settings} active={pathname.startsWith("/app/settings")} onClick={() => setOpen(false)}>
          Settings
        </NavLink>
      </div>

      <div className="mt-6 flex items-center justify-between px-5">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Companies</p>
        <Link href="/app/companies/new" className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" aria-label="New company" onClick={() => setOpen(false)}>
          <Plus className="size-4" />
        </Link>
      </div>
      <ul className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {companies.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted-foreground">No companies yet.</li>
        )}
        {companies.map((c) => {
          const active = pathname.startsWith(`/app/companies/${c.id}`);
          return (
            <li key={c.id}>
              <Link
                href={`/app/companies/${c.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-sidebar-accent font-medium text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
                )}
              >
                <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[c.status] ?? "bg-muted-foreground/50")} aria-hidden />
                <span className="truncate">{c.name}</span>
                {c.openAlerts > 0 && (
                  <span className="ml-auto rounded-full bg-brand-accent/15 px-1.5 font-mono text-[10px] font-medium text-brand-accent tabular">{c.openAlerts}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="truncate text-xs text-muted-foreground" title={userEmail}>{userEmail}</p>
        <form action={signOutAction} className="mt-2">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start px-2 text-muted-foreground">
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-dvh">{nav}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">{nav}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <button type="button" className="rounded-md p-2 text-muted-foreground" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <Link href="/app"><BrandWordmark className="text-sm" markClassName="size-5 text-foreground" /></Link>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, icon: Icon, active, children, onClick }: { href: string; icon: typeof Building2; active: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-sidebar-accent font-medium text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
