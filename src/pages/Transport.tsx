import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Plus, Trash2, Calendar as CalendarIcon, MapPin, Users, Clock, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/authStore";
import { useTripsStore } from "@/store/tripsStore";
import { toast } from "sonner";

// ── Tipe rute transportasi sesuai permintaan ──
const ROUTE_TYPES = [
  { value: "CT_MAKKAH",        label: "CT MAKKAH",                     hint: "City Tour Makkah (Ziarah dlm kota)" },
  { value: "CT_MADINAH",       label: "CT MADINAH",                    hint: "City Tour Madinah (Ziarah dlm kota)" },
  { value: "HOTEL_STATION_MM", label: "HOTEL STATION MAKKAH/MADINAH",  hint: "Antar-jemput hotel ↔ stasiun (HHR Train)" },
] as const;
type RouteType = typeof ROUTE_TYPES[number]["value"];

// Reuse list kendaraan dari Calculator biar konsisten
const VEHICLE_TYPES = ["Camry", "GMC", "Staria", "Hiace", "Coaster", "Bus", "HHR Train"] as const;

interface TransportEntry {
  id: string;
  agencyId: string;
  date: string;          // ISO yyyy-mm-dd
  routeType: RouteType;
  tripId: string;        // boleh kosong
  tripName: string;      // snapshot supaya tetep ke-display walau trip dihapus
  vehicle: string;
  fleetCount: number;
  pax: number;
  pickupTime: string;    // HH:mm
  pickupLocation: string;
  notes: string;
  createdAt: number;
}

const STORAGE_KEY = "ightour:transport:v1";

function loadEntries(agencyId: string): TransportEntry[] {
  if (!agencyId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as TransportEntry[];
    return all.filter((e) => e.agencyId === agencyId).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

function saveEntries(agencyId: string, entries: TransportEntry[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as TransportEntry[]) : [];
    // buang entries lama agency ini, ganti dgn yang baru
    const others = all.filter((e) => e.agencyId !== agencyId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...entries]));
  } catch (e) {
    console.error("[Transport] save failed:", e);
  }
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowHHmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function routeMeta(rt: RouteType) {
  return ROUTE_TYPES.find((r) => r.value === rt) ?? ROUTE_TYPES[0];
}

