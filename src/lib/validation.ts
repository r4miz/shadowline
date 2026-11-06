import { z } from "zod";

export const OrganizationCreateSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().min(1).max(120),
  employeeCount: z.number().int().min(1).max(1_000_000),
  hasEUexposure: z.boolean().default(false),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().max(254).optional().or(z.literal("")),
  website: z.string().max(300).optional(),
});

export const OrganizationUpdateSchema = OrganizationCreateSchema.partial();

export const EngagementCreateSchema = z.object({
  organizationId: z.string().min(1),
});

export const EngagementUpdateSchema = z.object({
  status: z.enum(["draft", "in_progress", "review", "complete"]).optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const SUITES = ["google", "microsoft", "both", "none", "unknown"] as const;

export const PROFILE_DATA_TYPES = [
  "customer_pii",
  "health",
  "financial_accounts",
  "payment_cards",
  "legal",
  "hr",
  "source_code",
  "trade_secrets",
  "children",
  "government_ids",
] as const;

export const PROFILE_PRIORITIES = ["lowest_cost", "compliance", "staff_familiarity", "speed", "control"] as const;

export const PROFILE_PRIORITY_LABELS: Record<(typeof PROFILE_PRIORITIES)[number], string> = {
  lowest_cost: "Keep cost down",
  compliance: "Compliance and data protection",
  staff_familiarity: "Use what staff already know",
  speed: "Roll out fast",
  control: "Visibility and admin control",
};

export const CompanyProfileSchema = z.object({
  suite: z.enum(SUITES),
  dataTypes: z.array(z.enum(PROFILE_DATA_TYPES)).max(20).default([]),
  providedTools: z.array(z.string().max(60)).max(30).default([]),
  hasWrittenPolicy: z.boolean().nullable().default(null),
  remoteWork: z.enum(["office", "hybrid", "remote"]).nullable().optional(),
  priorities: z.array(z.enum(PROFILE_PRIORITIES)).max(5).default([]),
  currentAiSpendCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const ExpenseUploadSchema = z.object({
  csv: z.string().min(1).max(2 * 1024 * 1024),
});

export const SignoffInviteSchema = z.object({
  emails: z.array(z.string().email().max(254)).min(1).max(500),
  sendEmails: z.boolean().default(false),
});

export const SignSubmitSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  agree: z.literal(true),
});

export const QuoteCreateSchema = z.object({
  kind: z.enum(["audit", "monitoring"]),
  employeeCount: z.number().int().min(1).max(1_000_000).optional(),
  notes: z.string().max(2000).optional(),
});

export const QuoteUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "paid", "void"]),
});

export const SettingsSchema = z.object({
  auditPricePerEmployeeCents: z.number().int().min(0).max(10_000_000),
  auditMinimumCents: z.number().int().min(0).max(100_000_000),
  monitoringPricePerEmployeeCents: z.number().int().min(0).max(10_000_000),
  monitoringMinimumCents: z.number().int().min(0).max(100_000_000),
  businessName: z.string().max(200).nullable().optional(),
  replyToEmail: z.string().email().max(254).nullable().optional().or(z.literal("")),
});

export const ItResponsesSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: z.union([z.string().max(4000), z.array(z.string().max(500)).max(50), z.boolean()]),
      })
    )
    .max(200),
});

export const ConnectStartSchema = z.object({
  token: z.string().min(1),
  provider: z.enum(["google", "microsoft", "demo"]),
});
