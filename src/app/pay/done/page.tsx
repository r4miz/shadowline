import { Check, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/lib/brand";

export const metadata = { title: "Payment" };

// Public landing page after Stripe Checkout. The paying client is not an
// operator, so this never links into the workshop.
export default async function PayDonePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const paid = status === "paid";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
      <BrandMark className="size-9 text-foreground" />
      <div className={`mt-8 flex size-14 items-center justify-center rounded-full ${paid ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>
        {paid ? <Check className="size-7" /> : <X className="size-7" />}
      </div>
      <h1 className="mt-5 font-heading text-3xl font-semibold">{paid ? "Thank you" : "Checkout cancelled"}</h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
        {paid
          ? "Your payment was received. You will get a receipt from Stripe by email, and we will be in touch with the next step shortly."
          : "No payment was taken. The quote stays open; use the same link whenever you are ready."}
      </p>
      <p className="mt-10 text-xs text-muted-foreground">{brand.name}</p>
    </main>
  );
}
