"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/lib/brand";
import { BrandWordmark } from "@/components/brand-mark";
import { AuthShell } from "@/components/public/auth-shell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(urlError ? "That sign-in link was invalid, expired or already used. Request a new one." : null);
  const [pending, setPending] = useState(false);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (result?.error) {
      setMessage("Invalid email or password.");
    } else {
      router.push("/app");
      router.refresh();
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setMessage("Enter your email first, then request a sign-in link.");
      return;
    }
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/auth/magic-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const body = await res.json().catch(() => null);
    setPending(false);
    setMessage(body?.message ?? "If that account exists, a sign-in link has been sent.");
  }

  return (
    <form onSubmit={handlePasswordSignIn} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 text-base" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 text-base" />
      </div>
      {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>Sign in</Button>
      <Button type="button" variant="outline" size="lg" className="w-full" disabled={pending} onClick={handleMagicLink}>Email me a sign-in link</Button>
      <p className="text-center text-sm text-muted-foreground">
        New here? <Link href="/register" className="underline underline-offset-4">Create the account</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" subtitle={`The ${brand.name} workshop.`}>
      <Link href="/" className="mb-8 inline-block"><BrandWordmark className="text-base" /></Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
