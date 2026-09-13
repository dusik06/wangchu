export async function broadcastOverlayChange(kind = "overlay") {
  const baseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

  if (!baseUrl || !serviceRoleKey) {
    console.warn("Overlay realtime broadcast skipped: Supabase env is missing.");
    return false;
  }

  try {
    const response = await fetch(`${baseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        messages: [
          {
            topic: "overlay-events",
            event: "change",
            payload: { kind, at: Date.now() },
            private: false,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Overlay realtime broadcast failed:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Overlay realtime broadcast error:", error);
    return false;
  }
}
