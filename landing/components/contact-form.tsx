"use client";

import { useState } from "react";

const SIZES = ["1 to 10", "11 to 25", "26 to 50", "51 to 100", "101 to 250", "250+"];

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("sending");
    setError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok) {
      setState("sent");
      form.reset();
    } else {
      setState("error");
      setError(json?.error ?? "Something went wrong. Please email us directly.");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-line bg-white p-6">
        <p className="font-heading text-xl font-semibold">Thank you</p>
        <p className="mt-2 text-sm text-moss">We will reply within one business day to set up your free scan.</p>
      </div>
    );
  }

  const field = "h-11 w-full rounded-md border border-line bg-white px-3 text-base text-ink placeholder:text-moss/70 focus:border-ink";

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Your name
          <input name="name" required autoComplete="name" className={`${field} mt-1.5`} />
        </label>
        <label className="block text-sm font-medium">
          Work email
          <input name="email" type="email" required autoComplete="email" className={`${field} mt-1.5`} />
        </label>
        <label className="block text-sm font-medium">
          Company
          <input name="company" autoComplete="organization" className={`${field} mt-1.5`} />
        </label>
        <label className="block text-sm font-medium">
          Employees
          <select name="employees" className={`${field} mt-1.5`} defaultValue="">
            <option value="">Choose a range</option>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        What prompted you to look into this?
        <textarea name="message" rows={4} className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-base text-ink placeholder:text-moss/70 focus:border-ink" placeholder="Optional. For example: staff are using ChatGPT with client data and we have no policy." />
      </label>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {error && <p className="text-sm text-copper" role="alert">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-ink-2 disabled:opacity-60 sm:w-auto">
        {state === "sending" ? "Sending" : "Request the free scan"}
      </button>
      <p className="text-xs text-moss">No newsletter, no automated follow-ups. One reply from a person.</p>
    </form>
  );
}
