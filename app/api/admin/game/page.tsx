"use client";

import { useEffect, useState } from "react";

type GameLog = {
  id: number;
  user_id: number;
  email: string;
  nickname: string;
  role: string;
  bet_amount: number;
  choice: "ODD" | "EVEN";
  first_dice: number;
  first_result: "ODD" | "EVEN";
  first_win: number;
  final_action: "CASHOUT" | "DOUBLE" | null;
  second_choice: "ODD" | "EVEN" | null;
  second_dice: number | null;
  second_result: "ODD" | "EVEN" | null;
  double_win: number | null;
  payout_amount: number;
  status: string;
  created_at: string;
  completed_at: string | null;
};

function formatChoice(value: string | null) {
  if (value === "ODD") return "홀";
  if (value === "EVEN") return "짝";
  return "-";
}

function formatStatus(log: GameLog) {
  if (log.status === "LOSE") return "1차 실패";
  if (log.status === "PENDING_CHOICE") return "선택 대기";
  if (log.status === "CASHED_OUT") return "1.9배 수령";
  if (log.status === "DOUBLE_SUCCESS") return "엎기 성공";
  if (log.status === "DOUBLE_FAIL") return "엎기 실패";
  return log.status;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const d = new Date(date);

  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(
    d.getHours()
  ).padStart(2, "0")}시 ${String(d.getMinutes()).padStart(2, "0")}분`;
}

export default function AdminGamePage() {
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);

    const res = await fetch("/api/admin/game/dice/logs");
    const data = await res.json();

    if (data.success) {
      setLogs(data.logs);
    } else {
      alert(data.message || "게임 기록을 불러오지 못했습니다.");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold text-yellow-600">
                ADMIN GAME LOG
              </p>
              <h1 className="text-3xl font-black text-zinc-900">
                🎲 주사위 게임 기록
              </h1>
              <p className="mt-3 text-sm text-zinc-500">
                누가, 언제, 몇 개를 걸었고 성공/실패했는지 전체 기록을 확인합니다.
              </p>
            </div>

            <button
              onClick={loadLogs}
              className="cursor-pointer rounded-2xl bg-zinc-950 px-5 py-3 font-black text-white shadow-lg"
            >
              새로고침
            </button>
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
            <p className="text-sm font-bold text-zinc-400">엎기 성공</p>
            <p className="mt-2 text-3xl font-black text-yellow-600">
              {logs.filter((log) => log.status === "DOUBLE_SUCCESS").length}건
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-zinc-400">총 배팅</p>
            <p className="mt-2 text-3xl font-black text-zinc-900">
              {logs
                .reduce((sum, log) => sum + Number(log.bet_amount), 0)
                .toLocaleString()}
              개
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-zinc-400">총 지급</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {logs
                .reduce((sum, log) => sum + Number(log.payout_amount), 0)
                .toLocaleString()}
              개
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="bg-zinc-950 text-white">
                <tr>
                  <th className="px-4 py-4 text-left">시간</th>
                  <th className="px-4 py-4 text-left">닉네임</th>
                  <th className="px-4 py-4 text-left">이메일</th>
                  <th className="px-4 py-4 text-right">배팅</th>
                  <th className="px-4 py-4 text-center">1차 선택</th>
                  <th className="px-4 py-4 text-center">1차 결과</th>
                  <th className="px-4 py-4 text-center">엎기 선택</th>
                  <th className="px-4 py-4 text-center">엎기 결과</th>
                  <th className="px-4 py-4 text-right">지급</th>
                  <th className="px-4 py-4 text-center">상태</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-zinc-400">
                      불러오는 중...
                    </td>
                  </tr>
                )}

                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-zinc-400">
                      아직 게임 기록이 없습니다.
                    </td>
                  </tr>
                )}

                {!loading &&
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-zinc-100 hover:bg-yellow-50">
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

                      <td className="px-4 py-4 text-right font-black">
                        {Number(log.bet_amount).toLocaleString()}개
                      </td>

                      <td className="px-4 py-4 text-center">
                        {formatChoice(log.choice)}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {log.first_dice} / {formatChoice(log.first_result)}
                        <span
                          className={`ml-2 rounded-full px-2 py-1 text-xs font-bold ${
                            log.first_win
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {log.first_win ? "성공" : "실패"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">
                        {formatChoice(log.second_choice)}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {log.second_dice
                          ? `${log.second_dice} / ${formatChoice(log.second_result)}`
                          : "-"}
                      </td>

                      <td className="px-4 py-4 text-right font-black text-yellow-600">
                        {Number(log.payout_amount).toLocaleString()}개
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 font-bold text-zinc-700">
                          {formatStatus(log)}
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