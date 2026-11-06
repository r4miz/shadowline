import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/app/primitives";
import { SettingsForm } from "@/components/app/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Workshop" title="Settings" description="Your pricing defaults and which integrations are live. Prices here feed every quote you create." />
      <SettingsForm />
    </div>
  );
}
