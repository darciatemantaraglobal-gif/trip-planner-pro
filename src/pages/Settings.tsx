import { useEffect, useState } from "react";
import { User, Bell, Shield, Palette, Globe, Save, Camera, TrendingUp, RefreshCw, Users, Plus, Trash2, Radio, PencilLine, KeyRound, Clock, CheckCircle2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  applyAppearanceSettings,
  loadAppearanceSettings,
  saveAppearanceSettings,
  type AppearanceFontSize,
  type AppearanceSettings,
  type AppearanceTheme,
} from "@/lib/appearance";
import { useRatesStore } from "@/store/ratesStore";
import { useAuthStore, type Credential, type LoginEvent } from "@/store/authStore";
import { useRegionalStore } from "@/store/regionalStore";

const TABS = [
  { key: "profile",       label: "Profil",     icon: User },
  { key: "notifications", label: "Notifikasi", icon: Bell },
  { key: "security",      label: "Keamanan",   icon: Shield },
  { key: "appearance",    label: "Tampilan",   icon: Palette },
  { key: "regional",      label: "Regional",   icon: Globe },
  { key: "rates",         label: "Kurs",       icon: TrendingUp },
  { key: "agents",        label: "Agen",       icon: Users },
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
    name: "",
    email: "",
    phone: "",
    agency: "",
    address: "",
    bio: "",
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

  const [appearance, setAppearance] = useState<AppearanceSettings>(() => loadAppearanceSettings());

  const {
    rates,
    rawRates,
    manualRates,
    mode: rateMode,
    lastUpdated,
    loading: ratesLoading,
    markupPct,
    setMarkup,
    setMode: setRateMode,
    setManualRate,
    refresh: refreshRates,
  } = useRatesStore();

  const {
    user,
    addAgent,
    removeAgent,
    allCredentials,
    changePassword,
    getSecuritySettings,
    updateSecuritySettings,
    setupPin,
    getLoginHistory,
  } = useAuthStore();

  const [agents, setAgents] = useState<Credential[]>([]);
  const [newAgentUsername, setNewAgentUsername] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentPass, setNewAgentPass] = useState("");
  const [addingAgent, setAddingAgent] = useState(false);

  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (tab === "agents") setAgents(allCredentials());
  }, [tab]);

  useEffect(() => {
    if (tab === "security") {
      const sec = getSecuritySettings();
      setSecurity((s) => ({ ...s, twoFactor: sec.twoFactor, loginAlert: sec.loginAlert }));
      setLoginHistory(getLoginHistory());
    }
  }, [tab]);

  const handleAddAgent = async () => {
    if (!newAgentUsername || !newAgentName || !newAgentPass) {
      toast.error("Lengkapi semua field agen."); return;
    }
    setAddingAgent(true);
    try {
      await addAgent(newAgentUsername, newAgentName, newAgentPass);
      setAgents(allCredentials());
      setNewAgentUsername(""); setNewAgentName(""); setNewAgentPass("");
      toast.success("Agen berhasil ditambahkan.");
    } catch (e: any) {
      toast.error(e.message);
    }
    setAddingAgent(false);
  };

  const handleRemoveAgent = (username: string) => {
    removeAgent(username);
    setAgents(allCredentials());
    toast.success("Agen dihapus.");
  };

  const { language, timezone, currency, dateFormat, setRegional } = useRegionalStore();
  const regional = { language, timezone, currency, dateFormat };

  useEffect(() => {
    applyAppearanceSettings(appearance);
    saveAppearanceSettings(appearance);
  }, [appearance]);

  const handleSave = () => {
    applyAppearanceSettings(appearance);
    saveAppearanceSettings(appearance);
    toast.success("Pengaturan berhasil disimpan!");
  };

  const handleChangePassword = async () => {
    if (!security.currentPw) { toast.error("Masukkan kata sandi saat ini."); return; }
    if (!security.newPw) { toast.error("Masukkan kata sandi baru."); return; }
    if (security.newPw !== security.confirmPw) { toast.error("Konfirmasi kata sandi tidak cocok."); return; }
    setSavingPassword(true);
    try {
      await changePassword(security.currentPw, security.newPw);
      setSecurity((s) => ({ ...s, currentPw: "", newPw: "", confirmPw: "" }));
      toast.success("Kata sandi berhasil diubah.");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSavingPassword(false);
  };

  const handleToggle2FA = (enabled: boolean) => {
    if (enabled) {
      setPinInput(""); setPinConfirm("");
      setPinDialogOpen(true);
    } else {
      updateSecuritySettings({ twoFactor: false, pinHash: undefined });
      setSecurity((s) => ({ ...s, twoFactor: false }));
      toast.success("Autentikasi 2FA dinonaktifkan.");
    }
  };

  const handleSavePin = async () => {
    if (pinInput.length < 4) { toast.error("PIN minimal 4 digit."); return; }
    if (pinInput !== pinConfirm) { toast.error("Konfirmasi PIN tidak cocok."); return; }
    setPinLoading(true);
    try {
      await setupPin(pinInput);
      updateSecuritySettings({ twoFactor: true });
      setSecurity((s) => ({ ...s, twoFactor: true }));
      setPinDialogOpen(false);
      setPinInput(""); setPinConfirm("");
      toast.success("Autentikasi 2FA diaktifkan.", { description: "PIN keamanan berhasil disimpan." });
    } catch {
      toast.error("Gagal menyimpan PIN. Coba lagi.");
    }
    setPinLoading(false);
  };

  const handleToggleLoginAlert = (enabled: boolean) => {
    updateSecuritySettings({ loginAlert: enabled });
    setSecurity((s) => ({ ...s, loginAlert: enabled }));
    toast.success(enabled ? "Notifikasi login diaktifkan." : "Notifikasi login dinonaktifkan.");
  };

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
                  {profile.name ? profile.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?"}
                </div>
                <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera strokeWidth={1.5} className="h-4 w-4 text-white" />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{profile.name || <span className="text-[hsl(var(--muted-foreground))] font-normal italic">Belum diisi</span>}</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{profile.email || "—"}</p>
                <button className="text-[11px] text-[hsl(var(--primary))] font-medium hover:underline mt-0.5">Ubah foto</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Nama Lengkap</Label>
                <Input className="h-9 text-sm" placeholder="cth: Ahmad Fauzi" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Email</Label>
                <Input className="h-9 text-sm" type="email" placeholder="cth: agen@ightour.id" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">No. Telepon</Label>
                <Input className="h-9 text-sm" placeholder="cth: 0812-3456-7890" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Nama Agen</Label>
                <Input className="h-9 text-sm" placeholder="cth: IGH Tour & Travel" value={profile.agency} onChange={(e) => setProfile((p) => ({ ...p, agency: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Alamat Kantor</Label>
                <Input className="h-9 text-sm" placeholder="cth: Jl. Sudirman No. 1, Jakarta" value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Bio Singkat</Label>
                <textarea
                  rows={2}
                  value={profile.bio}
                  placeholder="Ceritakan sedikit tentang agen travel Anda…"
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

            {/* Password Change */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-4 w-4 text-[hsl(var(--primary))]" />
                <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">Ubah Kata Sandi</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Kata Sandi Saat Ini</Label>
                <Input className="h-9 text-sm" type="password" placeholder="••••••••" value={security.currentPw} onChange={(e) => setSecurity((s) => ({ ...s, currentPw: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Sandi Baru</Label>
                  <Input className="h-9 text-sm" type="password" placeholder="min. 6 karakter" value={security.newPw} onChange={(e) => setSecurity((s) => ({ ...s, newPw: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Konfirmasi</Label>
                  <Input className="h-9 text-sm" type="password" placeholder="••••••••" value={security.confirmPw} onChange={(e) => setSecurity((s) => ({ ...s, confirmPw: e.target.value }))} />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !security.currentPw || !security.newPw || !security.confirmPw}
                className="h-8 px-4 rounded-xl text-xs gradient-primary text-white"
              >
                {savingPassword ? "Menyimpan…" : "Simpan Kata Sandi"}
              </Button>
            </div>

            {/* Advanced Security */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[hsl(var(--foreground))] px-1">Keamanan Lanjutan</p>
              <div className="flex items-center justify-between py-3 px-3 rounded-xl border border-[hsl(var(--border))] bg-white gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12.5px] font-medium text-[hsl(var(--foreground))] leading-tight">Autentikasi 2FA</p>
                    {security.twoFactor && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-tight">
                    {security.twoFactor ? "PIN keamanan diperlukan saat login" : "Lapisan keamanan ekstra saat login menggunakan PIN"}
                  </p>
                </div>
                <Switch checked={security.twoFactor} onCheckedChange={handleToggle2FA} className="shrink-0" />
              </div>
              <div className="flex items-center justify-between py-3 px-3 rounded-xl border border-[hsl(var(--border))] bg-white gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-[hsl(var(--foreground))] leading-tight">Notifikasi Login Baru</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-tight">Tampilkan peringatan setiap kali ada sesi login baru</p>
                </div>
                <Switch checked={security.loginAlert} onCheckedChange={handleToggleLoginAlert} className="shrink-0" />
              </div>
            </div>

            {/* Login History */}
            {loginHistory.length > 0 && (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))]">
                  <Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-[12px] font-semibold text-[hsl(var(--foreground))]">Riwayat Login Terakhir</p>
                </div>
                <div className="divide-y divide-[hsl(var(--border))]">
                  {loginHistory.slice(0, 5).map((event, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {i === 0 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-[hsl(var(--border))] shrink-0" />
                        )}
                        <span className="text-[12px] text-[hsl(var(--foreground))]">
                          {i === 0 ? "Sesi ini" : `Login ke-${i + 1}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                          timeZone: "Asia/Jakarta",
                        }).format(new Date(event.at))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PIN Setup Dialog */}
        <Dialog open={pinDialogOpen} onOpenChange={(o) => { if (!o) { setPinDialogOpen(false); setPinInput(""); setPinConfirm(""); } }}>
          <DialogContent className="max-w-sm bg-white">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-orange-100 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-orange-600" />
                </div>
                <DialogTitle className="text-[15px]">Buat PIN Keamanan</DialogTitle>
              </div>
              <DialogDescription className="text-[12px] mt-1">
                PIN ini diperlukan setiap kali login. Gunakan 4–8 digit angka.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Buat PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="min. 4 digit"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  className="h-10 text-center tracking-widest text-lg font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">Konfirmasi PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="ulangi PIN"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                  className="h-10 text-center tracking-widest text-lg font-bold"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 h-9 rounded-xl text-xs"
                  onClick={() => { setPinDialogOpen(false); setPinInput(""); setPinConfirm(""); }}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1 h-9 rounded-xl text-xs gradient-primary text-white"
                  onClick={handleSavePin}
                  disabled={pinLoading || pinInput.length < 4}
                >
                  {pinLoading ? "Menyimpan…" : "Aktifkan 2FA"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                    onClick={() => setAppearance((a) => ({ ...a, theme: t.key as AppearanceTheme }))}
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
              <Select value={appearance.fontSize} onValueChange={(v) => setAppearance((a) => ({ ...a, fontSize: v as AppearanceFontSize }))}>
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
            <SectionHeader title="Regional" desc="Pengaturan bahasa, zona waktu, mata uang, dan format tanggal — diterapkan otomatis ke seluruh aplikasi" />
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
                    onValueChange={(v) => {
                      setRegional({ [field.key]: v } as Parameters<typeof setRegional>[0]);
                      toast.success("Pengaturan regional diperbarui", { description: "Perubahan langsung diterapkan ke seluruh aplikasi." });
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: "#fff" }}>
                      {field.opts.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Live preview */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 space-y-3">
              <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Preview Format Aktif</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Angka / Mata Uang</p>
                  <p className="text-sm font-bold text-[hsl(var(--foreground))]">
                    {currency === "IDR"
                      ? `Rp ${(25000000).toLocaleString(language === "id" ? "id-ID" : "en-US")}`
                      : currency === "USD"
                        ? `$ ${(25000000 / (rates.USD || 16000)).toLocaleString(language === "id" ? "id-ID" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `SAR ${(25000000 / (rates.SAR || 4250)).toLocaleString(language === "id" ? "id-ID" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Tanggal</p>
                  <p className="text-sm font-bold text-[hsl(var(--foreground))]">
                    {(() => {
                      const d = new Date("2025-07-15T00:00:00");
                      if (dateFormat === "dd/mm/yyyy") {
                        const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(d);
                        const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "??";
                        return `${get("day")}/${get("month")}/${get("year")}`;
                      }
                      if (dateFormat === "mm/dd/yyyy") {
                        const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(d);
                        const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "??";
                        return `${get("month")}/${get("day")}/${get("year")}`;
                      }
                      const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(d);
                      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "??";
                      return `${get("year")}-${get("month")}-${get("day")}`;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Tanggal Panjang</p>
                  <p className="text-sm font-bold text-[hsl(var(--foreground))]">
                    {new Intl.DateTimeFormat(language === "id" ? "id-ID" : language === "ar" ? "ar-SA" : "en-US", {
                      day: "numeric", month: "long", year: "numeric", timeZone: timezone,
                    }).format(new Date("2025-07-15T00:00:00"))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Zona Waktu</p>
                  <p className="text-sm font-bold text-[hsl(var(--foreground))]">
                    {new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
                      hour: "2-digit", minute: "2-digit", timeZone: timezone, timeZoneName: "short",
                    }).format(new Date())}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
              <Globe className="h-3 w-3 inline" />
              Perubahan disimpan otomatis dan langsung berlaku di seluruh halaman.
            </p>
          </div>
        )}

        {tab === "rates" && (
          <div className="space-y-5 max-w-xl">
            <SectionHeader title="Kurs & Buffer Harga" desc="Pakai kurs live otomatis atau kurs manual sesuai kondisi lapangan" />

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRateMode("live")}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    rateMode === "live"
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Radio className="h-4 w-4" />
                    Live
                  </div>
                  <p className="mt-1 text-[11px] leading-snug">
                    Ambil kurs otomatis dari internet, cocok untuk patokan harian.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRateMode("manual")}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    rateMode === "manual"
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <PencilLine className="h-4 w-4" />
                    Manual Lapangan
                  </div>
                  <p className="mt-1 text-[11px] leading-snug">
                    Isi sendiri kalau money changer/vendor pakai kurs berbeda.
                  </p>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold">Kurs Aktif (IDR)</span>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Mode: {rateMode === "manual" ? "Manual Lapangan" : "Live Otomatis"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {lastUpdated && (
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      Update: {lastUpdated.toLocaleTimeString("id-ID")}
                    </span>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => refreshRates()} disabled={ratesLoading}>
                    <RefreshCw className={cn("h-3 w-3 mr-1", ratesLoading && "animate-spin")} />
                    {ratesLoading ? "Memuat…" : "Refresh"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[hsl(var(--border))]">
                {(["USD", "SAR"] as const).map((cur) => (
                  <div key={cur} className="px-5 py-4">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium">1 {cur} =</p>
                    <p className="text-xl font-bold text-[hsl(var(--foreground))] mt-1">
                      Rp {rates[cur].toLocaleString("id-ID")}
                    </p>
                    {markupPct > 0 && (
                      <p className="text-[10px] text-orange-500 mt-0.5">
                        Dasar: Rp {rawRates[cur].toLocaleString("id-ID")} + {markupPct}% markup
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 space-y-4">
              <div>
                <Label className="text-sm font-semibold">Kurs Manual Lapangan</Label>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Nilai ini dipakai saat mode Manual Lapangan aktif.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["USD", "SAR"] as const).map((cur) => (
                  <div key={cur} className="space-y-1">
                    <Label className="text-[11px] text-[hsl(var(--muted-foreground))]">1 {cur} = Rp</Label>
                    <Input
                      type="number"
                      min={1}
                      value={manualRates[cur]}
                      onChange={(e) => setManualRate(cur, Number(e.target.value))}
                      className="h-10 text-sm"
                    />
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      Live saat ini: Rp {rawRates[cur].toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant={rateMode === "manual" ? "default" : "outline"}
                className={cn("h-9 rounded-xl text-xs", rateMode === "manual" && "gradient-primary text-white")}
                onClick={() => {
                  setRateMode("manual");
                  toast.success("Kurs manual dipakai untuk kalkulator.");
                }}
              >
                Pakai Kurs Manual
              </Button>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Buffer / Markup Harga</Label>
                  <span className="text-sm font-bold text-orange-500">{markupPct.toFixed(1)}%</span>
                </div>
                <Slider
                  min={0}
                  max={5}
                  step={0.5}
                  value={[markupPct]}
                  onValueChange={([v]) => setMarkup(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))] mt-1.5">
                  <span>0% (tanpa markup)</span>
                  <span>5% (aman dari fluktuasi)</span>
                </div>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                Markup akan ditambahkan ke kurs aktif, baik live maupun manual. Direkomendasikan 1–2% untuk melindungi margin dari fluktuasi harian.
              </p>
            </div>
          </div>
        )}

        {tab === "agents" && user?.role === "superadmin" && (
          <div className="space-y-5 max-w-xl">
            <SectionHeader title="Manajemen Agen" desc="Tambah, lihat, dan hapus akun agen yang bisa login secara mandiri" />

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                <p className="text-sm font-semibold">Tambah Agen Baru</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Username</Label>
                  <Input value={newAgentUsername} onChange={(e) => setNewAgentUsername(e.target.value)} placeholder="cth: agen01" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nama Lengkap</Label>
                  <Input value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} placeholder="cth: Ahmad Fauzi" className="h-9 text-sm" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Password</Label>
                  <div className="flex gap-2">
                    <Input type="password" value={newAgentPass} onChange={(e) => setNewAgentPass(e.target.value)} placeholder="min. 6 karakter" className="h-9 text-sm" />
                    <Button onClick={handleAddAgent} disabled={addingAgent} className="h-9 px-4 rounded-xl gradient-primary text-white shrink-0">
                      <Plus className="h-4 w-4 mr-1" /> Tambah
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                <p className="text-sm font-semibold">Daftar Pengguna ({agents.length})</p>
              </div>
              <div className="divide-y divide-[hsl(var(--border))]">
                {agents.map((a) => (
                  <div key={a.username} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{a.displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">@{a.username}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                          a.role === "superadmin" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                        )}>{a.role}</span>
                      </div>
                    </div>
                    {a.username !== user?.username && a.role !== "superadmin" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                        onClick={() => handleRemoveAgent(a.username)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "agents" && user?.role !== "superadmin" && (
          <div className="max-w-xl py-8 text-center">
            <p className="text-[hsl(var(--muted-foreground))] text-sm">Hanya superadmin yang dapat mengelola agen.</p>
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
