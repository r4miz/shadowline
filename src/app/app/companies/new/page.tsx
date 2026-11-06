import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/app/primitives";
import { NewCompanyForm } from "@/components/company/new-company-form";

export const metadata = { title: "New company" };

export default async function NewCompanyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader eyebrow="Step 1 of 1" title="Add a company" description="The basics you need to start the free scan. You will fill in the rest of the profile with the owner." />
      <NewCompanyForm />
    </div>
  );
}
