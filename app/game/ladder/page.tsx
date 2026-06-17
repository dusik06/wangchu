"use client";

import { useEffect, useState } from "react";

type LogType = {
  id: number;
  nickname: string;
  bet_type: string;
  bet_amount: number;
  result_text: string;
  is_win: number;
  payout_amount: number;
};

const BET_OPTIONS = [
  { label: "좌", value: "left", rate: "1.9배" },
  { label: "우", value: "right", rate: "1.9배" },
  { label: "홀", value: "odd", rate: "1.9배" },
  { label: "짝", value: "even", rate: "1.9배" },
  { label: "3줄", value: "line3", rate: "1.9배" },
  { label: "4줄", value: "line4", rate: "1.9배" },
  { label: "좌3", value: "left3", rate: "3.9배" },
  { label: "우4", value: "right4", rate: "3.9배" },
  { label: "좌4", value: "left4", rate: "3.9배" },
  { label: "우3", value: "right3", rate: "3.9배" },
];

function getBetLabel(value: string) {
  return BET_OPTIONS.find((item) => item.value === value)?.label || value;
}

export default function LadderPage() {
  const [betType, setBetType] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("?");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<LogType[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  async function loadLogs() {
    const res = await fetch("/api/game/ladder/logs", { cache: "no-store" });
    const data = await res.json();

    if (data.success) {
      setLogs(data.logs);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function playGame() {
    if (!betType || !betAmount) {
      alert("배팅 정보를 입력하세요.");
      return;
    }

    setLoading(true);
    setResult("?");
    setMessage("");
    setActiveStep(0);

    const res = await fetch("/api/game/ladder/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        betType,
        betAmount: Number(betAmount),
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message);
      setLoading(false);
      return;
    }

    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      setActiveStep(step);

      if (step >= 8) {
        clearInterval(timer);

        setTimeout(() => {
          setResult(data.result.text);
          setMessage(
            data.isWin
              ? `적중! ${Number(data.payout).toLocaleString()} 도토리 획득`
              : "미적중! 다음 기회에!"
          );
          loadLogs();
          setLoading(false);
        }, 400);
      }
    }, 230);
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(199,151,56,0.18),transparent_34%),linear-gradient(180deg,#070912,#03040a)]" />

      <div className="mx-auto max-w-[1450px] px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <a href="/" className="text-sm font-bold text-zinc-400 hover:text-[#f7d36b]">
            ← 홈으로
          </a>
          <div className="rounded-full border border-[#3b321f] bg-[#0d1018] px-4 py-2 text-sm font-black text-[#f7d36b]">
            네임드 사다리 스타일
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="rounded-[30px] border border-[#3b321f] bg-[#090c14]/95 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-[#f7d36b]">사다리게임</h1>
                <p className="mt-2 text-sm text-zinc-400">
                  배팅금을 입력하고 원하는 결과를 선택하면 즉시 게임이 시작됩니다.
                </p>
              </div>
              <div className="rounded-2xl border border-[#3b321f] bg-[#11131b] px-5 py-3 text-right">
                <p className="text-xs text-zinc-500">선택</p>
                <p className="text-xl font-black text-white">
                  {betType ? getBetLabel(betType) : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#3b321f] bg-[#0d1018] p-5">
              <div className="mb-5 grid grid-cols-3 gap-4 text-center text-sm font-black">
                <div className="rounded-2xl bg-[#151925] py-3 text-[#f7d36b]">LEFT</div>
                <div className="rounded-2xl bg-[#151925] py-3 text-zinc-300">?</div>
                <div className="rounded-2xl bg-[#151925] py-3 text-[#f7d36b]">RIGHT</div>
              </div>

              <div className="relative mx-auto h-[360px] max-w-[760px] overflow-hidden rounded-[26px] border border-[#3b321f] bg-black/35 p-6">
                <div className="absolute left-[18%] top-8 h-[300px] w-2 rounded-full bg-[#3b321f]" />
                <div className="absolute left-[50%] top-8 h-[300px] w-2 -translate-x-1/2 rounded-full bg-[#3b321f]" />
                <div className="absolute right-[18%] top-8 h-[300px] w-2 rounded-full bg-[#3b321f]" />

                {[70, 120, 170, 220, 270].map((top, index) => (
                  <div
                    key={top}
                    className={`absolute h-2 rounded-full transition-all duration-300 ${
                      activeStep > index
                        ? "bg-[#f7d36b] shadow-[0_0_18px_rgba(247,211,107,0.8)]"
                        : "bg-[#2b2415]"
                    }`}
                    style={{
                      top,
                      left: index % 2 === 0 ? "18%" : "50%",
                      width: "32%",
                    }}
                  />
                ))}

                <div
                  className="absolute z-20 h-9 w-9 rounded-full border-4 border-[#f7d36b] bg-[#7c3aed] shadow-[0_0_24px_rgba(247,211,107,0.8)] transition-all duration-300"
                  style={{
                    left:
                      activeStep === 0
                        ? "16%"
                        : activeStep === 1
                        ? "34%"
                        : activeStep === 2
                        ? "48%"
                        : activeStep === 3
                        ? "64%"
                        : activeStep === 4
                        ? "48%"
                        : activeStep === 5
                        ? "34%"
                        : activeStep === 6
                        ? "48%"
                        : activeStep === 7
                        ? "64%"
                        : "78%",
                    top:
                      activeStep === 0
                        ? "30px"
                        : activeStep === 1
                        ? "70px"
                        : activeStep === 2
                        ? "120px"
                        : activeStep === 3
                        ? "170px"
                        : activeStep === 4
                        ? "220px"
                        : activeStep === 5
                        ? "270px"
                        : activeStep === 6
                        ? "305px"
                        : activeStep === 7
                        ? "320px"
                        : "320px",
                    opacity: loading ? 1 : 0,
                  }}
                />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border border-[#f7d36b]/50 bg-[#05070d]/90 text-5xl font-black text-[#f7d36b] shadow-2xl">
                    {loading ? "..." : result}
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-lg font-black text-[#f7d36b]">
                  {message || "결과는 시작 전까지 ? 로 가려집니다."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-5 gap-3">
              {BET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setBetType(option.value)}
                  disabled={loading}
                  className={`rounded-2xl border p-4 text-center transition ${
                    betType === option.value
                      ? "border-[#f7d36b] bg-[#f7d36b] text-black"
                      : "border-[#3b321f] bg-[#11131b] hover:bg-[#2b2415]"
                  }`}
                >
                  <p className="text-xl font-black">{option.label}</p>
                  <p className="mt-1 text-xs font-black opacity-70">{option.rate}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="배팅 도토리 입력"
                disabled={loading}
                className="rounded-2xl border border-[#3b321f] bg-[#11131b] px-5 py-4 text-lg font-black outline-none placeholder:text-zinc-600 focus:border-[#f7d36b]"
              />

              <button
                onClick={playGame}
                disabled={loading}
                className="rounded-2xl bg-[#7c3aed] px-5 py-4 text-lg font-black text-white hover:bg-[#6d28d9] disabled:opacity-50"
              >
                {loading ? "진행중..." : "배팅하기"}
              </button>
            </div>
          </div>

          <aside className="rounded-[30px] border border-[#3b321f] bg-[#090c14]/95 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-[#f7d36b]">이전 기록</h2>
              <button
                onClick={loadLogs}
                className="rounded-xl bg-[#151925] px-3 py-2 text-xs font-black text-zinc-300 hover:bg-[#2b2415]"
              >
                새로고침
              </button>
            </div>

            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-5 text-sm text-zinc-400">
                  아직 기록이 없습니다.
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-black text-white">{log.nickname || "익명"}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          log.is_win
                            ? "bg-[#f7d36b] text-black"
                            : "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {log.is_win ? "적중" : "미적중"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-zinc-400">
                      <p>배팅: {getBetLabel(log.bet_type)}</p>
                      <p>결과: {log.result_text}</p>
                      <p>금액: {Number(log.bet_amount).toLocaleString()}</p>
                      <p>지급: {Number(log.payout_amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}