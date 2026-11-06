import { z } from "zod";

export const ACCESS_METHODS = [
  "org_account",
  "personal_account",
  "browser_ext",
  "api",
  "mcp_agent",
] as const;

export const DATA_EXPOSURE_LEVELS = [
  "public",
  "internal",
  "confidential",
  "regulated",
] as const;

export const AIToolCreateSchema = z.object({
  name: z.string().min(1).max(200),
  vendor: z.string().max(200).optional(),
  category: z.string().max(120).optional(),
  dataExposureLevel: z.enum(DATA_EXPOSURE_LEVELS).optional(),
  sanctioned: z.boolean().default(false),
  accessMethod: z.enum(ACCESS_METHODS),
  notes: z.string().max(2000).optional(),
});

export const AIToolUpdateSchema = AIToolCreateSchema.partial();

export const ACCESS_METHOD_LABELS: Record<(typeof ACCESS_METHODS)[number], string> = {
  org_account: "Company account",
  personal_account: "Personal account",
  browser_ext: "Browser extension",
  api: "API integration",
  mcp_agent: "MCP / autonomous agent",
};

export const DATA_EXPOSURE_LEVEL_LABELS: Record<
  (typeof DATA_EXPOSURE_LEVELS)[number],
  string
> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  regulated: "Regulated",
};
