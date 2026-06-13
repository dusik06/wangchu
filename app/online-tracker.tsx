"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function OnlineTracker() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/online", { method: "POST" });

    const timer = setInterval(() => {
      fetch("/api/online", { method: "POST" });
    }, 30000);

    return () => clearInterval(timer);
  }, [status]);

  return null;
}