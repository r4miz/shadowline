import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgs = await prisma.organization.findMany({
    where: { consultantId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      monitoringActive: true,
      engagements: { orderBy: { startedAt: "desc" }, take: 1, select: { status: true } },
      _count: { select: { alerts: { where: { resolvedAt: null } } } },
    },
  });

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AppShell
      userEmail={session.user.email ?? ""}
      signOutAction={signOutAction}
      companies={orgs.map((o) => ({
        id: o.id,
        name: o.name,
        status: o.engagements[0]?.status ?? "draft",
        monitoringActive: o.monitoringActive,
        openAlerts: o._count.alerts,
      }))}
    >
      {children}
    </AppShell>
  );
}
