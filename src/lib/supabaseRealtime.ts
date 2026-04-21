/**
 * Realtime sync — subscribe ke perubahan tabel dari device lain & refresh stores.
 */
import { supabase, isSupabaseConfigured } from "./supabase";
import { useTripsStore, useJamaahStore } from "@/store/tripsStore";
import { usePackagesStore } from "@/store/packagesStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

let channel: RealtimeChannel | null = null;

export function startRealtimeSync(): () => void {
  if (!isSupabaseConfigured() || channel) return () => undefined;

  channel = supabase!
    .channel("igh-tour-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
      void useTripsStore.getState().fetchTrips();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "jamaah" }, (payload) => {
      const tripId =
        (payload.new as { trip_id?: string } | null)?.trip_id ??
        (payload.old as { trip_id?: string } | null)?.trip_id;
      if (tripId) void useJamaahStore.getState().fetchJamaah(tripId);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => {
      void usePackagesStore.getState().refresh();
    })
    .subscribe();

  return () => {
    if (channel) {
      void supabase!.removeChannel(channel);
      channel = null;
    }
  };
}
