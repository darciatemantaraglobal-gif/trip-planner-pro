import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Package, PackageDraft, PackageStatus } from "@/features/packages/packagesRepo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Package | null;
  onSubmit: (draft: PackageDraft) => Promise<void> | void;
}

const STATUSES: PackageStatus[] = ["Draft", "Calculated", "Confirmed", "Paid", "Completed"];

const empty: PackageDraft = {
  name: "",
  destination: "",
  people: 1,
  days: 1,
  totalIDR: 0,
  status: "Draft",
  emoji: "✈️",
};

export function PackageFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [draft, setDraft] = useState<PackageDraft>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initial ? { ...initial } : empty);
    }
  }, [open, initial]);

  const set = <K extends keyof PackageDraft>(key: K, value: PackageDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.destination.trim()) return;
    setSaving(true);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Package" : "Create Package"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pkg-name">Package name</Label>
              <Input id="pkg-name" placeholder="e.g. Bali Paradise 5D"
                value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pkg-dest">Destination</Label>
              <Input id="pkg-dest" placeholder="e.g. Bali, Indonesia"
                value={draft.destination} onChange={(e) => set("destination", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-people">People</Label>
              <Input id="pkg-people" type="number" min={1}
                value={draft.people}
                onChange={(e) => set("people", Math.max(1, Number(e.target.value)))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-days">Days</Label>
              <Input id="pkg-days" type="number" min={1}
                value={draft.days}
                onChange={(e) => set("days", Math.max(1, Number(e.target.value)))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-total">Total (IDR)</Label>
              <Input id="pkg-total" type="number" min={0}
                value={draft.totalIDR}
                onChange={(e) => set("totalIDR", Math.max(0, Number(e.target.value)))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-status">Status</Label>
              <Select value={draft.status} onValueChange={(v) => set("status", v as PackageStatus)}>
                <SelectTrigger id="pkg-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pkg-emoji">Emoji</Label>
              <Input id="pkg-emoji" maxLength={4}
                value={draft.emoji} onChange={(e) => set("emoji", e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !draft.name || !draft.destination}
            className="gradient-primary text-primary-foreground">
            {saving ? "Saving..." : initial ? "Save changes" : "Create package"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
