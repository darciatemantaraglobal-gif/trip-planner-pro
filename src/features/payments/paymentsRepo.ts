import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { requireAgencyId } from "@/store/authStore";

export type PaymentType = "dp" | "installment" | "final" | "refund" | "other";

export interface Payment {
  id: string;
  jamaahId: string;
  tripId?: string;
  type: PaymentType;
  amount: number;
  method: string;
  paidAt: string;
  notes: string;
  createdAt: string;
}

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  dp: "DP / Down Payment",
  installment: "Angsuran",
  final: "Pelunasan",
  refund: "Refund",
  other: "Lainnya",
};

const fromRow = (r: Record<string, unknown>): Payment => ({
  id: String(r.id),
  jamaahId: String(r.jamaah_id),
  tripId: (r.trip_id as string) ?? undefined,
  type: (r.type as PaymentType) ?? "other",
  amount: Number(r.amount ?? 0),
  method: String(r.method ?? ""),
  paidAt: String(r.paid_at ?? ""),
  notes: String(r.notes ?? ""),
  createdAt: String(r.created_at ?? new Date().toISOString()),
});

const toRow = (p: Payment, agencyId?: string) => ({
  id: p.id,
  jamaah_id: p.jamaahId,
  trip_id: p.tripId ?? null,
  type: p.type,
  amount: p.amount,
  method: p.method,
  paid_at: p.paidAt,
  notes: p.notes,
  created_at: p.createdAt,
  ...(agencyId ? { agency_id: agencyId } : {}),
});

export async function listPaymentsByJamaah(jamaahId: string): Promise<Payment[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase!
    .from("payments").select("*").eq("jamaah_id", jamaahId).order("paid_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function listPaymentsByTrip(tripId: string): Promise<Payment[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase!
    .from("payments").select("*").eq("trip_id", tripId);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createPayment(draft: Omit<Payment, "id" | "createdAt">): Promise<Payment> {
  const p: Payment = { ...draft, id: `pay-${Date.now()}`, createdAt: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const agencyId = requireAgencyId();
    const { error } = await supabase!.from("payments").insert(toRow(p, agencyId));
    if (error) throw error;
  }
  return p;
}

export async function deletePayment(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from("payments").delete().eq("id", id);
    if (error) throw error;
  }
}

export function sumPaid(payments: Payment[]): number {
  return payments.reduce((s, p) => s + (p.type === "refund" ? -p.amount : p.amount), 0);
}

export type PaymentStatus = "lunas" | "sebagian" | "belum";

export function paymentStatus(totalPrice: number, payments: Payment[]): PaymentStatus {
  const paid = sumPaid(payments);
  if (paid <= 0) return "belum";
  if (paid >= totalPrice && totalPrice > 0) return "lunas";
  return "sebagian";
}
