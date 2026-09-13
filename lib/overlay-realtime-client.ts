"use client";

import supabase from "@/lib/supabase";

export type OverlayRealtimeEvent = {
  kind?: string;
  at?: number;
};

export function subscribeOverlayEvents(
  onChange: (payload: OverlayRealtimeEvent) => void,
  onReady?: () => void
) {
  const channel = supabase
    .channel("overlay-events")
    .on("broadcast", { event: "change" }, ({ payload }) => {
      onChange((payload || {}) as OverlayRealtimeEvent);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onReady?.();
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
