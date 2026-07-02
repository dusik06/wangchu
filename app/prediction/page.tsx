"use client";

import { useEffect, useMemo, useState } from "react";

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
  my_choice: "WIN" | "LOSE" | null;
  my_bet_amount: number | null;
  my_bet_status: "BET" | "WIN" | "LOSE" | null;
  my_payout_amount: number | null;
};

type HistoryLog = {
  nickname: string;
  choice: "WIN" | "LOSE";
  bet_amount: number;
  status: "WIN" | "LOSE";
  payout_amount: number;
};

function parseDbDateTime(value: string) {
  if (!value) return null;

  const clean = value.replace("T", " ").slice(0, 19);
  const [datePart, timePart] = clean.split(" ");

  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
}

function formatKstDateTime(value: string) {
  const date = parseDbDateTime(value);

  if (!date) return value || "마감시간 없음";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${month}/${day} ${hour}:${minute}`;
}

function isClosed(game: PredictionGame) {
  if (game.status !== "OPEN") return true;

  const deadline = parseDbDateTime(game.betting_deadline);
  if (!deadline) return false;

  return new Date().getTime() > deadline.getTime();
}

function getRemainText(value: string) {
  const deadline = parseDbDateTime(value);

  if (!deadline) return "마감시간 확인 필요";

  const diff = deadline.getTime() - new Date().getTime();

  if (diff <= 0) return "마감됨";

  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 ${hours % 24}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes % 60}분 남음`;
  return `${minutes}분 남음`;
}

