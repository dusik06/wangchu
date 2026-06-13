"use client";

import { useEffect, useState } from "react";

type Log = {
  id: number;
  game_id: number;
  title: string;
  win_label: string;
  lose_label: string;
  result: "WIN" | "LOSE" | null;
  game_status: string;
  nickname: string;
  email: string;
  role: string;
  choice: "WIN" | "LOSE";
  bet_amount: number;
  odds: number;
  payout_amount: number;
  status: "BET" | "WIN" | "LOSE" | "REFUNDED";
  created_at: string;
  settled_at: string | null;
};

function choiceText(log: Log) {
  return log.choice === "WIN" ? log.win_label : log.lose_label;
}

function resultText(log: Log) {
  if (!log.result) return "미정";
  return log.result === "WIN" ? log.win_label : log.lose_label;
}

function dateText(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

export default function AdminPredictionLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);

    const res = await fetch("/api/admin/prediction/logs");
    const data = await res.json();

    if (data.success) {
      setLogs(data.logs);
    } else {
      alert(data.message || "불러오기 실패");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl bg-slate-900 p-6">
          <p className="mb-2 text-sm font-bold text-purple-400">
            ADMIN PREDICTION LOG
          </p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black">예측 배팅 로그</h1>
              <p className="mt-3 text-sm text-slate-400">
                누가, 언제, 몇 개를 배팅했고 정산 결과가 어떻게 됐는지 확인합니다.
              </p>
            </div>

            <button
              onClick={loadLogs}
              className="cursor-pointer rounded-2xl bg-purple-500 px-5 py-3 font-black"
            >
              새로고침
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-4 text-left">배팅시간</th>
                  <th className="px-4 py-4 text-left">닉네임</th>
                  <th className="px-4 py-4 text-left">예측 주제</th>
                  <th className="px-4 py-4 text-center">선택</th>
                  <th className="px-4 py-4 text-right">배팅</th>
                  <th className="px-4 py-4 text-center">배당</th>
                  <th className="px-4 py-4 text-center">결과</th>
                  <th className="px-4 py-4 text-right">지급</th>
                  <th className="px-4 py-4 text-center">상태</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                      불러오는 중...
                    </td>
                  </tr>
                )}

                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                      로그가 없습니다.
                    </td>
                  </tr>
                )}

                {!loading &&
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-4 text-slate-300">
                        {dateText(log.created_at)}
                      </td>

                      <td className="px-4 py-4 font-bold">
                        {log.nickname || "닉네임 없음"}
                        {log.role === "admin" && (
                          <span className="ml-2 rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-300">
                            관리자
                          </span>
                        )}
                        <p className="mt-1 text-xs text-slate-500">{log.email}</p>
                      </td>

                      <td className="px-4 py-4 font-bold">{log.title}</td>

                      <td className="px-4 py-4 text-center">{choiceText(log)}</td>

                      <td className="px-4 py-4 text-right font-black">
                        {Number(log.bet_amount).toLocaleString()}개
                      </td>

                      <td className="px-4 py-4 text-center">
                        {Number(log.odds).toFixed(1)}배
                      </td>

                      <td className="px-4 py-4 text-center">{resultText(log)}</td>

                      <td className="px-4 py-4 text-right font-black text-yellow-400">
                        {Number(log.payout_amount).toLocaleString()}개
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 font-bold ${
                            log.status === "WIN"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : log.status === "LOSE"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {log.status === "BET"
                            ? "대기"
                            : log.status === "WIN"
                            ? "적중"
                            : log.status === "LOSE"
                            ? "실패"
                            : log.status}
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