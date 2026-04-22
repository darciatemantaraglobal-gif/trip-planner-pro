import { FileText, Plus, X } from "lucide-react";

export interface QuotationMeta {
  quoteNumber: string;
  customerName: string;
  dateRange: string;
  hotelMakkahName: string;
  hotelMadinahName: string;
  includedItems: string[];
  excludedItems: string[];
  // ── Group offer (PDF gaya "Penawaran Paket LA") ──
  tier: string;            // cth: "Premium"
  title: string;           // judul utama, bisa multi-line
  subtitle: string;        // cth: "Program 7 Malam"
  makkahStars: number;     // 1..5
  madinahStars: number;    // 1..5
  usdToSar: number;        // cth: 3.75
  website: string;         // cth: "www.umrahservice.co"
  contactPhone: string;    // cth: "+62 812-8955-2018"
  contactName: string;     // cth: "M. FARUQ AL ISLAM"
}

interface Props {
  value: QuotationMeta;
  onChange: (next: QuotationMeta) => void;
}

const M = { fontFamily: "'Manrope', sans-serif" };

function ListEditor({
  title, color, items, onChange,
}: {
  title: string;
  color: "green" | "red";
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const palette = color === "green"
    ? { bg: "bg-emerald-50", border: "border-emerald-200", chip: "bg-emerald-100 text-emerald-700", btn: "border-emerald-300 text-emerald-700 hover:bg-emerald-100" }
    : { bg: "bg-rose-50", border: "border-rose-200", chip: "bg-rose-100 text-rose-700", btn: "border-rose-300 text-rose-700 hover:bg-rose-100" };

  return (
    <div className={`rounded-xl border ${palette.border} ${palette.bg} p-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <span style={M} className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">{title}</span>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className={`inline-flex items-center gap-1 h-6 px-2 rounded-md border ${palette.btn} text-[10.5px] font-bold bg-white`}
        >
          <Plus className="h-3 w-3" /> Tambah
        </button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-[10.5px] text-slate-400 italic">Belum ada item — klik "Tambah"</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className={`shrink-0 w-5 h-5 rounded ${palette.chip} text-[10px] font-extrabold inline-flex items-center justify-center`}>
              {idx + 1}
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                onChange(next);
              }}
              placeholder="cth: Visa Umroh"
              style={M}
              className="flex-1 h-7 rounded-md border border-slate-200 bg-white px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuotationMetaSection({ value, onChange }: Props) {
  function set<K extends keyof QuotationMeta>(key: K, v: QuotationMeta[K]) {
    onChange({ ...value, [key]: v });
  }
  return (
    <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200">
        <FileText className="h-3.5 w-3.5 text-orange-600" />
        <span style={M} className="text-[11.5px] font-extrabold uppercase tracking-wider text-orange-700">
          Info Penawaran (untuk PDF)
        </span>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label className="flex flex-col gap-1">
            <span style={M} className="text-[10px] font-bold text-slate-600">No. Quote</span>
            <input
              type="text"
              value={value.quoteNumber}
              onChange={(e) => set("quoteNumber", e.target.value)}
              placeholder="3345"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={M} className="text-[10px] font-bold text-slate-600">Tier / Badge</span>
            <select
              value={value.tier}
              onChange={(e) => set("tier", e.target.value)}
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="">— tanpa badge —</option>
              <option value="Premium">Premium</option>
              <option value="Reguler">Reguler</option>
              <option value="Promo">Promo</option>
              <option value="VIP">VIP</option>
              <option value="Spesial">Spesial</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span style={M} className="text-[10px] font-bold text-slate-600">Customer (penerima penawaran)</span>
            <input
              type="text"
              value={value.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              placeholder="cth: IGH Tour"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1 col-span-2 md:col-span-3">
            <span style={M} className="text-[10px] font-bold text-slate-600">Judul Penawaran (boleh panjang)</span>
            <input
              type="text"
              value={value.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="cth: Penawaran Paket LA Umrah Bintang 5 Awal Musim"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={M} className="text-[10px] font-bold text-slate-600">Sub-judul / Pill</span>
            <input
              type="text"
              value={value.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="cth: Program 7 Malam"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span style={M} className="text-[10px] font-bold text-slate-600">Tanggal Trip</span>
            <input
              type="text"
              value={value.dateRange}
              onChange={(e) => set("dateRange", e.target.value)}
              placeholder="cth: 01 Jul - 31 Jul 2026"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={M} className="text-[10px] font-bold text-slate-600">KURS 1 USD = … SAR</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={value.usdToSar || ""}
              onChange={(e) => set("usdToSar", parseFloat(e.target.value) || 0)}
              placeholder="3.75"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={M} className="text-[10px] font-bold text-slate-600">Bintang Hotel Makkah</span>
            <select
              value={value.makkahStars}
              onChange={(e) => set("makkahStars", parseInt(e.target.value) || 5)}
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{"★".repeat(s)} ({s})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={M} className="text-[10px] font-bold text-slate-600">Bintang Hotel Madinah</span>
            <select
              value={value.madinahStars}
              onChange={(e) => set("madinahStars", parseInt(e.target.value) || 5)}
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{"★".repeat(s)} ({s})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span style={M} className="text-[10px] font-bold text-slate-600">Hotel Makkah</span>
            <input
              type="text"
              value={value.hotelMakkahName}
              onChange={(e) => set("hotelMakkahName", e.target.value)}
              placeholder="cth: Pullman Zamzam Makkah"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span style={M} className="text-[10px] font-bold text-slate-600">Hotel Madinah</span>
            <input
              type="text"
              value={value.hotelMadinahName}
              onChange={(e) => set("hotelMadinahName", e.target.value)}
              placeholder="cth: Frontel Al Harithia"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span style={M} className="text-[10px] font-bold text-slate-600">Website</span>
            <input
              type="text"
              value={value.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="www.umrahservice.co"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={M} className="text-[10px] font-bold text-slate-600">No. Kontak</span>
            <input
              type="text"
              value={value.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              placeholder="+62 812-8955-2018"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={M} className="text-[10px] font-bold text-slate-600">Nama Kontak</span>
            <input
              type="text"
              value={value.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="M. FARUQ AL ISLAM"
              style={M}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <ListEditor
            title="Harga Sudah Termasuk"
            color="green"
            items={value.includedItems}
            onChange={(next) => set("includedItems", next)}
          />
          <ListEditor
            title="Harga Tidak Termasuk"
            color="red"
            items={value.excludedItems}
            onChange={(next) => set("excludedItems", next)}
          />
        </div>
      </div>
    </div>
  );
}
