import { z } from "zod";

import { NIST_FUNCTIONS } from "@/lib/question-bank";

// OWASP LLM Top 10 2025 ids are LLM01..LLM10 (spec section 5.1).
const owaspRef = z.string().regex(/^LLM(0[1-9]|10)$/, "Invalid OWASP LLM ref");

const EFFORTS = ["low", "med", "high"] as const;

// Manual findings are authored by the consultant. ragRating is NOT accepted
// from the client, it is always derived server-side from likelihood x impact
// so a finding's colour can never contradict its score.
export const FindingCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  nistFunction: z.enum(NIST_FUNCTIONS),
  owaspRefs: z.array(owaspRef).max(10).default([]),
  recommendation: z.string().min(1).max(5000),
  effort: z.enum(EFFORTS),
});

export const FindingUpdateSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    likelihood: z.number().int().min(1).max(5),
    impact: z.number().int().min(1).max(5),
    nistFunction: z.enum(NIST_FUNCTIONS),
    owaspRefs: z.array(owaspRef).max(10),
    recommendation: z.string().min(1).max(5000),
    effort: z.enum(EFFORTS),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "No fields to update",
  });

// Reorder: the full ordered list of finding ids; index becomes priorityRank.
export const FindingReorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
});

export type FindingCreateInput = z.infer<typeof FindingCreateSchema>;
export type FindingUpdateInput = z.infer<typeof FindingUpdateSchema>;
