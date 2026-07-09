"use client";

import { useEffect, useState } from "react";

type UpdownLog = {
  id: number;
  session_id: number;
  user_id: number;
  email: string;
  nickname: string;
  role: string;
  step: number;
  bet_choice: "up" | "same" | "down";
  bet_amount: number;
  start_number: number;
  result_number: number;
  is_win: number;
  display_multiplier: number;
  real_win_rate: number;
  payout_amount: number;
  created_at: string;
};

function formatChoice(value: string) {
  if (value === "up") return "업";
  if (value === "same") return "같음";
  if (value === "down") return "다운";
  return value;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const d = new Date(date);

  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(
    d.getHours()
  ).padStart(2, "0")}시 ${String(d.getMinutes()).padStart(2, "0")}분`;
}

export default function AdminUpdownGamePage() {
  const [logs, setLogs] = useState<UpdownLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);

    const res = await fetch("/api/admin/game/updown/logs", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setLogs(data.logs || []);
    } else {
      alert(data.message || "업다운게임 기록을 불러오지 못했습니다.");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const totalBet = logs.reduce((sum, log) => sum + Number(log.bet_amount || 0), 0);
  const totalPayout = logs.reduce((sum, log) => sum + Number(log.payout_amount || 0), 0);
  const winCount = logs.filter((log) => Number(log.is_win) === 1).length;
  const loseCount = logs.filter((log) => Number(log.is_win) !== 1).length;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-purple-600">
                ADMIN UPDOWN LOG
              </p>

              <h1 className="text-3xl font-black text-zinc-900">
                🔼 업다운게임 기록
              </h1>

              <p className="mt-3 text-sm text-zinc-500">
                업 / 같음 / 다운 선택, 시작 숫자, 결과 숫자, 배당, 지급 기록을 확인합니다.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="/admin/game"
                className="rounded-2xl bg-zinc-100 px-5 py-3 font-black text-zinc-700 hover:bg-zinc-200"
              >
                게임관리
              </a>

              <button
                onClick={loadLogs}
                className="cursor-pointer rounded-2xl bg-zinc-950 px-5 py-3 font-black text-white shadow-lg"
              >
                새로고침
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-zinc-400">전체 기록</p>
            <p className="mt-2 text-3xl font-black text-zinc-900">
              {logs.length.toLocaleString()}건
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-zinc-400">성공</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {winCount.toLocaleString()}건
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-zinc-400">총 배팅</p>
            <p className="mt-2 text-3xl font-black text-zinc-900">
              {totalBet.toLocaleString()}개
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-zinc-400">총 지급 예정/누적</p>
            <p className="mt-2 text-3xl font-black text-purple-600">
              {totalPayout.toLocaleString()}개
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead className="bg-zinc-950 text-white">
                <tr>
                  <th className="px-4 py-4 text-left">시간</th>
                  <th className="px-4 py-4 text-left">닉네임</th>
                  <th className="px-4 py-4 text-left">이메일</th>
                  <th className="px-4 py-4 text-center">차수</th>
                  <th className="px-4 py-4 text-center">시작</th>
                  <th className="px-4 py-4 text-center">선택</th>
                  <th className="px-4 py-4 text-center">결과</th>
                  <th className="px-4 py-4 text-right">배팅/누적</th>
                  <th className="px-4 py-4 text-right">표시배당</th>
                  <th className="px-4 py-4 text-right">실제확률</th>
                  <th className="px-4 py-4 text-right">지급</th>
                  <th className="px-4 py-4 text-center">상태</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-zinc-400">
                      불러오는 중...
                    </td>
                  </tr>
                )}

                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-zinc-400">
                      아직 업다운게임 기록이 없습니다.
                    </td>
                  </tr>
                )}

                {!loading &&
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-zinc-100 hover:bg-purple-50">
                      <td className="px-4 py-4 text-zinc-600">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="px-4 py-4 font-black text-zinc-900">
                        {log.nickname || "닉네임 없음"}
                        {log.role === "admin" && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs text-red-600">
                            관리자
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-zinc-500">{log.email}</td>

                      <td className="px-4 py-4 text-center font-black">
                        {Number(log.step)}차
                      </td>

                      <td className="px-4 py-4 text-center">
                        {Number(log.start_number)}
                      </td>

                      <td className="px-4 py-4 text-center font-black">
                        {formatChoice(log.bet_choice)}
                      </td>

                      <td className="px-4 py-4 text-center font-black">
                        {Number(log.result_number)}
                      </td>

                      <td className="px-4 py-4 text-right font-black">
                        {Number(log.bet_amount).toLocaleString()}개
                      </td>

                      <td className="px-4 py-4 text-right">
                        {Number(log.display_multiplier).toFixed(2)}배
                      </td>

                      <td className="px-4 py-4 text-right text-zinc-500">
                        {(Number(log.real_win_rate) * 100).toFixed(2)}%
                      </td>

                      <td className="px-4 py-4 text-right font-black text-purple-600">
                        {Number(log.payout_amount).toLocaleString()}개
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 font-bold ${
                            Number(log.is_win) === 1
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {Number(log.is_win) === 1 ? "성공" : "실패"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}