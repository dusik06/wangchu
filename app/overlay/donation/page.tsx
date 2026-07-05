"use client";

import { useEffect, useRef, useState } from "react";

type DonationAlert = {
  id: number;
  donor_name: string;
  amount: number;
  message: string | null;
  played_count: number;
};

export default function Page() {
  const [alert, setAlert] = useState<DonationAlert | null>(null);
  const [visible, setVisible] = useState(false);

  const playingIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function finishAlert(id: number) {
    await fetch("/api/donation-alerts/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
  }

  function playAlert(nextAlert: DonationAlert, replay: boolean) {
    if (!replay && playingIdRef.current === nextAlert.id) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    playingIdRef.current = nextAlert.id;
    setAlert(nextAlert);
    setVisible(true);

    timerRef.current = setTimeout(async () => {
      setVisible(false);

      if (!replay) {
        await finishAlert(nextAlert.id);
      }

      playingIdRef.current = null;
      setAlert(null);
    }, 9000);
  }

  async function checkNext() {
    try {
      const res = await fetch("/api/donation-alerts/next", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) return;

      if (data.command === "skip") {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        playingIdRef.current = null;
        setVisible(false);
        setAlert(null);
        return;
      }

      if (data.command === "replay" && data.alert) {
        playAlert(data.alert, true);
        return;
      }

      if ((data.command === "play" || data.command === "playing") && data.alert) {
        playAlert(data.alert, false);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    checkNext();

    const interval = setInterval(() => {
      checkNext();
    }, 1500);

    return () => {
      clearInterval(interval);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-transparent">
      {alert && (
        <div
          className={[
            "absolute left-1/2 top-1/2 w-[760px] -translate-x-1/2 -translate-y-1/2 transition-all duration-500",
            visible ? "scale-100 opacity-100" : "scale-90 opacity-0",
          ].join(" ")}
        >
          <div className="rounded-[34px] border border-white/25 bg-black/75 px-10 py-8 text-center shadow-[0_0_60px_rgba(168,85,247,0.7)] backdrop-blur">
            <div className="mb-3 text-3xl font-black text-white">
              후원 알림
            </div>

            <div className="mb-4 text-5xl font-black text-[#d8b4fe]">
              {alert.donor_name}
            </div>

            {Number(alert.amount || 0) > 0 && (
              <div className="mb-5 text-4xl font-black text-[#facc15]">
                {Number(alert.amount || 0).toLocaleString()}
              </div>
            )}

            {alert.message && (
              <div className="whitespace-pre-wrap break-words rounded-2xl bg-white/10 px-6 py-5 text-3xl font-bold leading-snug text-white">
                {alert.message}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}