export default function Transport() {
  const { user } = useAuthStore();
  const { trips, fetchTrips } = useTripsStore();
  const agencyId = user?.agencyId ?? "";

  const [entries, setEntries] = useState<TransportEntry[]>([]);
  const [filter, setFilter] = useState<"all" | RouteType>("all");

  // form state
  const [date, setDate] = useState(todayISO());
  const [routeType, setRouteType] = useState<RouteType>("CT_MAKKAH");
  const [tripId, setTripId] = useState<string>("");
  const [vehicle, setVehicle] = useState<string>("Hiace");
  const [fleetCount, setFleetCount] = useState<number>(1);
  const [pax, setPax] = useState<number>(0);
  const [pickupTime, setPickupTime] = useState<string>(nowHHmm());
  const [pickupLocation, setPickupLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { void fetchTrips(); }, [fetchTrips]);
  useEffect(() => { setEntries(loadEntries(agencyId)); }, [agencyId]);

  const filtered = useMemo(() => {
    return filter === "all" ? entries : entries.filter((e) => e.routeType === filter);
  }, [entries, filter]);

  function resetForm() {
    setDate(todayISO());
    setRouteType("CT_MAKKAH");
    setTripId("");
    setVehicle("Hiace");
    setFleetCount(1);
    setPax(0);
    setPickupTime(nowHHmm());
    setPickupLocation("");
    setNotes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyId) { toast.error("Belum login / belum ada agency"); return; }
    if (!date) { toast.error("Tanggal wajib diisi"); return; }
    if (pax < 0 || fleetCount < 1) { toast.error("Pax / armada tidak valid"); return; }

    const trip = trips.find((t) => t.id === tripId);
    const newEntry: TransportEntry = {
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      agencyId,
      date,
      routeType,
      tripId,
      tripName: trip?.name ?? "",
      vehicle,
      fleetCount,
      pax,
      pickupTime,
      pickupLocation: pickupLocation.trim(),
      notes: notes.trim(),
      createdAt: Date.now(),
    };

    const next = [newEntry, ...entries];
    setEntries(next);
    saveEntries(agencyId, next);
    toast.success(`Rute ${routeMeta(routeType).label} ditambah`);
    resetForm();
  }

  function handleDelete(id: string) {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveEntries(agencyId, next);
    toast.success("Rute dihapus");
  }

  return (
    <div className="px-3 py-4 sm:px-6 sm:py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-3"
      >
        <div className="rounded-2xl bg-orange-100 p-2.5">
          <Bus className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Transportasi</h1>
          <p className="text-sm text-slate-500">Catat rute & armada untuk City Tour dan transfer hotel ↔ stasiun.</p>
        </div>
      </motion.div>

      {/* Form */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-orange-600" /> Tambah Rute Baru
          </CardTitle>
          <CardDescription>Pilih jenis rute, tanggal, kendaraan, dan jumlah jamaah.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Jenis Rute (3 button kartu) */}
            <div>
              <Label className="mb-2 block">Jenis Rute *</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {ROUTE_TYPES.map((rt) => {
                  const active = routeType === rt.value;
                  return (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setRouteType(rt.value)}
                      className={`text-left rounded-2xl border p-3 transition-all ${
                        active
                          ? "border-orange-500 bg-orange-50 shadow-sm ring-1 ring-orange-200"
                          : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`h-4 w-4 ${active ? "text-orange-600" : "text-slate-400"}`} />
                        <span className="font-semibold text-[13px] text-slate-900 leading-tight">{rt.label}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">{rt.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="t-date" className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> Tanggal *
                </Label>
                <Input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="t-time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Jam Penjemputan
                </Label>
                <Input id="t-time" type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="t-trip">Trip / Paket (opsional)</Label>
                <Select value={tripId || "none"} onValueChange={(v) => setTripId(v === "none" ? "" : v)}>
                  <SelectTrigger id="t-trip"><SelectValue placeholder="-- Pilih trip --" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tanpa trip —</SelectItem>
                    {trips.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.emoji} {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="t-loc" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Lokasi Penjemputan
                </Label>
                <Input
                  id="t-loc"
                  placeholder={routeType === "HOTEL_STATION_MM" ? "ex: Hotel Anjum / HHR Station" : "ex: Lobby Hotel"}
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="t-vehicle">Jenis Kendaraan</Label>
                <Select value={vehicle} onValueChange={setVehicle}>
                  <SelectTrigger id="t-vehicle"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="t-fleet">Jumlah Armada</Label>
                  <Input
                    id="t-fleet"
                    type="number"
                    min={1}
                    value={fleetCount}
                    onChange={(e) => setFleetCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  />
                </div>
                <div>
                  <Label htmlFor="t-pax" className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Jumlah Pax
                  </Label>
                  <Input
                    id="t-pax"
                    type="number"
                    min={0}
                    value={pax}
                    onChange={(e) => setPax(Math.max(0, parseInt(e.target.value || "0", 10)))}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="t-notes" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Catatan
              </Label>
              <Textarea
                id="t-notes"
                rows={2}
                placeholder="Catatan tambahan (driver, plat nomor, kontak, dll)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={resetForm}>Reset</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-1" /> Simpan Rute
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Daftar Rute */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Daftar Rute Tersimpan</CardTitle>
              <CardDescription>{entries.length} entri • disimpan lokal di perangkat ini.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={filter} onValueChange={(v) => setFilter(v as "all" | RouteType)}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua rute</SelectItem>
                  {ROUTE_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              <Bus className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              {entries.length === 0 ? "Belum ada rute. Tambah dari form di atas." : "Tidak ada rute untuk filter ini."}
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {filtered.map((e) => (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-2xl border border-slate-200 bg-white p-3 hover:border-orange-300 hover:bg-orange-50/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                            {routeMeta(e.routeType).label}
                          </Badge>
                          <span className="text-sm font-semibold text-slate-900">{e.date}</span>
                          {e.pickupTime && <span className="text-xs text-slate-500">• {e.pickupTime}</span>}
                          {e.tripName && (
                            <Badge variant="outline" className="text-[10px] font-normal">{e.tripName}</Badge>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-600">
                          <span className="flex items-center gap-1"><Bus className="h-3.5 w-3.5" /> {e.vehicle} × {e.fleetCount}</span>
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {e.pax} pax</span>
                          {e.pickupLocation && (
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.pickupLocation}</span>
                          )}
                        </div>
                        {e.notes && (
                          <p className="mt-1.5 text-[12px] text-slate-500 leading-snug whitespace-pre-wrap">{e.notes}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(e.id)}
                        aria-label="Hapus rute"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
