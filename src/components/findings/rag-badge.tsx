import { Badge } from "@/components/ui/badge";
import type { RagRating } from "@/components/findings/types";

// RAG colours per spec: red = high, amber = moderate, green = low. Tailwind
// utility classes keep this self-contained (no theme tokens to wire up).
const RAG_STYLES: Record<RagRating, string> = {
  red: "border-transparent bg-red-600 text-white",
  amber: "border-transparent bg-amber-500 text-black",
  green: "border-transparent bg-emerald-600 text-white",
};

const RAG_LABELS: Record<RagRating, string> = {
  red: "Red",
  amber: "Amber",
  green: "Green",
};

export function RagBadge({ rag }: { rag: RagRating }) {
  return <Badge className={RAG_STYLES[rag]}>{RAG_LABELS[rag]}</Badge>;
}
