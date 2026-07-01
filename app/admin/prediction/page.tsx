"use client";

import { useEffect, useState } from "react";

type PredictionGame = {
  id: number;
  title: string;
  description: string | null;
  win_label: string;
  lose_label: string;
  win_odds: number;
  lose_odds: number;
  min_bet: number;
  max_bet: number;
  betting_deadline: string;
  status: "OPEN" | "SETTLED";
  result: "WIN" | "LOSE" | null;
};

function toDateTimeLocal(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.replace(" ", "T").slice(0, 16);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toDbDateTime(value: string) {
  return value.replace("T", " ") + ":00";
}

export default function AdminPredictionPage() {
  const [games, setGames] = useState<PredictionGame[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const loadGames = async () => {
    const res = await fetch("/api/prediction/list", { cache: "no-store" });
    const data = await res.json();

    if (data.success) {
      setGames(data.games);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setWinLabel("");
    setLoseLabel("");
    setWinOdds("1.9");
    setLoseOdds("1.9");
    setMinBet("10");
    setMaxBet("10000");
    setBettingDeadline("");
  };

  const startEdit = (game: PredictionGame) => {
    if (game.status !== "OPEN") {
      alert("정산 완료된 예측은 수정할 수 없습니다.");
      return;
    }

    setEditingId(game.id);
    setTitle(game.title || "");
    setDescription(game.description || "");
    setWinLabel(game.win_label || "");
    setLoseLabel(game.lose_label || "");
    setWinOdds(String(game.win_odds || "1.9"));
    setLoseOdds(String(game.lose_odds || "1.9"));
    setMinBet(String(game.min_bet || "10"));
    setMaxBet(String(game.max_bet || "10000"));
    setBettingDeadline(toDateTimeLocal(game.betting_deadline));
  };

  const savePrediction = async () => {
    if (!title || !winLabel || !loseLabel || !bettingDeadline) {
      alert("주제, 승, 패, 마감시간은 필수입니다.");
      return;
    }

    setLoading(true);

    const url = editingId
      ? "/api/admin/prediction/update"
      : "/api/admin/prediction/create";

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        id: editingId,
        title,
        description,
        winLabel,
        loseLabel,
        winOdds,
        loseOdds,
        minBet,
        maxBet,
        bettingDeadline: toDbDateTime(bettingDeadline),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert(editingId ? "수정 완료" : "예측 게임이 생성되었습니다.");
      resetForm();
      loadGames();
    } else {
      alert(data.message || "저장 실패");
    }
  };

  const deletePrediction = async () => {
    if (!editingId) return;

    if (!confirm("이 예측을 삭제할까요? 이미 참여자가 있으면 기록도 같이 꼬일 수 있으니 테스트용 예측만 삭제하는 걸 추천합니다.")) {
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/prediction/update", {
      method: "POST",
      body: JSON.stringify({
        id: editingId,
        mode: "delete",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      alert("삭제 완료");
      resetForm();
      loadGames();
    } else {
      alert(data.message || "삭제 실패");
    }
  };

  const openGames = games.filter((game) => game.status === "OPEN");
  const settledGames = games.filter((game) => game.status === "SETTLED");

  return (
    <main className="min-h-screen bg-[#05070d] px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6">
          <p className="mb-2 text-sm font-black text-[#f7d36b]">
            ADMIN PREDICTION
          </p>
          <h1 className="text-3xl font-black">📊 승패 예측 관리</h1>
          <p className="mt-3 text-sm text-zinc-400">
            예측 생성, 진행중인 예측 수정, 마감시간 변경을 여기서 관리합니다.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_430px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6">
              <h2 className="mb-4 text-2xl font-black text-[#f7d36b]">
                진행중인 예측
              </h2>

              {openGames.length === 0 ? (
                <p className="rounded-2xl bg-[#151925] p-5 text-sm text-zinc-400">
                  진행중인 예측이 없습니다.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {openGames.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => startEdit(game)}
                      className={`rounded-2xl border p-5 text-left hover:border-[#f7d36b] ${
                        editingId === game.id
                          ? "border-[#f7d36b] bg-[#2b2415]"
                          : "border-[#3b321f] bg-[#151925]"
                      }`}
                    >
                      <p className="mb-2 text-xs font-black text-emerald-400">
                        OPEN
                      </p>
                      <h3 className="text-lg font-black">{game.title}</h3>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-300">
                          {game.win_label} {Number(game.win_odds).toFixed(1)}배
                        </div>
                        <div className="rounded-xl bg-red-500/10 px-3 py-2 text-red-300">
                          {game.lose_label} {Number(game.lose_odds).toFixed(1)}배
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-zinc-400">
                        클릭하면 수정 가능
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6">
              <h2 className="mb-4 text-2xl font-black text-[#f7d36b]">
                정산 완료된 예측
              </h2>

              {settledGames.length === 0 ? (
                <p className="rounded-2xl bg-[#151925] p-5 text-sm text-zinc-400">
                  정산 완료된 예측이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {settledGames.slice(0, 10).map((game) => (
                    <div
                      key={game.id}
                      className="rounded-2xl border border-[#3b321f] bg-[#151925] p-5 opacity-80"
                    >
                      <p className="mb-1 text-xs font-black text-zinc-500">
                        SETTLED · 수정 불가
                      </p>
                      <p className="font-black">{game.title}</p>
                      <p className="mt-2 text-sm text-[#f7d36b]">
                        결과:{" "}
                        {game.result === "WIN"
                          ? game.win_label
                          : game.lose_label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-[#f7d36b]">
                {editingId ? "예측 수정" : "새 예측 생성"}
              </h2>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-zinc-700 px-4 py-2 text-sm font-black hover:bg-zinc-600"
                >
                  새로 만들기
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  예측 주제
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 오늘 방송 별풍선 10만개 넘을까?"
                  className="w-full rounded-2xl border border-[#3b321f] bg-[#151925] px-5 py-4 outline-none focus:border-[#f7d36b]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예측 기준이나 상세 설명"
                  rows={4}
                  className="w-full rounded-2xl border border-[#3b321f] bg-[#151925] px-5 py-4 outline-none focus:border-[#f7d36b]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={winLabel}
                  onChange={(e) => setWinLabel(e.target.value)}
                  placeholder="승 선택지"
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 outline-none"
                />

                <input
                  value={loseLabel}
                  onChange={(e) => setLoseLabel(e.target.value)}
                  placeholder="패 선택지"
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="number"
                  step="0.1"
                  value={winOdds}
                  onChange={(e) => setWinOdds(e.target.value)}
                  placeholder="승 배당"
                  className="rounded-2xl border border-[#3b321f] bg-[#151925] px-5 py-4 outline-none"
                />

                <input
                  type="number"
                  step="0.1"
                  value={loseOdds}
                  onChange={(e) => setLoseOdds(e.target.value)}
                  placeholder="패 배당"
                  className="rounded-2xl border border-[#3b321f] bg-[#151925] px-5 py-4 outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="number"
                  value={minBet}
                  onChange={(e) => setMinBet(e.target.value)}
                  placeholder="최소 배팅"
                  className="rounded-2xl border border-[#3b321f] bg-[#151925] px-5 py-4 outline-none"
                />

                <input
                  type="number"
                  value={maxBet}
                  onChange={(e) => setMaxBet(e.target.value)}
                  placeholder="최대 배팅"
                  className="rounded-2xl border border-[#3b321f] bg-[#151925] px-5 py-4 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  배팅 마감시간
                </label>
                <input
                  type="datetime-local"
                  value={bettingDeadline}
                  onChange={(e) => setBettingDeadline(e.target.value)}
                  className="w-full rounded-2xl border border-[#3b321f] bg-[#151925] px-5 py-4 outline-none focus:border-[#f7d36b]"
                />
              </div>

              <button
                type="button"
                onClick={savePrediction}
                disabled={loading}
                className="w-full rounded-2xl bg-[#f7d36b] px-5 py-4 font-black text-black disabled:opacity-50"
              >
                {loading
                  ? "처리 중..."
                  : editingId
                  ? "수정 저장하기"
                  : "예측 게임 생성하기"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={deletePrediction}
                  disabled={loading}
                  className="w-full rounded-2xl bg-red-600 px-5 py-4 font-black text-white disabled:opacity-50"
                >
                  삭제하기
                </button>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}