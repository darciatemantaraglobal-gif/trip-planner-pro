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
    if (open) setDraft(initial ? { ...initial } : empty);
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
      <DialogContent className="max-w-sm sm:max-w-md w-[calc(100%-2rem)] rounded-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-[hsl(var(--border))]">
          <DialogTitle className="text-[15px] font-semibold">
            {initial ? "Edit Paket" : "Tambah Paket"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Nama Paket</Label>
            <Input
              placeholder="cth: Bali Paradise 5D, Umrah Ramadhan"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Destinasi</Label>
            <Input
              placeholder="cth: Bali, Indonesia"
              value={draft.destination}
              onChange={(e) => set("destination", e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Pax</Label>
              <Input
                type="number" min={1}
                value={draft.people}
                onChange={(e) => set("people", Math.max(1, Number(e.target.value)))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Hari</Label>
              <Input
                type="number" min={1}
                value={draft.days}
                onChange={(e) => set("days", Math.max(1, Number(e.target.value)))}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Total (IDR)</Label>
              <Input
                type="number" min={0}
                value={draft.totalIDR}
                onChange={(e) => set("totalIDR", Math.max(0, Number(e.target.value)))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Status</Label>
              <Select value={draft.status} onValueChange={(v) => set("status", v as PackageStatus)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Emoji</Label>
            <Input
              maxLength={4}
              value={draft.emoji}
              onChange={(e) => set("emoji", e.target.value)}
              className="h-9 text-sm w-20"
            />
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t border-[hsl(var(--border))] flex flex-row gap-2">
          <Button variant="outline" className="flex-1 h-9 rounded-xl text-sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button
            className="flex-1 h-9 rounded-xl text-sm gradient-primary text-white"
            onClick={handleSave}
            disabled={saving || !draft.name || !draft.destination}
          >
            {saving ? "Menyimpan..." : initial ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
