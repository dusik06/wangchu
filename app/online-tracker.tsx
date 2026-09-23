"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function OnlineTracker() {
  const { status } = useSession();
  const miniGame = usePathname().startsWith("/game/mini");

  useEffect(() => {
    if (miniGame || status !== "authenticated") return;

    fetch("/api/online", { method: "POST" });

    const timer = setInterval(() => {
      fetch("/api/online", { method: "POST" });
    }, 60000);

    return () => clearInterval(timer);
  }, [status, miniGame]);

  return null;
}
