"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACCESS_METHOD_LABELS,
  DATA_EXPOSURE_LEVEL_LABELS,
} from "@/lib/inventory-validation";
import { InventoryToolDialog } from "@/components/inventory/inventory-tool-dialog";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AccessMethod, AITool } from "@/components/inventory/types";

type FetchState = "loading" | "ready" | "error";

export function InventoryPanel({ engagementId }: { engagementId: string }) {
  const [tools, setTools] = useState<AITool[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<AITool | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function rebuild() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/inventory/sync`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      setTools(json.data as AITool[]);
      setState("ready");
      router.refresh();
    } catch {
      setState("error");
    } finally {
      setSyncing(false);
    }
  }

  const fetchTools = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/engagements/${engagementId}/tools`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load");
      setTools(json.data as AITool[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [engagementId]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchTools();
    });
  }, [fetchTools]);

  const sanctionedCount = tools.filter((t) => t.sanctioned).length;
  const shadowCount = tools.length - sanctionedCount;

  function openAddDialog() {
    setEditingTool(null);
    setDialogOpen(true);
  }

  function openEditDialog(tool: AITool) {
    setEditingTool(tool);
    setDialogOpen(true);
  }

  async function handleDelete(toolId: string) {
    if (confirmDeleteId !== toolId) {
      setConfirmDeleteId(toolId);
      return;
    }
    setConfirmDeleteId(null);
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/tools/${toolId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to delete");
      await fetchTools();
    } catch {
      // surface via the error banner on next fetch attempt
      setState("error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">AI tool inventory</h2>
          <p className="text-sm text-muted-foreground">
            {sanctionedCount} approved &middot; {shadowCount} shadow. Built from the survey, the workspace scan and the expense scan; rows you add or edit by hand are kept.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={rebuild} disabled={syncing}>
            <RefreshCw className={syncing ? "animate-spin" : ""} /> {syncing ? "Rebuilding" : "Rebuild from evidence"}
          </Button>
          <Button onClick={openAddDialog}>Add tool</Button>
        </div>
      </div>

      {state === "loading" && (
        <p className="text-sm text-muted-foreground">Loading tools&hellip;</p>
      )}

      {state === "error" && (
        <p className="text-sm text-destructive">
          Failed to load tools.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => fetchTools()}
          >
            Try again
          </button>
        </p>
      )}

      {state === "ready" && tools.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No AI tools recorded yet. Click Rebuild from evidence once the survey, scan or expense data is in, or add a tool by hand.
        </p>
      )}

      {state === "ready" && tools.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Data it has touched</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    <div className="font-medium">{tool.name}</div>
                    {tool.vendor && (
                      <div className="text-xs text-muted-foreground">
                        {tool.vendor}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="capitalize">{tool.source}</Badge>
                      {tool.reportedBy > 0 && <Badge variant="secondary">{tool.reportedBy} staff</Badge>}
                      {tool.monthlySpendCents ? <Badge variant="secondary">${Math.round(tool.monthlySpendCents / 100)}/mo</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {ACCESS_METHOD_LABELS[tool.accessMethod as AccessMethod]}
                  </TableCell>
                  <TableCell>
                    {tool.dataExposureLevel ? (
                      <Badge
                        variant={
                          tool.dataExposureLevel === "regulated" ||
                          tool.dataExposureLevel === "confidential"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {
                          DATA_EXPOSURE_LEVEL_LABELS[
                            tool.dataExposureLevel as keyof typeof DATA_EXPOSURE_LEVEL_LABELS
                          ]
                        }
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">n/a</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tool.sanctioned ? (
                      <Badge className="border-transparent bg-success/15 text-success">Approved</Badge>
                    ) : (
                      <Badge variant="destructive">Shadow</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(tool)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={
                          confirmDeleteId === tool.id
                            ? "destructive"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleDelete(tool.id)}
                      >
                        {confirmDeleteId === tool.id ? "Confirm?" : "Delete"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InventoryToolDialog
        engagementId={engagementId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tool={editingTool}
        onSaved={fetchTools}
      />
    </div>
  );
}
