import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app/primitives";
import { ProfileForm } from "@/components/company/profile-form";

export const metadata = { title: "Company profile" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const org = await prisma.organization.findFirst({ where: { id, consultantId: session.user.id }, include: { profile: true } });
  if (!org) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stage 1"
        title="Company profile"
        description="Ask the owner these questions in a five-minute call. The answers shape the policy wording, the risk scoring and the platform recommendation."
      />
      <ProfileForm
        organizationId={org.id}
        organization={{ name: org.name, industry: org.industry, employeeCount: org.employeeCount, hasEUexposure: org.hasEUexposure, contactName: org.contactName ?? "", contactEmail: org.contactEmail ?? "", website: org.website ?? "" }}
        profile={
          org.profile
            ? { suite: org.profile.suite, dataTypes: org.profile.dataTypes, providedTools: org.profile.providedTools, hasWrittenPolicy: org.profile.hasWrittenPolicy, remoteWork: org.profile.remoteWork, priorities: org.profile.priorities, currentAiSpendCents: org.profile.currentAiSpendCents, notes: org.profile.notes }
            : null
        }
      />
    </div>
  );
}
