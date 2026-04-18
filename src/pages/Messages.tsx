import { useState } from "react";
import { Search, Send, Paperclip, MoreHorizontal, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: string;
  avatar: string;
  preview: string;
  time: string;
  unread: number;
  messages: { id: string; text: string; from: "me" | "them"; time: string }[];
}

const MOCK_THREADS: Message[] = [
  {
    id: "1",
    sender: "Budi Santoso",
    avatar: "BS",
    preview: "Apakah ada slot untuk Umrah Mei?",
    time: "10:24",
    unread: 2,
    messages: [
      { id: "m1", text: "Assalamu'alaikum, saya ingin bertanya mengenai paket Umrah.", from: "them", time: "10:00" },
      { id: "m2", text: "Wa'alaikumsalam, dengan senang hati kami membantu!", from: "me", time: "10:05" },
      { id: "m3", text: "Apakah ada slot untuk Umrah Mei? Saya untuk 4 orang.", from: "them", time: "10:24" },
    ],
  },
  {
    id: "2",
    sender: "Siti Rahayu",
    avatar: "SR",
    preview: "Terima kasih atas informasinya",
    time: "09:15",
    unread: 0,
    messages: [
      { id: "m1", text: "Saya ingin konfirmasi pembayaran DP untuk paket Bali.", from: "them", time: "08:30" },
      { id: "m2", text: "Baik Bu Siti, silakan transfer ke rekening berikut: BCA 1234-5678-90.", from: "me", time: "08:45" },
      { id: "m3", text: "Terima kasih atas informasinya, akan segera saya transfer.", from: "them", time: "09:15" },
    ],
  },
  {
    id: "3",
    sender: "Ahmad Fauzi",
    avatar: "AF",
    preview: "Boleh minta detail itinerary-nya?",
    time: "Kem",
    unread: 1,
    messages: [
      { id: "m1", text: "Halo, saya tertarik dengan paket Umrah Ramadhan.", from: "them", time: "Kem 14:00" },
      { id: "m2", text: "Boleh minta detail itinerary-nya pak?", from: "them", time: "Kem 14:02" },
    ],
  },
  {
    id: "4",
    sender: "Dewi Kusuma",
    avatar: "DK",
    preview: "Oke siap, saya tunggu konfirmasinya",
    time: "Sen",
    unread: 0,
    messages: [
      { id: "m1", text: "Apakah visa sudah diurus oleh agen?", from: "them", time: "Sen 09:00" },
      { id: "m2", text: "Ya Bu Dewi, visa termasuk dalam paket kami.", from: "me", time: "Sen 09:10" },
      { id: "m3", text: "Oke siap, saya tunggu konfirmasinya.", from: "them", time: "Sen 09:15" },
    ],
  },
];

const AVATAR_COLORS = [
  "from-violet-400 to-purple-500",
  "from-pink-400 to-rose-500",
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
];

export default function Messages() {
  const [threads, setThreads] = useState(MOCK_THREADS);
  const [activeId, setActiveId] = useState("1");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const active = threads.find((t) => t.id === activeId);
  const filtered = threads.filter(
    (t) => t.sender.toLowerCase().includes(search.toLowerCase()) || t.preview.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setActiveId(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  };

  const handleSend = () => {
    if (!draft.trim() || !active) return;
    const newMsg = { id: `m-${Date.now()}`, text: draft.trim(), from: "me" as const, time: "Baru saja" };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...t, preview: draft.trim(), time: "Baru saja", messages: [...t.messages, newMsg] }
          : t
      )
    );
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 -m-6 lg:-m-8">
      {/* ── Sidebar list ── */}
      <div className="w-72 xl:w-80 shrink-0 border-r border-[hsl(var(--border))] flex flex-col bg-white">
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h1 className="text-[15px] font-bold text-[hsl(var(--foreground))] mb-3">Pesan</h1>
          <div className="relative">
            <Search strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Cari percakapan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-[hsl(var(--secondary))] border-0 rounded-xl text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((t, i) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--secondary))]",
                activeId === t.id && "bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]"
              )}
            >
              <div className={cn("h-10 w-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white text-sm font-bold", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                {t.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn("text-[13px] truncate", t.unread > 0 ? "font-semibold text-[hsl(var(--foreground))]" : "font-medium text-[hsl(var(--foreground))]")}>
                    {t.sender}
                  </p>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] shrink-0 ml-2">{t.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] truncate">{t.preview}</p>
                  {t.unread > 0 && (
                    <span className="h-5 min-w-5 rounded-full bg-[hsl(var(--primary))] text-white text-[10px] font-bold flex items-center justify-center px-1.5 shrink-0">
                      {t.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      {active ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--secondary)/0.4)]">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[hsl(var(--border))] bg-white shrink-0">
            {(() => {
              const idx = threads.findIndex((t) => t.id === activeId);
              return (
                <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shrink-0", AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                  {active.avatar}
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-[hsl(var(--foreground))]">{active.sender}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
                <Circle className="h-2 w-2 fill-emerald-500" strokeWidth={0} />
                Online
              </div>
            </div>
            <button className="h-8 w-8 rounded-xl hover:bg-[hsl(var(--secondary))] flex items-center justify-center text-[hsl(var(--muted-foreground))] transition-colors">
              <MoreHorizontal strokeWidth={1.5} className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {active.messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.from === "me" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[70%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed",
                  msg.from === "me"
                    ? "bg-[hsl(var(--primary))] text-white rounded-br-sm"
                    : "bg-white border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-bl-sm"
                )}>
                  <p>{msg.text}</p>
                  <p className={cn("text-[10px] mt-1", msg.from === "me" ? "text-white/70 text-right" : "text-[hsl(var(--muted-foreground))]")}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-5 py-3.5 border-t border-[hsl(var(--border))] bg-white shrink-0">
            <div className="flex items-center gap-3">
              <button className="h-9 w-9 rounded-xl hover:bg-[hsl(var(--secondary))] flex items-center justify-center text-[hsl(var(--muted-foreground))] shrink-0 transition-colors">
                <Paperclip strokeWidth={1.5} className="h-4 w-4" />
              </button>
              <Input
                placeholder="Ketik pesan…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                className="flex-1 h-9 bg-[hsl(var(--secondary))] border-0 rounded-xl text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!draft.trim()}
                className="h-9 w-9 rounded-xl gradient-primary text-white shadow-glow hover:opacity-90 p-0 shrink-0"
              >
                <Send strokeWidth={1.5} className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
          Pilih percakapan untuk memulai
        </div>
      )}
    </div>
  );
}
