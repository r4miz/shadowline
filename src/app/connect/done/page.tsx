import { Check, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";

export const metadata = { title: "Workspace connected" };

const ERRORS: Record<string, string> = {
  denied: "Access was declined, so nothing was connected.",
  missing: "The provider did not return what we needed. Please start again from your link.",
  state: "The connection request could not be verified. Please start again from your link.",
  nonce: "This connection was started in a different browser or tab. Please start again from your link, in one browser.",
  replay: "This connection request was already used. If you need to reconnect, start again from your link.",
  tenant: "The tenant identifier was not valid.",
  exchange: "We could not complete the connection with the provider. Please try again.",
};

export default async function ConnectDonePage({ searchParams }: { searchParams: Promise<{ provider?: string; error?: string }> }) {
  const { provider, error } = await searchParams;
  const label = provider === "google" ? "Google Workspace" : provider === "microsoft" ? "Microsoft 365" : "the demo workspace";
  const ok = !error;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
      <BrandMark className="size-9 text-foreground" />
      <div className={`mt-8 flex size-14 items-center justify-center rounded-full ${ok ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
        {ok ? <Check className="size-7" /> : <X className="size-7" />}
      </div>
      <h1 className="mt-5 font-heading text-3xl font-semibold">{ok ? "Connected" : "Not connected"}</h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
        {ok
          ? `Thank you. ${label} is connected with read-only access and the first scan has run. You can close this page. Access can be revoked from your admin console at any time.`
          : ERRORS[error ?? ""] ?? "Something went wrong."}
      </p>
      <p className="mt-10 text-xs text-muted-foreground">{brand.name}</p>
    </main>
  );
}
