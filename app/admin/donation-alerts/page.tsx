"use client";

import { useEffect, useState } from "react";

type Alert = {
  id: number;
  donor_name: string;
  amount: number;
  message: string | null;
  status: string;
  played_count: number;
  created_at: string;
};

export default function Page() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAlerts() {
    const res = await fetch("/api/donation-alerts", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setAlerts(data.alerts || []);
    }
  }

  async function addTestAlert() {
    if (!donorName.trim()) {
      alert("후원자 이름을 입력해줘.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/donation-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          donorName,
          amount: Number(amount || 0),
          message,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "추가 실패");
        return;
      }

      setDonorName("");
      setAmount("");
      setMessage("");
      await loadAlerts();
    } finally {
      setLoading(false);
    }
  }

  async function sendCommand(command: string, targetAlertId?: number) {
    const res = await fetch("/api/admin/donation-alerts/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
        targetAlertId: targetAlertId || null,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "명령 실패");
    }

    await loadAlerts();
  }

  useEffect(() => {
    loadAlerts();

    const interval = setInterval(() => {
      loadAlerts();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const waitingCount = alerts.filter((a) => a.status === "waiting").length;
  const playing = alerts.find((a) => a.status === "playing");

  return (
    <main className="min-h-screen bg-[#0b0718] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black">후원알림 관리</h1>
          <p className="mt-2 text-sm text-white/60">
            OBS 후원알림을 순서대로 재생하고 관리합니다.
          </p>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <div className="text-sm text-white/50">현재 재생</div>
            <div className="mt-2 text-xl font-black">
              {playing ? playing.donor_name : "없음"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <div className="text-sm text-white/50">대기 중</div>
            <div className="mt-2 text-xl font-black">{waitingCount}개</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151027] p-5">
            <div className="text-sm text-white/50">최근 목록</div>
            <div className="mt-2 text-xl font-black">{alerts.length}개</div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151027] p-5">
          <h2 className="mb-4 text-xl font-black">테스트 후원 추가</h2>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="후원자 이름"
              className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-white outline-none"
            />

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="후원 수량 / 금액"
              type="number"
              className="rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-white outline-none"
            />

            <button
              onClick={addTestAlert}
              disabled={loading}
              className="rounded-xl bg-purple-600 px-4 py-3 font-black hover:bg-purple-500 disabled:opacity-50"
            >
              테스트 추가
            </button>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="후원 메시지"
            className="mt-3 min-h-[90px] w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-white outline-none"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151027] p-5">
          <h2 className="mb-4 text-xl font-black">방송 중 컨트롤</h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => sendCommand("skip")}
              className="rounded-xl bg-red-600 px-5 py-3 font-black hover:bg-red-500"
            >
              스킵
            </button>

            <button
              onClick={() => sendCommand("refresh")}
              className="rounded-xl bg-zinc-700 px-5 py-3 font-black hover:bg-zinc-600"
            >
              새로고침
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151027] p-5">
          <h2 className="mb-4 text-xl font-black">후원알림 목록</h2>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#09090f] text-white/60">
                <tr>
                  <th className="px-4 py-3">번호</th>
                  <th className="px-4 py-3">후원자</th>
                  <th className="px-4 py-3">수량/금액</th>
                  <th className="px-4 py-3">메시지</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">재생</th>
                </tr>
              </thead>

              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{alert.id}</td>
                    <td className="px-4 py-3 font-bold">{alert.donor_name}</td>
                    <td className="px-4 py-3">
                      {Number(alert.amount || 0).toLocaleString()}
                    </td>
                    <td className="max-w-[360px] truncate px-4 py-3 text-white/70">
                      {alert.message || "-"}
                    </td>
                    <td className="px-4 py-3">{alert.status}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => sendCommand("replay", alert.id)}
                        className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-black hover:bg-purple-500"
                      >
                        다시재생
                      </button>
                    </td>
                  </tr>
                ))}

                {alerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-white/50">
                      아직 후원알림이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}