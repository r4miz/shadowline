"use client";

import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Shared motion primitives. Every entrance is a transform/opacity change, 400 to
// 600 ms, eased out, triggered once when scrolled into view. With reduced
// motion enabled everything renders in its final state immediately.

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({ children, delay = 0, className, as = "div", y = 24 }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" | "p" | "h2" | "h3" | "span"; y?: number }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.6, delay, ease }}
    >
      {children}
    </Comp>
  );
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? undefined : stagger} initial={reduce ? false : "hidden"} whileInView="show" viewport={{ once: true, margin: "-10% 0px" }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp className={className} variants={reduce ? undefined : item}>
      {children}
    </Comp>
  );
}

/** Counts up to `value` once visible. Renders the final value immediately under reduced motion. */
export function CountUp({ value, suffix = "", prefix = "", duration = 1.2, className }: { value: number; suffix?: string; prefix?: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{n.toLocaleString("en-US")}{suffix}
    </span>
  );
}
