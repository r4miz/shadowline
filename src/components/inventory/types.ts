import type {
  ACCESS_METHODS,
  DATA_EXPOSURE_LEVELS,
} from "@/lib/inventory-validation";

export type AccessMethod = (typeof ACCESS_METHODS)[number];
export type DataExposureLevel = (typeof DATA_EXPOSURE_LEVELS)[number];

export interface AITool {
  id: string;
  engagementId: string;
  name: string;
  vendor: string | null;
  category: string | null;
  dataExposureLevel: string | null;
  sanctioned: boolean;
  accessMethod: string;
  notes: string | null;
  source: "manual" | "survey" | "scan" | "expense";
  catalogKey: string | null;
  reportedBy: number;
  monthlySpendCents: number | null;
}
