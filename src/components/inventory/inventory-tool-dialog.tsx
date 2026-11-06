"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCESS_METHODS,
  ACCESS_METHOD_LABELS,
  DATA_EXPOSURE_LEVELS,
  DATA_EXPOSURE_LEVEL_LABELS,
} from "@/lib/inventory-validation";
import type { AccessMethod, AITool, DataExposureLevel } from "@/components/inventory/types";

interface FormState {
  name: string;
  vendor: string;
  category: string;
  accessMethod: AccessMethod | "";
  dataExposureLevel: DataExposureLevel | "";
  sanctioned: boolean;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  vendor: "",
  category: "",
  accessMethod: "",
  dataExposureLevel: "",
  sanctioned: false,
  notes: "",
};

function toFormState(tool: AITool | null): FormState {
  if (!tool) return EMPTY_FORM;
  return {
    name: tool.name,
    vendor: tool.vendor ?? "",
    category: tool.category ?? "",
    accessMethod: (tool.accessMethod as AccessMethod) ?? "",
    dataExposureLevel: (tool.dataExposureLevel as DataExposureLevel) ?? "",
    sanctioned: tool.sanctioned,
    notes: tool.notes ?? "",
  };
}

export function InventoryToolDialog({
  engagementId,
  open,
  onOpenChange,
  tool,
  onSaved,
}: {
  engagementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: AITool | null;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setForm(toFormState(tool));
        setError(null);
      });
    }
  }, [open, tool]);

  const isEdit = Boolean(tool);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.accessMethod) {
      setError("Access method is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      vendor: form.vendor.trim() || undefined,
      category: form.category.trim() || undefined,
      accessMethod: form.accessMethod,
      dataExposureLevel: form.dataExposureLevel || undefined,
      sanctioned: form.sanctioned,
      notes: form.notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/engagements/${engagementId}/tools/${tool!.id}`
        : `/api/engagements/${engagementId}/tools`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to save tool");
      }
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tool");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit tool" : "Add tool"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tool-name">Name</Label>
            <Input
              id="tool-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool-vendor">Vendor</Label>
            <Input
              id="tool-vendor"
              value={form.vendor}
              onChange={(e) =>
                setForm((f) => ({ ...f, vendor: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool-category">Category</Label>
            <Input
              id="tool-category"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool-access-method">Access method</Label>
            <Select
              value={form.accessMethod}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  accessMethod: value as AccessMethod,
                }))
              }
            >
              <SelectTrigger id="tool-access-method" className="w-full">
                <SelectValue placeholder="Select access method" />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {ACCESS_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool-data-exposure">Data exposure level</Label>
            <Select
              value={form.dataExposureLevel}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  dataExposureLevel: value as DataExposureLevel,
                }))
              }
            >
              <SelectTrigger id="tool-data-exposure" className="w-full">
                <SelectValue placeholder="Select data exposure level" />
              </SelectTrigger>
              <SelectContent>
                {DATA_EXPOSURE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {DATA_EXPOSURE_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-2.5 py-2">
            <Label htmlFor="tool-sanctioned">Approved by the org</Label>
            <Switch
              id="tool-sanctioned"
              checked={form.sanctioned}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, sanctioned: checked }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool-notes">Notes</Label>
            <Textarea
              id="tool-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add tool"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
