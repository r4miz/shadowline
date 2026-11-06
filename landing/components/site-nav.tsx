"use client";

import { useEffect, useState } from "react";
import { site } from "@/site.config";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#how", label: "How it works" },
  { href: "#deliverables", label: "What you get" },
  { href: "#faq", label: "Questions" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-colors ${scrolled ? "border-b border-line bg-paper/90 backdrop-blur" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-heading text-lg font-semibold tracking-tight">{site.name}</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-ink-2 transition-colors hover:text-ink">{l.label}</a>
          ))}
          <a href="#contact" className="inline-flex h-9 items-center rounded-md bg-ink px-4 text-sm font-semibold text-paper transition-colors hover:bg-ink-2">Get the free scan</a>
        </nav>
        <button type="button" className="rounded-md p-2 md:hidden" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          <span className="block h-0.5 w-5 bg-ink" />
          <span className="mt-1.5 block h-0.5 w-5 bg-ink" />
        </button>
      </div>
      {open && (
        <nav className="border-t border-line bg-paper px-5 py-4 md:hidden" aria-label="Mobile">
          <ul className="space-y-3">
            {LINKS.map((l) => (
              <li key={l.href}><a href={l.href} onClick={() => setOpen(false)} className="block py-1 text-base">{l.label}</a></li>
            ))}
            <li><a href="#contact" onClick={() => setOpen(false)} className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md bg-ink text-sm font-semibold text-paper">Get the free scan</a></li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <circle cx="13" cy="17" r="10" fill="currentColor" />
      <path d="M19 7a10 10 0 0 1 0 20" stroke="#B5522A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
