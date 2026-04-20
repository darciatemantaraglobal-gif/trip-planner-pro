import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin, Users, Calendar, MoreHorizontal, Plus, Search, Pencil, Trash2, Package as PackageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { usePackages } from "@/features/packages/usePackages";
import { PackageFormDialog } from "@/features/packages/PackageFormDialog";
import type { Package } from "@/features/packages/packagesRepo";

const statusVariant: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Calculated: "bg-primary/10 text-primary",
  Confirmed: "bg-warning/10 text-warning",
  Paid: "bg-success/10 text-success",
  Completed: "bg-emerald-500/10 text-emerald-600",
};

const fmtIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function Packages() {
  const navigate = useNavigate();
  const { items, loading, create, update, remove } = usePackages();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) => p.name.toLowerCase().includes(q) || p.destination.toLowerCase().includes(q),
    );
  }, [items, query]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (pkg: Package) => { setEditing(pkg); setFormOpen(true); };

  const handleSubmit = async (draft: Parameters<typeof create>[0]) => {
    if (editing) {
      await update(editing.id, draft);
      toast.success("Paket diperbarui");
    } else {
      await create(draft);
      toast.success("Paket dibuat");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await remove(deletingId);
    toast.success("Paket dihapus");
    setDeletingId(null);
  };

  const deletingPkg = items.find((p) => p.id === deletingId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-[hsl(var(--foreground))] leading-tight">Paket Trip</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Kelola semua paket perjalanan kamu.</p>
        </div>
        <Button
          onClick={openCreate}
          className="btn-glow h-9 px-3 rounded-xl text-sm shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Tambah
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
        <Input
          placeholder="Cari paket..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-9 text-sm rounded-xl bg-[hsl(var(--secondary))] border-0 focus-visible:ring-1 focus-visible:ring-[hsl(var(--primary))]"
        />
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] py-4 text-center">Memuat paket…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] py-10 text-center space-y-3">
          <PackageIcon strokeWidth={1.5} className="h-8 w-8 text-[hsl(var(--muted-foreground))] mx-auto" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {query ? "Paket tidak ditemukan." : "Belum ada paket."}
          </p>
          {!query && (
            <Button variant="outline" onClick={openCreate} className="h-8 text-sm rounded-xl">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Buat paket pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => navigate(`/packages/${pkg.id}`)}
              className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden shadow-sm hover:shadow-md transition-smooth group"
            >
              {/* Cover / Emoji banner */}
              <div className="h-20 relative overflow-hidden">
                {pkg.coverImage ? (
                  <img src={pkg.coverImage} alt={pkg.name} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl"
                    style={{ background: `linear-gradient(135deg,hsl(27 91% 54%),hsl(16 88% 58%))` }}
                  >
                    {pkg.emoji}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <Badge className={`${statusVariant[pkg.status]} border-0 absolute top-2 right-2 text-[9px] px-1.5 py-0 h-4 font-medium`}>
                  {pkg.status}
                </Badge>
              </div>

              {/* Body */}
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="text-[12px] font-bold leading-tight truncate">{pkg.name}</h3>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-0.5 mt-0.5 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      {pkg.destination}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1 -mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-sm">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(pkg); }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setDeletingId(pkg.id); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {pkg.people} pax</span>
                  <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {pkg.days} hari</span>
                </div>

                <div className="pt-1.5 border-t border-[hsl(var(--border))]">
                  <div className="text-[9px] text-[hsl(var(--muted-foreground))]">Total</div>
                  <div className="text-[11px] font-bold text-[hsl(var(--primary))] leading-tight">{fmtIDR(pkg.totalIDR)}</div>
                  <div className="mt-1 text-[9px] font-semibold text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]">Klik untuk detail</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PackageFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="max-w-sm w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Hapus paket ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              "{deletingPkg?.name}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 h-9 rounded-xl text-sm">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 h-9 rounded-xl text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
