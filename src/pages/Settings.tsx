import { useState } from "react";
import { User, Bell, Shield, Palette, Globe, Save, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TABS = [
  { key: "profile",       label: "Profil",     icon: User },
  { key: "notifications", label: "Notifikasi", icon: Bell },
  { key: "security",      label: "Keamanan",   icon: Shield },
  { key: "appearance",    label: "Tampilan",   icon: Palette },
  { key: "regional",      label: "Regional",   icon: Globe },
];

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[14px] font-bold text-[hsl(var(--foreground))]">{title}</h2>
      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">{desc}</p>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 px-3 rounded-xl border border-[hsl(var(--border))] bg-white gap-3">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-[hsl(var(--foreground))] leading-tight">{label}</p>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-tight">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState("profile");

  const [profile, setProfile] = useState({
    name: "Travel Agent",
    email: "agent@travelhub.io",
    phone: "+62 812-3456-7890",
    agency: "TravelHub Agency",
    address: "Jl. Sudirman No. 45, Jakarta Pusat",
    bio: "Agen perjalanan profesional dengan pengalaman 10 tahun.",
  });

  const [notif, setNotif] = useState({
    tripReminder: true,
    newMessage: true,
    paymentAlert: true,
    weeklyReport: false,
    marketing: false,
  });

  const [security, setSecurity] = useState({
    currentPw: "",
    newPw: "",
    confirmPw: "",
    twoFactor: false,
    loginAlert: true,
  });

  const [appearance, setAppearance] = useState({
    theme: "light",
    fontSize: "medium",
    compactMode: false,
  });

  const [regional, setRegional] = useState({
    language: "id",
    timezone: "Asia/Jakarta",
    currency: "IDR",
    dateFormat: "dd/mm/yyyy",
  });

  const handleSave = () => toast.success("Pengaturan berhasil disimpan!");

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6">

      {/* ── Tab nav: horizontal scroll on mobile, vertical sidebar on desktop ── */}
      <div className="md:w-44 md:shrink-0">
        {/* Mobile: horizontal pill tabs */}
        <div className="flex md:hidden gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all border",
                tab === t.key
                  ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]"
                  : "bg-white text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]"
              )}
            >
              <t.icon strokeWidth={1.5} className="h-3 w-3" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Desktop: vertical nav */}
        <nav className="hidden md:block space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all",
                tab === t.key
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
              )}
            >
              <t.icon strokeWidth={1.5} className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">

        {tab === "profile" && (
          <div className="space-y-4 max-w-xl">
            <SectionHeader title="Profil Agen" desc="Kelola informasi akun dan profil Anda" />

            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer shrink-0">
                <div className="h-12 w-12 rounded-xl gradient-primary shadow-glow flex items-center justify-center text-white text-base font-bold">
                  TA
                </div>
                <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera strokeWidth={1.5} className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{profile.name}</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{profile.email}</p>
                <button className="text-[11px] text-[hsl(var(--primary))] font-medium hover:underline mt-0.5">Ubah foto</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Nama Lengkap</Label>
                <Input className="h-9 text-sm" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Email</Label>
                <Input className="h-9 text-sm" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">No. Telepon</Label>
                <Input className="h-9 text-sm" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Nama Agen</Label>
                <Input className="h-9 text-sm" value={profile.agency} onChange={(e) => setProfile((p) => ({ ...p, agency: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Alamat Kantor</Label>
                <Input className="h-9 text-sm" value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Bio Singkat</Label>
                <textarea
                  rows={2}
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>
            </div>
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-2 max-w-xl">
            <SectionHeader title="Notifikasi" desc="Atur kapan dan bagaimana Anda menerima notifikasi" />
            {[
              { key: "tripReminder" as const, label: "Pengingat Trip",          desc: "Notifikasi H-7 dan H-1 sebelum keberangkatan" },
              { key: "newMessage"   as const, label: "Pesan Baru",              desc: "Notifikasi saat ada pesan masuk dari jamaah" },
              { key: "paymentAlert" as const, label: "Konfirmasi Pembayaran",   desc: "Notifikasi pembayaran DP dan pelunasan" },
              { key: "weeklyReport" as const, label: "Laporan Mingguan",        desc: "Ringkasan aktivitas dikirim setiap Senin pagi" },
              { key: "marketing"    as const, label: "Info & Promosi",          desc: "Penawaran dan pembaruan produk dari TravelHub" },
            ].map((item) => (
              <ToggleRow
                key={item.key}
                label={item.label}
                desc={item.desc}
                checked={notif[item.key]}
                onChange={(v) => setNotif((n) => ({ ...n, [item.key]: v }))}
              />
            ))}
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-4 max-w-xl">
            <SectionHeader title="Keamanan Akun" desc="Kelola kata sandi dan keamanan akun Anda" />
            <div className="grid grid-cols-1 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Kata Sandi Saat Ini</Label>
                <Input className="h-9 text-sm" type="password" placeholder="••••••••" value={security.currentPw} onChange={(e) => setSecurity((s) => ({ ...s, currentPw: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Sandi Baru</Label>
                  <Input className="h-9 text-sm" type="password" placeholder="••••••••" value={security.newPw} onChange={(e) => setSecurity((s) => ({ ...s, newPw: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Konfirmasi</Label>
                  <Input className="h-9 text-sm" type="password" placeholder="••••••••" value={security.confirmPw} onChange={(e) => setSecurity((s) => ({ ...s, confirmPw: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
              <p className="text-[12px] font-semibold text-[hsl(var(--foreground))]">Keamanan Lanjutan</p>
              {[
                { key: "twoFactor" as const, label: "Autentikasi 2FA",       desc: "Lapisan keamanan ekstra saat login" },
                { key: "loginAlert" as const, label: "Notifikasi Login Baru", desc: "Email saat ada login dari perangkat baru" },
              ].map((item) => (
                <ToggleRow
                  key={item.key}
                  label={item.label}
                  desc={item.desc}
                  checked={security[item.key]}
                  onChange={(v) => setSecurity((s) => ({ ...s, [item.key]: v }))}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "appearance" && (
          <div className="space-y-4 max-w-xl">
            <SectionHeader title="Tampilan" desc="Sesuaikan tampilan aplikasi sesuai preferensi Anda" />
            <div className="space-y-1.5">
              <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Tema</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "light", label: "Terang",    preview: "bg-white border" },
                  { key: "dark",  label: "Gelap",     preview: "bg-gray-800" },
                  { key: "auto",  label: "Otomatis",  preview: "bg-gradient-to-r from-white to-gray-800" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setAppearance((a) => ({ ...a, theme: t.key }))}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all",
                      appearance.theme === t.key ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]" : "border-[hsl(var(--border))]"
                    )}
                  >
                    <div className={cn("h-8 w-full rounded-lg border", t.preview)} />
                    <span className="text-[11px] font-medium text-[hsl(var(--foreground))]">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Ukuran Teks</Label>
              <Select value={appearance.fontSize} onValueChange={(v) => setAppearance((a) => ({ ...a, fontSize: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: "#fff" }}>
                  <SelectItem value="small">Kecil</SelectItem>
                  <SelectItem value="medium">Sedang (Default)</SelectItem>
                  <SelectItem value="large">Besar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow
              label="Mode Compact"
              desc="Kurangi padding dan jarak untuk tampilan lebih padat"
              checked={appearance.compactMode}
              onChange={(v) => setAppearance((a) => ({ ...a, compactMode: v }))}
            />
          </div>
        )}

        {tab === "regional" && (
          <div className="space-y-3 max-w-xl">
            <SectionHeader title="Regional" desc="Pengaturan bahasa, zona waktu, dan format" />
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: "language",   label: "Bahasa",            opts: [{ v: "id", l: "Bahasa Indonesia" }, { v: "en", l: "English" }, { v: "ar", l: "العربية" }] },
                { key: "timezone",   label: "Zona Waktu",        opts: [{ v: "Asia/Jakarta", l: "WIB (UTC+7)" }, { v: "Asia/Makassar", l: "WITA (UTC+8)" }, { v: "Asia/Jayapura", l: "WIT (UTC+9)" }] },
                { key: "currency",   label: "Mata Uang Default", opts: [{ v: "IDR", l: "IDR — Rupiah" }, { v: "USD", l: "USD — Dollar" }, { v: "SAR", l: "SAR — Riyal" }] },
                { key: "dateFormat", label: "Format Tanggal",    opts: [{ v: "dd/mm/yyyy", l: "DD/MM/YYYY" }, { v: "mm/dd/yyyy", l: "MM/DD/YYYY" }, { v: "yyyy-mm-dd", l: "YYYY-MM-DD" }] },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">{field.label}</Label>
                  <Select
                    value={(regional as Record<string, string>)[field.key]}
                    onValueChange={(v) => setRegional((r) => ({ ...r, [field.key]: v }))}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: "#fff" }}>
                      {field.opts.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] max-w-xl">
          <Button onClick={handleSave} className="gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl h-9 px-5 text-sm">
            <Save strokeWidth={1.5} className="h-3.5 w-3.5 mr-2" /> Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
