import { ConnectClient } from "@/components/public/connect-client";

export const metadata = { title: "Connect your workspace" };

export default async function ConnectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-dvh bg-background">
      <ConnectClient token={token} />
    </main>
  );
}
