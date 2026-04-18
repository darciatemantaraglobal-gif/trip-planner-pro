import { useState } from "react";
import { ChevronDown, Search, MessageCircle, BookOpen, Phone, Mail, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_SECTIONS = [
  {
    category: "Paket & Perjalanan",
    icon: "✈️",
    items: [
      {
        q: "Bagaimana cara menambahkan paket trip baru?",
        a: "Masuk ke halaman Dashboard, lalu klik tombol 'Tambah Paket Trip' di pojok kanan atas. Isi nama paket, destinasi, tanggal berangkat, dan tanggal pulang. Pilih emoji yang sesuai untuk ikon paket.",
      },
      {
        q: "Apakah bisa mengubah foto cover pada card trip?",
        a: "Ya! Arahkan kursor ke atas card trip, lalu klik ikon kamera yang muncul di pojok kanan bawah gambar. Pilih foto dari perangkat Anda (format JPG/PNG). Foto akan tersimpan otomatis.",
      },
      {
        q: "Bagaimana cara menghapus paket trip?",
        a: "Arahkan kursor ke card trip, lalu klik ikon sampah di pojok kanan atas gambar. Konfirmasi penghapusan pada dialog yang muncul. Perhatikan bahwa semua data jamaah di dalamnya juga akan ikut terhapus.",
      },
    ] as FaqItem[],
  },
  {
    category: "Data Jamaah",
    icon: "👥",
    items: [
      {
        q: "Bagaimana cara menambahkan data jamaah?",
        a: "Buka detail paket trip, lalu klik tombol 'Tambah Jamaah'. Isi formulir dengan nama, jenis kelamin, nomor HP, tanggal lahir, dan nomor paspor. Anda juga bisa upload foto dan dokumen pendukung.",
      },
      {
        q: "Dokumen apa saja yang bisa di-upload?",
        a: "Anda bisa upload berbagai kategori dokumen: Paspor/KTP, Visa, Tiket Pesawat, Dokumen Kesehatan, dan Lainnya. Format yang didukung adalah JPG, PNG, dan PDF (maks. 5 MB per file).",
      },
      {
        q: "Apakah data jamaah aman tersimpan?",
        a: "Data jamaah saat ini tersimpan di penyimpanan lokal browser Anda (localStorage). Data tidak dikirim ke server manapun. Pastikan untuk tidak menghapus cache browser agar data tidak hilang.",
      },
    ] as FaqItem[],
  },
  {
    category: "Kalkulator & Harga",
    icon: "🧮",
    items: [
      {
        q: "Bagaimana cara menghitung biaya paket trip?",
        a: "Masuk ke halaman Kalkulator melalui menu sidebar. Masukkan biaya komponen (penerbangan, hotel, visa, transport, pemandu). Pilih mata uang sumber dan konversi otomatis ke IDR akan dihitung secara real-time.",
      },
      {
        q: "Dari mana kurs mata uang diambil?",
        a: "Kurs diambil secara otomatis saat aplikasi dibuka. Nilai kurs bersifat estimasi dan mungkin berbeda dengan kurs resmi bank. Selalu konfirmasi ke bank atau money changer untuk transaksi aktual.",
      },
      {
        q: "Apakah bisa mencetak laporan perhitungan?",
        a: "Ya! Di halaman Kalkulator, setelah memasukkan semua biaya, klik tombol 'Buat PDF' untuk mengunduh laporan perhitungan dalam format PDF.",
      },
    ] as FaqItem[],
  },
  {
    category: "Teknis & Akun",
    icon: "⚙️",
    items: [
      {
        q: "Apakah bisa diakses dari perangkat berbeda?",
        a: "Saat ini data tersimpan di localStorage browser masing-masing perangkat, sehingga tidak tersinkronisasi antar perangkat. Fitur sinkronisasi cloud sedang dalam tahap pengembangan.",
      },
      {
        q: "Bagaimana jika data tidak muncul setelah refresh?",
        a: "Pastikan Anda tidak menggunakan mode incognito/private. Data localStorage tidak disimpan di mode incognito. Jika menggunakan browser normal, data seharusnya tetap ada setelah refresh.",
      },
    ] as FaqItem[],
  },
];

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[hsl(var(--secondary))] transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-[13.5px] font-medium text-[hsl(var(--foreground))] pr-4">{item.q}</span>
            <ChevronDown
              strokeWidth={1.5}
              className={cn("h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0 transition-transform", open === i && "rotate-180")}
            />
          </button>
          {open === i && (
            <div className="px-4 pb-4 text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed border-t border-[hsl(var(--border))] pt-3">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Support() {
  const [search, setSearch] = useState("");

  const filtered = FAQ_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter(
      (item) =>
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center pt-2">
        <div className="h-16 w-16 rounded-3xl gradient-primary shadow-glow flex items-center justify-center mx-auto mb-4">
          <BookOpen strokeWidth={1.5} className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Pusat Bantuan</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Temukan jawaban atas pertanyaan umum atau hubungi tim kami
        </p>
        {/* Search */}
        <div className="relative mt-5 max-w-md mx-auto">
          <Search strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Cari pertanyaan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 bg-[hsl(var(--secondary))] border-0 rounded-2xl text-sm"
          />
        </div>
      </div>

      {/* FAQ */}
      {filtered.length > 0 ? (
        <div className="space-y-6">
          {filtered.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{section.icon}</span>
                <h2 className="text-[14px] font-semibold text-[hsl(var(--foreground))]">{section.category}</h2>
              </div>
              <FaqAccordion items={section.items} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))] text-sm">
          Tidak ada hasil untuk "{search}"
        </div>
      )}

      {/* Contact cards */}
      <div className="border-t border-[hsl(var(--border))] pt-8">
        <h2 className="text-[14px] font-semibold text-[hsl(var(--foreground))] mb-4 text-center">Masih butuh bantuan?</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: MessageCircle, label: "Live Chat", desc: "Chat dengan tim kami", action: "Mulai Chat" },
            { icon: Mail, label: "Email", desc: "support@travelhub.io", action: "Kirim Email" },
            { icon: Phone, label: "Telepon", desc: "+62 812-3456-7890", action: "Hubungi" },
          ].map((c) => (
            <div
              key={c.label}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-all group text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-[hsl(var(--accent))] group-hover:bg-white flex items-center justify-center">
                <c.icon strokeWidth={1.5} className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{c.label}</p>
                <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">{c.desc}</p>
              </div>
              <Button variant="outline" size="sm" className="mt-1 h-7 text-xs rounded-lg gap-1">
                {c.action} <ExternalLink strokeWidth={1.5} className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
