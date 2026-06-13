"use client";

import { useState } from "react";

export default function AdminPredictionPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [winLabel, setWinLabel] = useState("");
  const [loseLabel, setLoseLabel] = useState("");
  const [winOdds, setWinOdds] = useState("1.9");
  const [loseOdds, setLoseOdds] = useState("1.9");
  const [minBet, setMinBet] = useState("10");
  const [maxBet, setMaxBet] = useState("10000");
  const [bettingDeadline, setBettingDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const createPrediction = async () => {
    if (!title || !winLabel || !loseLabel || !bettingDeadline) {
      alert("주제, 승, 패, 마감시간은 필수입니다.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/prediction/create", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        winLabel,
        loseLabel,
        winOdds,
        loseOdds,
        minBet,
        maxBet,
        bettingDeadline: bettingDeadline.replace("T", " ") + ":00",
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (data.success) {
      alert("예측 게임이 생성되었습니다.");

      setTitle("");
      setDescription("");
      setWinLabel("");
      setLoseLabel("");
      setWinOdds("1.9");
      setLoseOdds("1.9");
      setMinBet("10");
      setMaxBet("10000");
      setBettingDeadline("");
    } else {
      alert(data.message || "생성 실패");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <section className="mb-6 rounded-3xl bg-slate-900 p-6">
          <p className="mb-2 text-sm font-bold text-yellow-400">
            ADMIN PREDICTION
          </p>
          <h1 className="text-3xl font-black">승패 예측 생성</h1>
          <p className="mt-3 text-sm text-slate-400">
            관리자가 주제, 선택지, 배당, 배팅 마감시간을 설정해서 예측 게임을 열 수 있습니다.
          </p>
        </section>

        <section className="space-y-5 rounded-3xl bg-slate-900 p-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              예측 주제
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 오늘 방송 별풍선 10만개 넘을까?"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예측 기준이나 상세 설명을 적어주세요."
              rows={4}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                승 선택지
              </label>
              <input
                value={winLabel}
                onChange={(e) => setWinLabel(e.target.value)}
                placeholder="예: 넘는다"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                패 선택지
              </label>
              <input
                value={loseLabel}
                onChange={(e) => setLoseLabel(e.target.value)}
                placeholder="예: 못 넘는다"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                승 배당
              </label>
              <input
                type="number"
                step="0.1"
                value={winOdds}
                onChange={(e) => setWinOdds(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                패 배당
              </label>
              <input
                type="number"
                step="0.1"
                value={loseOdds}
                onChange={(e) => setLoseOdds(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                최소 배팅
              </label>
              <input
                type="number"
                value={minBet}
                onChange={(e) => setMinBet(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                최대 배팅
              </label>
              <input
                type="number"
                value={maxBet}
                onChange={(e) => setMaxBet(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              배팅 마감시간
            </label>
            <input
              type="datetime-local"
              value={bettingDeadline}
              onChange={(e) => setBettingDeadline(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
            />
          </div>

          <button
            onClick={createPrediction}
            disabled={loading}
            className="cursor-pointer w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-4 font-black text-white shadow-lg disabled:opacity-50"
          >
            {loading ? "생성 중..." : "예측 게임 생성하기"}
          </button>
        </section>
      </div>
    </main>
  );
}