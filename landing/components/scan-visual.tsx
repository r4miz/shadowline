"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

// The hero visual: a "radar sweep" over a company's connected apps that reveals
// the AI ones one by one. Pure SVG + motion, no assets. Fictional names.

const APPS = [
  { name: "Zoom", ai: false, x: 22, y: 30 },
  { name: "ChatGPT", ai: true, x: 62, y: 22, users: 14, risk: "personal accounts" },
  { name: "DocuSign", ai: false, x: 80, y: 48 },
  { name: "Otter.ai", ai: true, x: 40, y: 58, users: 3, risk: "records client calls" },
  { name: "Slack", ai: false, x: 18, y: 72 },
  { name: "AI Sidebar", ai: true, x: 70, y: 76, users: 1, risk: "reads email" },
  { name: "Canva", ai: false, x: 48, y: 86 },
  { name: "Claude", ai: true, x: 86, y: 24, users: 2, risk: "personal accounts" },
];

export function ScanVisual() {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(reduce ? APPS.length : 0);

  useEffect(() => {
    if (reduce) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= APPS.length) clearInterval(id);
    }, 420);
    return () => clearInterval(id);
  }, [reduce]);

  const aiFound = APPS.slice(0, revealed).filter((a) => a.ai).length;

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl select-none" aria-label="Illustration: a scan of connected apps that highlights the AI tools" role="img">
      <div className="absolute inset-0 rounded-2xl border border-line bg-white shadow-[0_30px_60px_-30px_rgba(22,26,23,0.35)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="eyebrow">Workspace scan · Northwind Dental (fictional)</span>
          <span className="eyebrow tabular text-copper">{aiFound} AI apps found</span>
        </div>
        <svg viewBox="0 0 100 100" className="absolute inset-x-0 bottom-0 top-10 h-[calc(100%-2.5rem)] w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <radialGradient id="sweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1f4d3a" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#1f4d3a" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[20, 36, 52].map((r) => (
            <circle key={r} cx="50" cy="52" r={r} fill="none" stroke="#ddd6ca" strokeWidth="0.3" />
          ))}
          <line x1="0" y1="52" x2="100" y2="52" stroke="#ddd6ca" strokeWidth="0.3" />
          <line x1="50" y1="4" x2="50" y2="100" stroke="#ddd6ca" strokeWidth="0.3" />
          {!reduce && (
            <motion.g style={{ originX: "50px", originY: "52px" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 6, ease: "linear" }}>
              <path d="M50 52 L50 0 A50 50 0 0 1 93 27 Z" fill="url(#sweep)" />
              <line x1="50" y1="52" x2="50" y2="0" stroke="#1f4d3a" strokeWidth="0.5" strokeOpacity="0.5" />
            </motion.g>
          )}
        </svg>
        {APPS.map((a, i) => {
          const shown = i < revealed;
          return (
            <motion.div
              key={a.name}
              className="absolute"
              style={{ left: `${a.x}%`, top: `calc(2.5rem + ${a.y}% * 0.9)` }}
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              animate={shown ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`-translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-[11px] font-medium shadow-sm ${a.ai ? "border-copper bg-copper text-white" : "border-line bg-paper text-ink-2"}`}>
                {a.name}
                {a.ai && a.users && <span className="ml-1.5 font-mono text-[10px] opacity-90 tabular">{a.users}</span>}
              </div>
              {a.ai && shown && (
                <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="-translate-x-1/2 mt-1 whitespace-nowrap text-center font-mono text-[9px] uppercase tracking-wider text-moss">
                  {a.risk}
                </motion.p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
