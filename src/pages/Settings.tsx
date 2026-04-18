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
  { key: "profile", label: "Profil", icon: User },
  { key: "notifications", label: "Notifikasi", icon: Bell },
  { key: "security", label: "Keamanan", icon: Shield },
  { key: "appearance", label: "Tampilan", icon: Palette },
  { key: "regional", label: "Regional", icon: Globe },
];

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
    sidebarColor: "default",
    fontSize: "medium",
    compactMode: false,
  });

  const [regional, setRegional] = useState({
    language: "id",
    timezone: "Asia/Jakarta",
    currency: "IDR",
    dateFormat: "dd/mm/yyyy",
  });

  const handleSave = () => {
    toast.success("Pengaturan berhasil disimpan!");
  };

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Sidebar tabs */}
      <div className="w-52 shrink-0">
        <nav className="space-y-0.5">
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

      {/* Content */}
      <div className="flex-1 overflow-auto min-w-0">
        {tab === "profile" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-[15px] font-bold text-[hsl(var(--foreground))]">Profil Agen</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Kelola informasi akun dan profil Anda</p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer">
                <div className="h-16 w-16 rounded-2xl gradient-primary shadow-glow flex items-center justify-center text-white text-xl font-bold">
                  TA
                </div>
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera strokeWidth={1.5} className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-[hsl(var(--foreground))]">{profile.name}</p>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">{profile.email}</p>
                <button className="text-[12px] text-[hsl(var(--primary))] font-medium hover:underline mt-0.5">Ubah foto</button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Nama Lengkap</Label>
                  <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Email</Label>
                  <Input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">No. Telepon</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Nama Agen Travel</Label>
                  <Input value={profile.agency} onChange={(e) => setProfile((p) => ({ ...p, agency: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">Alamat Kantor</Label>
                <Input value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">Bio Singkat</Label>
                <textarea
                  rows={3}
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>
            </div>
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-[15px] font-bold text-[hsl(var(--foreground))]">Notifikasi</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Atur kapan dan bagaimana Anda menerima notifikasi</p>
            </div>
            <div className="space-y-3">
              {[
                { key: "tripReminder" as const, label: "Pengingat Trip", desc: "Notifikasi H-7 dan H-1 sebelum keberangkatan" },
                { key: "newMessage" as const, label: "Pesan Baru", desc: "Notifikasi saat ada pesan masuk dari jamaah" },
                { key: "paymentAlert" as const, label: "Konfirmasi Pembayaran", desc: "Notifikasi pembayaran DP dan pelunasan" },
                { key: "weeklyReport" as const, label: "Laporan Mingguan", desc: "Ringkasan aktivitas dikirim setiap Senin pagi" },
                { key: "marketing" as const, label: "Info & Promosi", desc: "Penawaran dan pembaruan produk dari TravelHub" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl border border-[hsl(var(--border))] bg-white">
                  <div>
                    <p className="text-[13.5px] font-medium text-[hsl(var(--foreground))]">{item.label}</p>
                    <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notif[item.key]}
                    onCheckedChange={(v) => setNotif((n) => ({ ...n, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-[15px] font-bold text-[hsl(var(--foreground))]">Keamanan Akun</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Kelola kata sandi dan keamanan akun Anda</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">Kata Sandi Saat Ini</Label>
                <Input type="password" placeholder="••••••••" value={security.currentPw} onChange={(e) => setSecurity((s) => ({ ...s, currentPw: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Kata Sandi Baru</Label>
                  <Input type="password" placeholder="••••••••" value={security.newPw} onChange={(e) => setSecurity((s) => ({ ...s, newPw: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Konfirmasi Sandi Baru</Label>
                  <Input type="password" placeholder="••••••••" value={security.confirmPw} onChange={(e) => setSecurity((s) => ({ ...s, confirmPw: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
              <h3 className="text-[13.5px] font-semibold text-[hsl(var(--foreground))]">Keamanan Lanjutan</h3>
              {[
                { key: "twoFactor" as const, label: "Autentikasi Dua Faktor (2FA)", desc: "Tambahkan lapisan keamanan ekstra saat login" },
                { key: "loginAlert" as const, label: "Notifikasi Login Baru", desc: "Terima email saat ada login dari perangkat baru" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl border border-[hsl(var(--border))] bg-white">
                  <div>
                    <p className="text-[13.5px] font-medium text-[hsl(var(--foreground))]">{item.label}</p>
                    <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">{item.desc}</p>
                  </div>
                  <Switch
                    checked={security[item.key]}
                    onCheckedChange={(v) => setSecurity((s) => ({ ...s, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "appearance" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-[15px] font-bold text-[hsl(var(--foreground))]">Tampilan</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Sesuaikan tampilan aplikasi sesuai preferensi Anda</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">Tema</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "light", label: "Terang", preview: "bg-white border" },
                    { key: "dark", label: "Gelap", preview: "bg-gray-800" },
                    { key: "auto", label: "Otomatis", preview: "bg-gradient-to-r from-white to-gray-800" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setAppearance((a) => ({ ...a, theme: t.key }))}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                        appearance.theme === t.key ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]" : "border-[hsl(var(--border))]"
                      )}
                    >
                      <div className={cn("h-10 w-full rounded-lg border", t.preview)} />
                      <span className="text-[12px] font-medium text-[hsl(var(--foreground))]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-foreground))]">Ukuran Teks</Label>
                <Select value={appearance.fontSize} onValueChange={(v) => setAppearance((a) => ({ ...a, fontSize: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
                    <SelectItem value="small">Kecil</SelectItem>
                    <SelectItem value="medium">Sedang (Default)</SelectItem>
                    <SelectItem value="large">Besar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl border border-[hsl(var(--border))] bg-white">
                <div>
                  <p className="text-[13.5px] font-medium text-[hsl(var(--foreground))]">Mode Compact</p>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">Kurangi padding dan jarak untuk tampilan lebih padat</p>
                </div>
                <Switch
                  checked={appearance.compactMode}
                  onCheckedChange={(v) => setAppearance((a) => ({ ...a, compactMode: v }))}
                />
              </div>
            </div>
          </div>
        )}

        {tab === "regional" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-[15px] font-bold text-[hsl(var(--foreground))]">Regional</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Pengaturan bahasa, zona waktu, dan format</p>
            </div>
            <div className="grid gap-4">
              {[
                {
                  key: "language", label: "Bahasa", opts: [
                    { v: "id", l: "Bahasa Indonesia" },
                    { v: "en", l: "English" },
                    { v: "ar", l: "العربية" },
                  ]
                },
                {
                  key: "timezone", label: "Zona Waktu", opts: [
                    { v: "Asia/Jakarta", l: "WIB — Jakarta (UTC+7)" },
                    { v: "Asia/Makassar", l: "WITA — Makassar (UTC+8)" },
                    { v: "Asia/Jayapura", l: "WIT — Jayapura (UTC+9)" },
                  ]
                },
                {
                  key: "currency", label: "Mata Uang Default", opts: [
                    { v: "IDR", l: "IDR — Rupiah Indonesia" },
                    { v: "USD", l: "USD — US Dollar" },
                    { v: "SAR", l: "SAR — Saudi Riyal" },
                  ]
                },
                {
                  key: "dateFormat", label: "Format Tanggal", opts: [
                    { v: "dd/mm/yyyy", l: "DD/MM/YYYY" },
                    { v: "mm/dd/yyyy", l: "MM/DD/YYYY" },
                    { v: "yyyy-mm-dd", l: "YYYY-MM-DD" },
                  ]
                },
              ].map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">{field.label}</Label>
                  <Select
                    value={(regional as Record<string, string>)[field.key]}
                    onValueChange={(v) => setRegional((r) => ({ ...r, [field.key]: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: "#fff", color: "hsl(var(--foreground))" }}>
                      {field.opts.map((o) => (
                        <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="mt-8 pt-5 border-t border-[hsl(var(--border))] max-w-xl">
          <Button onClick={handleSave} className="gradient-primary text-white shadow-glow hover:opacity-90 rounded-xl px-6">
            <Save strokeWidth={1.5} className="h-4 w-4 mr-2" /> Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
