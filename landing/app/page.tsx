import { ArrowRight, Check, Eye, FileText, Lock, Mail, MapPin, Phone, ScrollText, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { site } from "@/site.config";
import { SiteNav, Mark } from "@/components/site-nav";
import { ScanVisual } from "@/components/scan-visual";
import { ContactForm } from "@/components/contact-form";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/motion";

const PROBLEMS = [
  {
    title: "Personal accounts, company data",
    body: "Most staff who use ChatGPT or Claude at work signed up with a personal email. The company cannot see what goes in, cannot set rules, and cannot shut the account off when someone leaves.",
  },
  {
    title: "Client records in a chatbot",
    body: "Pasting a patient note, an invoice or a contract into a free AI tool feels harmless. On a consumer plan that text can be kept, reviewed and used to train models. For regulated data that is a reportable problem.",
  },
  {
    title: "Bots that join your meetings",
    body: "AI note-takers quietly join calls and record everyone, including clients who never agreed. They also sit on your calendar with access to every invite.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Free scan",
    time: "One click from your admin",
    body: "Your Google Workspace or Microsoft 365 admin approves read-only access once. We list every third-party app connected to work accounts and flag the AI ones, with what each can reach: email, files, calendars, meetings. You see the count and the risk before you spend anything.",
  },
  {
    n: "02",
    title: "The audit",
    time: "About one week",
    body: "Three sources, one picture. A thirteen-question anonymous survey of your staff. A scan of your card statements for AI subscriptions. A review of the connected apps. Every risk is scored the same way, so two companies with the same facts get the same answer.",
  },
  {
    n: "03",
    title: "Policy and platform",
    time: "Delivered with the report",
    body: "An Acceptable Use Policy written for your company and your tools, not a template. A recommendation for the one team AI plan your staff should run on, with reasons and dated prices. Then a sign-off link so every employee reads and confirms the policy.",
  },
  {
    n: "04",
    title: "Monitoring",
    time: "Monthly",
    body: "New AI app connected to a work account: you hear about it. New hire: they get the policy to sign. Every quarter staff are re-surveyed so the picture stays current. The subscription is priced per employee and can stop any time.",
  },
];

const DELIVERABLES = [
  { icon: FileText, title: "AI Risk Report", body: "Opens with the short version an owner can repeat in a meeting. Evidence tables, scored findings and a Now, Next, Later roadmap follow." },
  { icon: ScrollText, title: "Acceptable Use Policy", body: "Thirteen sections, pre-filled from your audit: approved tools, blocked uses, data rules, incident reporting, who owns it." },
  { icon: Sparkles, title: "Platform Recommendation", body: "ChatGPT Business, Claude Team, Microsoft 365 Copilot or Gemini in Workspace. Ranked for your suite, your data and what staff already know." },
  { icon: Users, title: "Executive Readout", body: "One page: where you stand, the numbers that matter, the three things to do first." },
  { icon: Check, title: "Sign-off tracking", body: "Every employee gets a link to read and confirm the policy. You see who has signed, who is pending and who is overdue." },
  { icon: Search, title: "The inventory", body: "Every AI tool in use, how many people use it, through which accounts, and what data it has touched. Kept current by monitoring." },
];

const AUDIENCES = ["Dental and medical practices", "Law and accounting firms", "Agencies and consultancies", "Construction and trades", "Real estate and property", "Nonprofits and associations"];

const PRINCIPLES = [
  { icon: Eye, title: "Read only", body: "We never change, send or delete anything in your systems. Access can be revoked by your admin in one click." },
  { icon: Lock, title: "Anonymous by design", body: "The staff survey has no login and records nothing about who answered. Individual answers are never shown, only totals, and free-text comments appear only once at least five people have responded." },
  { icon: ShieldCheck, title: "Same facts, same answer", body: "Risk is scored by fixed rules, not by an AI model guessing. Every rating can be traced back to a specific answer or app." },
  { icon: Sparkles, title: "No vendor money", body: "We recommend the platform that fits you. We take no referral fees and sell no software." },
];

const FAQ = [
  {
    q: "Do you install anything on our computers?",
    a: "No. The scan reads your Google Workspace or Microsoft 365 admin data through an approved, read-only connection. The survey is a web link. Nothing runs on laptops or phones.",
  },
  {
    q: "Can you see what people actually type into ChatGPT?",
    a: "No, and we would not want to. The scan sees which apps are connected to work accounts and what access they were granted. The survey asks staff, anonymously, what kinds of information they have used. Together that gives an honest picture without surveillance.",
  },
  {
    q: "Our staff will not admit to using AI.",
    a: "They do when it is anonymous and the question is framed as helping the company pick a tool rather than catching anyone. Response rates in the sixties and seventies are typical when the owner sends the link with a short note.",
  },
  {
    q: "Which AI platform will you recommend?",
    a: "It depends on four things: whether you run on Google Workspace or Microsoft 365, what your staff already use, whether you handle regulated data, and your headcount. We rank the options and show the reasoning. We have no financial relationship with any vendor.",
  },
  {
    q: "What does it cost?",
    a: "The scan is free. The audit is a one-time fee priced per employee, with a minimum for very small teams. Monitoring is a monthly subscription, also per employee. We quote after the free scan, when we know your headcount and setup.",
  },
  {
    q: "Is this legal advice?",
    a: "No. The report and policy are practical governance documents that reference recognized frameworks (NIST AI RMF 1.0 and the OWASP Top 10 for LLM Applications 2025). Regulatory obligations should be confirmed with qualified counsel, and we say so on every document.",
  },
];

export default function Home() {
  return (
    <div id="top" className="min-h-dvh">
      <SiteNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="grain pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-20">
            <div>
              <Reveal y={16}>
                <p className="eyebrow">Shadow AI audits for companies with 10 to 250 staff</p>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="font-heading mt-5 text-[2.6rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                  Your team already uses AI.
                  <br />
                  <span className="text-forest">Find out how.</span> Then make it safe.
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
                  We find the AI tools your staff use on personal accounts, show you what company data has touched them, write the policy, and recommend the one platform your team should run on. Plain English, no software to install.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href="#contact" className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-6 text-sm font-semibold text-paper transition-colors hover:bg-ink-2">
                    Get the free scan <ArrowRight className="size-4" />
                  </a>
                  <a href="#how" className="inline-flex h-12 items-center rounded-md border border-line bg-white px-6 text-sm font-semibold text-ink transition-colors hover:border-ink">
                    How it works
                  </a>
                </div>
                <p className="mt-4 text-sm text-moss">Read-only. Anonymous for staff. Nothing installed.</p>
              </Reveal>
            </div>
            <Reveal delay={0.2} y={32}>
              <ScanVisual />
            </Reveal>
          </div>
        </section>

        {/* Numbers */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3 sm:px-8">
            <Reveal>
              <p className="font-heading text-5xl font-semibold tabular"><CountUp value={44} suffix="%" /></p>
              <p className="mt-2 text-sm text-ink-2">of small and mid-sized businesses have an AI acceptable use policy.</p>
              <p className="mt-1 text-xs text-moss">GTIA study of 520 SMB decision-makers</p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-heading text-5xl font-semibold tabular"><CountUp value={44} suffix="%" /></p>
              <p className="mt-2 text-sm text-ink-2">of US workers say their employer has no clear AI policy, or they are not sure one exists.</p>
              <p className="mt-1 text-xs text-moss">Founder Reports survey of 2,000+ workers, 2026</p>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="font-heading text-5xl font-semibold tabular"><CountUp value={13} /> questions</p>
              <p className="mt-2 text-sm text-ink-2">in the anonymous staff survey. About five minutes. No login.</p>
              <p className="mt-1 text-xs text-moss">Our method</p>
            </Reveal>
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal>
            <p className="eyebrow">The problem</p>
            <h2 className="font-heading mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Nobody decided this. It just happened, one sign-up at a time.</h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <StaggerItem key={p.title} className="rule flex flex-col pt-5">
                <span className="eyebrow">0{i + 1}</span>
                <h3 className="font-heading mt-3 text-xl font-semibold">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{p.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* How it works */}
        <section id="how" className="bg-ink text-paper">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <Reveal>
              <p className="eyebrow !text-sand">How it works</p>
              <h2 className="font-heading mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Free scan first. Then an audit, a policy, a platform, and a watchful eye.</h2>
            </Reveal>
            <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-paper/15 bg-paper/15 md:grid-cols-2">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} as="li" delay={i * 0.06} className="bg-ink p-7 sm:p-9">
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-4xl font-semibold text-copper-2 tabular">{s.n}</span>
                    <span className="eyebrow !text-paper/60">{s.time}</span>
                  </div>
                  <h3 className="font-heading mt-5 text-2xl font-semibold">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-paper/80">{s.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Deliverables */}
        <section id="deliverables" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal>
            <p className="eyebrow">What you get</p>
            <h2 className="font-heading mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Documents an owner will actually read, and a record that staff did too.</h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DELIVERABLES.map((d) => (
              <StaggerItem key={d.title} className="rounded-xl border border-line bg-white p-6 transition-shadow hover:shadow-[0_20px_40px_-28px_rgba(22,26,23,0.5)]">
                <d.icon className="size-5 text-copper" aria-hidden />
                <h3 className="font-heading mt-4 text-lg font-semibold">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{d.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Platform */}
        <section className="border-y border-line bg-paper-2/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-24">
            <Reveal>
              <p className="eyebrow">Choosing the platform</p>
              <h2 className="font-heading mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">One approved tool beats twelve personal ones.</h2>
              <p className="mt-5 text-base leading-relaxed text-ink-2">
                Most companies end up with one of four team plans. Which one fits depends on whether you run on Google Workspace or Microsoft 365, what your staff already know, whether you handle regulated data, and how many seats you need. We score the options the same way for every client and show the reasoning, with the date we checked each price.
              </p>
              <p className="mt-4 text-base leading-relaxed text-ink-2">We sell no software and take no referral fees. The recommendation is the one we would make for ourselves.</p>
            </Reveal>
            <Reveal delay={0.1}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  ["ChatGPT Business", "The tool most staff already know. Admin controls, no training on your data."],
                  ["Claude Team", "Strong on long documents and careful writing. Capped at 150 seats."],
                  ["Microsoft 365 Copilot", "Lives inside Outlook, Word, Excel and Teams. Fits Microsoft shops."],
                  ["Gemini in Workspace", "Included in most Google Workspace plans. Fits Google shops."],
                ].map(([name, body]) => (
                  <li key={name} className="rounded-lg border border-line bg-white p-4">
                    <p className="font-semibold">{name}</p>
                    <p className="mt-1 text-sm text-ink-2">{body}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-moss">Vendor names belong to their owners. Listing is not endorsement.</p>
            </Reveal>
          </div>
        </section>

        {/* Audiences + principles */}
        <section className="mx-auto grid max-w-6xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.3fr] lg:py-28">
          <Reveal>
            <p className="eyebrow">Who it is for</p>
            <h2 className="font-heading mt-3 text-3xl font-semibold leading-tight tracking-tight">Companies with real client data and no IT department to speak of.</h2>
            <ul className="mt-6 space-y-2.5">
              {AUDIENCES.map((a) => (
                <li key={a} className="flex items-center gap-2.5 text-base"><Check className="size-4 text-forest" aria-hidden />{a}</li>
              ))}
            </ul>
          </Reveal>
          <div>
            <Reveal>
              <p className="eyebrow">How we work</p>
            </Reveal>
            <Stagger className="mt-3 grid gap-4 sm:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <StaggerItem key={p.title} className="rounded-xl border border-line bg-white p-5">
                  <p.icon className="size-5 text-forest" aria-hidden />
                  <h3 className="mt-3 font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{p.body}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-line bg-white">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
            <Reveal>
              <p className="eyebrow">Questions owners ask</p>
              <h2 className="font-heading mt-3 text-3xl font-semibold leading-tight tracking-tight">Straight answers.</h2>
            </Reveal>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="shrink-0 font-mono text-moss transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:py-28">
          <Reveal>
            <p className="eyebrow">Start with the free scan</p>
            <h2 className="font-heading mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Thirty minutes to see what is connected to your company.</h2>
            <p className="mt-5 text-base leading-relaxed text-ink-2">Tell us a little about the company and we will reply with the next step. Pricing depends on headcount, so we quote after the scan, in writing, with no obligation.</p>
            <ul className="mt-8 space-y-3 text-sm">
              <li className="flex items-center gap-3"><Mail className="size-4 text-copper" aria-hidden /><a href={`mailto:${site.contact.email}`} className="underline underline-offset-4">{site.contact.email}</a></li>
              <li className="flex items-center gap-3"><Phone className="size-4 text-copper" aria-hidden /><a href={site.contact.phoneHref} className="underline underline-offset-4">{site.contact.phone}</a></li>
              <li className="flex items-center gap-3"><MapPin className="size-4 text-copper" aria-hidden />{site.contact.location}</li>
            </ul>
            {site.contact.bookingUrl && (
              <a href={site.contact.bookingUrl} className="mt-6 inline-flex h-11 items-center rounded-md border border-ink px-5 text-sm font-semibold">Book a call</a>
            )}
          </Reveal>
          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-moss sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2 text-ink"><Mark className="size-5" /><span className="font-heading font-semibold">{site.name}</span></div>
          <p className="max-w-xl text-xs leading-relaxed">Audit reports and policies are for informational purposes and are not legal advice. NIST AI RMF and the OWASP Top 10 are voluntary references. Confirm regulatory obligations with qualified counsel. © {new Date().getFullYear()} {site.legalName}.</p>
        </div>
      </footer>
    </div>
  );
}
