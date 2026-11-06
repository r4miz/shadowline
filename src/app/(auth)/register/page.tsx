"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandWordmark } from "@/components/brand-mark";
import { AuthShell } from "@/components/public/auth-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, inviteCode: inviteCode || undefined }),
    });
    setPending(false);
    if (res.ok) {
      router.push("/login");
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Registration failed.");
    }
  }

  return (
    <AuthShell title="Create the operator account" subtitle="The first account registers freely. After that, an invite code is required.">
      <Link href="/" className="mb-8 inline-block"><BrandWordmark className="text-base" /></Link>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="h-10 text-base" />
          <p className="text-xs text-muted-foreground">Appears as the preparer on every document.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password (at least 10 characters)</Label>
          <Input id="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-10 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite">Invite code (if you were given one)</Label>
          <Input id="invite" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} autoComplete="off" className="h-10 font-mono text-base" />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>Create account</Button>
        <p className="text-center text-sm text-muted-foreground">
          Already registered? <Link href="/login" className="underline underline-offset-4">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
