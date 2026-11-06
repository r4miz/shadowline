import { requireUser } from "@/lib/api-auth";
import { apiError, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { googleConfigured } from "@/lib/connectors/google";
import { microsoftConfigured } from "@/lib/connectors/microsoft";
import { demoScansEnabled } from "@/lib/connectors/run-scan";
import { settingsFor, stripeConfigured } from "@/lib/quotes";
import { aiDraftingEnabled } from "@/lib/ai-draft";
import { SettingsSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await settingsFor(user.id);
    return ok({
      settings,
      integrations: {
        email: emailConfigured(),
        stripe: stripeConfigured(),
        google: googleConfigured(),
        microsoft: microsoftConfigured(),
        demoScans: demoScansEnabled(),
        aiDrafting: aiDraftingEnabled(),
        cron: Boolean(process.env.CRON_SECRET),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = SettingsSchema.parse(await request.json().catch(() => null));
    const data = {
      auditPricePerEmployeeCents: body.auditPricePerEmployeeCents,
      auditMinimumCents: body.auditMinimumCents,
      monitoringPricePerEmployeeCents: body.monitoringPricePerEmployeeCents,
      monitoringMinimumCents: body.monitoringMinimumCents,
      businessName: body.businessName || null,
      replyToEmail: body.replyToEmail || null,
    };
    await prisma.operatorSettings.upsert({
      where: { consultantId: user.id },
      update: data,
      create: { ...data, consultantId: user.id },
    });
    return ok(await settingsFor(user.id));
  } catch (error) {
    return apiError(error);
  }
}