export default function PredictionPage() {
  const [games, setGames] = useState<PredictionGame[]>([]);
  const [betAmounts, setBetAmounts] = useState<Record<number, string>>({});
  const [selectedChoices, setSelectedChoices] = useState<
    Record<number, "WIN" | "LOSE" | null>
  >({});
  const [loadingGameId, setLoadingGameId] = useState<number | null>(null);

  const [openedGameId, setOpenedGameId] = useState<number | null>(null);
  const [historyLogs, setHistoryLogs] = useState<Record<number, HistoryLog[]>>(
    {}
  );

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

  const openGames = useMemo(
    () => games.filter((game) => game.status === "OPEN"),
    [games]
  );

  const historyGames = useMemo(
    () => games.filter((game) => game.status === "SETTLED"),
    [games]
  );

  const loadHistory = async (gameId: number) => {
    if (openedGameId === gameId) {
      setOpenedGameId(null);
      return;
    }

    const res = await fetch(`/api/prediction/history/${gameId}`);
    const data = await res.json();

    if (data.success) {
      setHistoryLogs((prev) => ({
        ...prev,
        [gameId]: data.logs,
      }));

      setOpenedGameId(gameId);
    }
  };

  const submitBet = async (game: PredictionGame) => {
    const choice = selectedChoices[game.id];
    const betAmount = betAmounts[game.id];

    if (!choice || !betAmount) {
      alert("선택지와 배팅 도토리를 입력해주세요.");
      return;
    }

    if (isClosed(game)) {
      alert("이미 배팅 마감된 예측입니다.");
      return;
    }

    setLoadingGameId(game.id);

    const res = await fetch("/api/prediction/bet", {
      method: "POST",
      body: JSON.stringify({
        gameId: game.id,
        choice,
        betAmount: Number(betAmount),
      }),
    });

    const data = await res.json();
    setLoadingGameId(null);

    if (data.success) {
      alert("배팅 완료");
      setBetAmounts((prev) => ({ ...prev, [game.id]: "" }));
      setSelectedChoices((prev) => ({ ...prev, [game.id]: null }));
      loadGames();
    } else {
      alert(data.message || "배팅 실패");
    }
  };

  return (
    <main className="min-h-screen bg-[#05070d] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6">
          <p className="mb-2 text-sm font-black text-[#f7d36b]">
            WANGCHU PREDICTION
          </p>
          <h1 className="text-3xl font-black">📊 승패 예측</h1>
          <p className="mt-3 text-sm text-zinc-400">
            진행 중인 예측에 도토리를 걸고 결과를 기다려보세요.
          </p>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#f7d36b]">
              진행중인 예측
            </h2>
            <span className="rounded-full bg-[#151925] px-4 py-2 text-sm font-black text-zinc-300">
              {openGames.length}개 진행중
            </span>
          </div>

          {openGames.length === 0 ? (
            <div className="rounded-3xl border border-[#3b321f] bg-[#090c14] p-8 text-center text-zinc-400">
              현재 진행중인 예측이 없습니다.
            </div>
          ) : (
            <div className="space-y-5">
              {openGames.map((game) => {
                const closed = isClosed(game);
                const selectedChoice = selectedChoices[game.id] || null;
                const myAlreadyBet = !!game.my_choice;

                return (
                  <section
                    key={game.id}
                    className="rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6"
                  >
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              closed
                                ? "bg-zinc-700 text-zinc-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {closed ? "마감됨" : "배팅 가능"}
                          </span>

                          <span className="rounded-full bg-[#151925] px-3 py-1 text-xs font-black text-[#f7d36b]">
                            {getRemainText(game.betting_deadline)}
                          </span>
                        </div>

                        <h3 className="text-2xl font-black">{game.title}</h3>

                        {game.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">
                            {game.description}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-[#151925] px-4 py-3 text-sm">
                        <p className="text-zinc-500">마감시간</p>
                        <p className="mt-1 font-black text-white">
                          {formatKstDateTime(game.betting_deadline)}
                        </p>
                      </div>
                    </div>

                    {myAlreadyBet && (
                      <div className="mb-5 rounded-2xl border border-[#3b321f] bg-[#151925] p-4">
                        <p className="text-sm text-zinc-400">내 참여 정보</p>
                        <p className="mt-1 font-black">
                          선택:{" "}
                          <span className="text-[#f7d36b]">
                            {game.my_choice === "WIN"
                              ? game.win_label
                              : game.lose_label}
                          </span>{" "}
                          / 배팅:{" "}
                          <span className="text-[#f7d36b]">
                            {Number(game.my_bet_amount || 0).toLocaleString()}개
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <button
                        type="button"
                        disabled={closed || myAlreadyBet}
                        onClick={() =>
                          setSelectedChoices((prev) => ({
                            ...prev,
                            [game.id]: "WIN",
                          }))
                        }
                        className={`rounded-2xl border p-5 text-left transition ${
                          selectedChoice === "WIN"
                            ? "border-emerald-300 bg-emerald-500 text-white"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        } ${
                          closed || myAlreadyBet
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:bg-emerald-500/20"
                        }`}
                      >
                        <p className="text-lg font-black">{game.win_label}</p>
                        <p className="mt-1 text-sm">
                          배당 {Number(game.win_odds).toFixed(1)}배
                        </p>
                      </button>

                      <button
                        type="button"
                        disabled={closed || myAlreadyBet}
                        onClick={() =>
                          setSelectedChoices((prev) => ({
                            ...prev,
                            [game.id]: "LOSE",
                          }))
                        }
                        className={`rounded-2xl border p-5 text-left transition ${
                          selectedChoice === "LOSE"
                            ? "border-red-300 bg-red-500 text-white"
                            : "border-red-500/30 bg-red-500/10 text-red-300"
                        } ${
                          closed || myAlreadyBet
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:bg-red-500/20"
                        }`}
                      >
                        <p className="text-lg font-black">{game.lose_label}</p>
                        <p className="mt-1 text-sm">
                          배당 {Number(game.lose_odds).toFixed(1)}배
                        </p>
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-[1fr_190px]">
                      <input
                        type="number"
                        value={betAmounts[game.id] || ""}
                        disabled={closed || myAlreadyBet}
                        onChange={(e) =>
                          setBetAmounts((prev) => ({
                            ...prev,
                            [game.id]: e.target.value,
                          }))
                        }
                        placeholder={`배팅 도토리 입력 (${game.min_bet}~${game.max_bet})`}
                        className="rounded-2xl border border-[#3b321f] bg-[#151925] px-5 py-4 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />

                      <button
                        type="button"
                        onClick={() => submitBet(game)}
                        disabled={
                          closed || myAlreadyBet || loadingGameId === game.id
                        }
                        className="rounded-2xl bg-[#f7d36b] px-5 py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {myAlreadyBet
                          ? "참여 완료"
                          : closed
                          ? "마감됨"
                          : loadingGameId === game.id
                          ? "처리중..."
                          : "배팅하기"}
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#f7d36b]">
              지난 예측 결과
            </h2>
          </div>

          {historyGames.length === 0 ? (
            <div className="rounded-3xl border border-[#3b321f] bg-[#090c14] p-8 text-center text-zinc-400">
              지난 예측 결과가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {historyGames.map((game) => (
                <section
                  key={game.id}
                  className="rounded-[28px] border border-[#3b321f] bg-[#090c14] p-6"
                >
                  <button
                    type="button"
                    onClick={() => loadHistory(game.id)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="mb-2 text-xs font-black text-zinc-500">
                          완료된 예측
                        </p>
                        <h3 className="text-xl font-black">{game.title}</h3>
                      </div>

                      <div className="rounded-2xl bg-[#151925] px-5 py-4">
                        <p className="text-sm text-zinc-400">최종 결과</p>
                        <p className="mt-1 text-2xl font-black text-[#f7d36b]">
                          {game.result === "WIN"
                            ? game.win_label
                            : game.lose_label}
                        </p>
                      </div>
                    </div>
                  </button>

                  {openedGameId === game.id && (
                    <div className="mt-5 rounded-2xl bg-[#151925] p-4">
                      <h4 className="mb-3 text-lg font-black">참여 내역</h4>

                      {!historyLogs[game.id] ||
                      historyLogs[game.id].length === 0 ? (
                        <p className="text-sm text-zinc-400">
                          참여 내역이 없습니다.
                        </p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {historyLogs[game.id].map((log, index) => (
                            <div
                              key={index}
                              className="rounded-2xl bg-[#0b0d14] p-4"
                            >
                              <p className="font-black">{log.nickname}</p>
                              <p className="mt-2 text-sm text-zinc-400">
                                선택:{" "}
                                {log.choice === "WIN"
                                  ? game.win_label
                                  : game.lose_label}
                              </p>
                              <p className="text-sm text-zinc-400">
                                배팅:{" "}
                                {Number(log.bet_amount).toLocaleString()}개
                              </p>
                              <p
                                className={`mt-2 font-black ${
                                  log.status === "WIN"
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {log.status === "WIN"
                                  ? `당첨 +${Number(
                                      log.payout_amount
                                    ).toLocaleString()}개`
                                  : "미당첨"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}