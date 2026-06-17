"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS_3 = ["red", "blue", "yellow"];
const COLORS_5 = ["red", "blue", "yellow", "green", "purple"];

const COLOR_LABELS: Record<string, string> = {
  red: "빨강",
  blue: "파랑",
  yellow: "노랑",
  green: "초록",
  purple: "보라",
};

const COLOR_HEX: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#facc15",
  green: "#22c55e",
  purple: "#a855f7",
};

type BallState = {
  color: string;
  top: number;
  left: number;
  rotate: number;
  scale: number;
  finished: boolean;
};

type LogType = {
  id: number;
  ball_count: number;
  selected_color: string;
  loser_color: string;
  bet_amount: number;
};

export default function PinballPage() {
  const [ballCount, setBallCount] = useState<3 | 5>(3);
  const [selectedColor, setSelectedColor] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [finishOrder, setFinishOrder] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [balls, setBalls] = useState<BallState[]>([]);
  const [winnerColor, setWinnerColor] = useState("");
  const [showFireworks, setShowFireworks] = useState(false);
  const [logs, setLogs] = useState<LogType[]>([]);

  const colors = ballCount === 3 ? COLORS_3 : COLORS_5;

  async function fetchLogs() {
    try {
      const res = await fetch("/api/game/pinball/logs", {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const pins = useMemo(() => {
    const arr: { top: number; left: number; size: number }[] = [];

    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 8; col++) {
        arr.push({
          top: row * 42 + 54,
          left: col * 72 + (row % 2 ? 36 : 0) + 70,
          size: row % 3 === 0 ? 14 : 10,
        });
      }
    }

    return arr;
  }, []);

  const bumpers = useMemo(() => {
    return [
      { top: 160, left: 170, rotate: 18 },
      { top: 230, left: 460, rotate: -22 },
      { top: 330, left: 280, rotate: -16 },
      { top: 420, left: 560, rotate: 24 },
      { top: 520, left: 180, rotate: -28 },
      { top: 610, left: 420, rotate: 18 },
    ];
  }, []);

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  async function playGame() {
    if (!selectedColor) {
      alert("색상을 선택하세요.");
      return;
    }

    if (!betAmount || Number(betAmount) <= 0) {
      alert("배팅 금액 입력");
      return;
    }

    setLoading(true);
    setMessage("핀볼 진행중...");
    setFinishOrder([]);
    setBalls([]);
    setWinnerColor("");
    setShowFireworks(false);

    const res = await fetch("/api/game/pinball/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ballCount,
        selectedColor,
        betAmount: Number(betAmount),
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message);
      setLoading(false);
      setMessage("");
      return;
    }

    const initialBalls = data.finishOrder.map((color: string, index: number) => ({
      color,
      top: 10,
      left: 180 + index * 95,
      rotate: 0,
      scale: 1,
      finished: false,
    }));

    setBalls(initialBalls);

    data.finishOrder.forEach((color: string, finishIndex: number) => {
      let step = 0;
      let horizontalDirection = finishIndex % 2 === 0 ? 1 : -1;
      const totalSteps = 35 + finishIndex * 7;
      const baseSpeed = 21 - Math.min(finishIndex, 3);
      const targetLeft = 120 + finishIndex * 115;

      const timer = setInterval(() => {
        step++;

        if (step % 4 === 0) {
          horizontalDirection *= -1;
        }

        setBalls((prev) =>
          prev.map((ball) => {
            if (ball.color !== color || ball.finished) return ball;

            const progress = step / totalSteps;

            const swing =
              Math.sin(step * 1.7 + finishIndex) * 38 +
              horizontalDirection * (18 + Math.random() * 22);

            const fakeHitBoost = step % 5 === 0 ? 18 : 0;

            const slowZone =
              progress > 0.65 && finishIndex >= data.finishOrder.length - 2
                ? Math.random() > 0.5
                  ? -8
                  : 4
                : 0;

            const comebackBoost =
              progress > 0.82 && finishIndex === data.finishOrder.length - 2
                ? Math.random() > 0.4
                  ? 12
                  : -4
                : 0;

            const nextTop =
              ball.top + baseSpeed + fakeHitBoost + slowZone + comebackBoost;

            const mixedLeft =
              ball.left * 0.82 +
              (targetLeft + swing + Math.random() * 36 - 18) * 0.18;

            return {
              ...ball,
              top: clamp(nextTop, 10, 760),
              left: clamp(mixedLeft, 45, 680),
              rotate: ball.rotate + 55 + Math.random() * 45,
              scale: step % 5 === 0 ? 1.16 : 1,
            };
          })
        );

        if (step >= totalSteps) {
          clearInterval(timer);

          setBalls((prev) =>
            prev.map((ball) =>
              ball.color === color
                ? {
                    ...ball,
                    top: 775,
                    left: clamp(targetLeft, 70, 660),
                    scale: 1,
                    finished: true,
                  }
                : ball
            )
          );

          setFinishOrder((prev) => [...prev, color]);

          if (finishIndex === data.finishOrder.length - 1) {
            setTimeout(() => {
              setWinnerColor(data.loserColor);
              setShowFireworks(true);
              setMessage(`${COLOR_LABELS[data.loserColor]} WIN!`);
              fetchLogs();

              setTimeout(() => {
                setShowFireworks(false);
              }, 2200);

              setLoading(false);
            }, 900);
          }
        }
      }, 150);
    });
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="mb-6 text-4xl font-black text-yellow-400">
            핀볼 꼴등 맞추기
          </h1>

          <div className="mb-6 flex gap-4">
            {[3, 5].map((count) => (
              <button
                key={count}
                onClick={() => {
                  setBallCount(count as 3 | 5);
                  setSelectedColor("");
                }}
                disabled={loading}
                className={`rounded-2xl px-5 py-3 font-black ${
                  ballCount === count
                    ? "bg-yellow-400 text-black"
                    : "bg-zinc-800 text-white"
                }`}
              >
                {count}공
              </button>
            ))}
          </div>

          <div className="mb-8 grid grid-cols-5 gap-4">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`h-20 rounded-2xl border-4 font-black text-black ${
                  selectedColor === color ? "border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: COLOR_HEX[color] }}
              >
                {COLOR_LABELS[color]}
              </button>
            ))}
          </div>

          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="배팅 도토리 입력"
            className="mb-6 w-full rounded-2xl bg-zinc-900 px-5 py-4"
          />

          <button
            onClick={playGame}
            disabled={loading}
            className="w-full rounded-2xl bg-purple-600 py-4 text-xl font-black"
          >
            {loading ? "진행중..." : "배팅하기"}
          </button>

          {message && (
            <div className="mt-8 text-center text-3xl font-black text-yellow-400">
              {message}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-zinc-950 p-6">
          <h2 className="mb-6 text-2xl font-black text-cyan-400">
            이전 기록
          </h2>

          <div className="flex max-h-[900px] flex-col gap-3 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl bg-zinc-900 p-4">
                <div className="text-sm text-zinc-400">
                  {log.ball_count}공 모드
                </div>

                <div className="font-black text-white">
                  선택: {COLOR_LABELS[log.selected_color]}
                </div>

                <div
                  className="font-black"
                  style={{
                    color: COLOR_HEX[log.loser_color],
                  }}
                >
                  꼴등: {COLOR_LABELS[log.loser_color]}
                </div>

                <div className="text-yellow-400">
                  배팅: {Number(log.bet_amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}