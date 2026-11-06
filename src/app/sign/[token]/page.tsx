import { SignClient } from "@/components/public/sign-client";

export const metadata = { title: "AI Acceptable Use Policy" };

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-dvh bg-background">
      <SignClient token={token} />
    </main>
  );
}
