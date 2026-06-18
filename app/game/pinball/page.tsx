"use client";

import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";

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

type LogType = {
  id: number;
  ball_count: number;
  selected_color: string;
  loser_color: string;
  bet_amount: number;
  is_win: number;
  payout_amount: number;
};

type RotatingBumper = Matter.Body & {
  spinSpeed?: number;
};

const WORLD_WIDTH = 720;
const WORLD_HEIGHT = 6800;
const VIEW_HEIGHT = 1100;
const CAMERA_SCALE = 0.78;

export default function PinballPage() {
  const [ballCount, setBallCount] = useState<3 | 5>(3);
  const [selectedColor, setSelectedColor] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [winnerColor, setWinnerColor] = useState("");
  const [showFireworks, setShowFireworks] = useState(false);
  const [logs, setLogs] = useState<LogType[]>([]);
  const [cameraY, setCameraY] = useState(0);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const bumpersRef = useRef<RotatingBumper[]>([]);
  const exitOrderRef = useRef<string[]>([]);
  const expectedWinnerRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const stuckRef = useRef<Record<string, { x: number; y: number; count: number }>>({});

  const colors = ballCount === 3 ? COLORS_3 : COLORS_5;

  async function fetchLogs() {
    try {
      const res = await fetch("/api/game/pinball/logs", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setLogs(data.logs || []);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchLogs();

    return () => {
      cleanupMatter();
    };
  }, []);

  function cleanupMatter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
      renderRef.current.textures = {};
      renderRef.current = null;
    }

    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
      runnerRef.current = null;
    }

    if (engineRef.current) {
      Matter.World.clear(engineRef.current.world, false);
      Matter.Engine.clear(engineRef.current);
      engineRef.current = null;
    }

    ballsRef.current = [];
    bumpersRef.current = [];
    exitOrderRef.current = [];
    stuckRef.current = {};
    setCameraY(0);
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
    setWinnerColor("");
    setShowFireworks(false);
    cleanupMatter();

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

    expectedWinnerRef.current = data.loserColor;
    startMatter(data.finishOrder, data.loserColor);
  }

  function startMatter(finishOrder: string[], finalColor: string) {
    if (!sceneRef.current) return;

    const engine = Matter.Engine.create();
    engine.gravity.y = 0.72;
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        wireframes: false,
        background: "transparent",
      },
    });

    renderRef.current = render;

    const wallStyle = { fillStyle: "#27272a" };
    const pinStyle = { fillStyle: "#d4d4d8" };
    const bumperStyle = { fillStyle: "#facc15" };

    const leftWall = Matter.Bodies.rectangle(-18, WORLD_HEIGHT / 2, 36, WORLD_HEIGHT, {
      isStatic: true,
      restitution: 0.25,
      friction: 0,
      render: wallStyle,
    });

    const rightWall = Matter.Bodies.rectangle(WORLD_WIDTH + 18, WORLD_HEIGHT / 2, 36, WORLD_HEIGHT, {
      isStatic: true,
      restitution: 0.25,
      friction: 0,
      render: wallStyle,
    });

    const topWall = Matter.Bodies.rectangle(WORLD_WIDTH / 2, -20, WORLD_WIDTH, 40, {
      isStatic: true,
      render: wallStyle,
    });

    Matter.Composite.add(engine.world, [leftWall, rightWall, topWall]);

    const pins: Matter.Body[] = [];
    const pinRows = 38;
    const cols = 7;

    for (let row = 0; row < pinRows; row++) {
      for (let col = 0; col < cols; col++) {
        const baseX = 80 + col * 93 + (row % 2 ? 46 : 0);
        const randomX = Math.sin(row * 19 + col * 31) * 18 + (Math.random() * 18 - 9);
        const randomY = Math.cos(row * 11 + col * 17) * 12 + (Math.random() * 12 - 6);
        const x = baseX + randomX;
        const y = 240 + row * 150 + randomY;

        if (x > 50 && x < WORLD_WIDTH - 50 && y < WORLD_HEIGHT - 520) {
          pins.push(
            Matter.Bodies.circle(x, y, row % 4 === 0 ? 10 : 8, {
              isStatic: true,
              restitution: 0.68,
              friction: 0,
              render: pinStyle,
            })
          );
        }
      }
    }

    const bumperData = [
      { x: 190, y: 560, w: 210, h: 18, angle: 0.25, spin: 0.012 },
      { x: 500, y: 880, w: 210, h: 18, angle: -0.3, spin: -0.013 },
      { x: 245, y: 1250, w: 230, h: 18, angle: -0.18, spin: 0.011 },
      { x: 500, y: 1650, w: 230, h: 18, angle: 0.24, spin: -0.012 },
      { x: 205, y: 2100, w: 240, h: 18, angle: 0.28, spin: 0.014 },
      { x: 510, y: 2550, w: 240, h: 18, angle: -0.3, spin: -0.014 },
      { x: 360, y: 3100, w: 260, h: 18, angle: 0.18, spin: 0.01 },
      { x: 190, y: 3650, w: 210, h: 18, angle: -0.25, spin: -0.012 },
      { x: 510, y: 4200, w: 230, h: 18, angle: 0.27, spin: 0.013 },
      { x: 360, y: 4850, w: 260, h: 18, angle: -0.15, spin: -0.011 },
      { x: 210, y: 5450, w: 220, h: 18, angle: 0.3, spin: 0.012 },
      { x: 500, y: 6050, w: 220, h: 18, angle: -0.3, spin: -0.012 },
    ];

    const bumpers = bumperData.map((b) => {
      const body = Matter.Bodies.rectangle(b.x, b.y, b.w, b.h, {
        isStatic: true,
        angle: b.angle,
        restitution: 0.92,
        friction: 0,
        render: bumperStyle,
      }) as RotatingBumper;

      body.spinSpeed = b.spin;
      return body;
    });

    bumpersRef.current = bumpers;

    const funnelLeft = Matter.Bodies.rectangle(
      245,
      WORLD_HEIGHT - 175,
      320,
      22,
      {
        isStatic: true,
        angle: 0.95,
        restitution: 0.35,
        friction: 0,
        render: { fillStyle: "#52525b" },
      }
    );

    const funnelRight = Matter.Bodies.rectangle(
      475,
      WORLD_HEIGHT - 175,
      320,
      22,
      {
        isStatic: true,
        angle: -0.95,
        restitution: 0.35,
        friction: 0,
        render: { fillStyle: "#52525b" },
      }
    );

    const bottomLeftWall = Matter.Bodies.rectangle(
      120,
      WORLD_HEIGHT - 35,
      220,
      30,
      {
        isStatic: true,
        render: wallStyle,
      }
    );

    const bottomRightWall = Matter.Bodies.rectangle(
      600,
      WORLD_HEIGHT - 35,
      220,
      30,
      {
        isStatic: true,
        render: wallStyle,
      }
    );

    const exitSensor = Matter.Bodies.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT - 28,
      90,
      80,
      {
        isStatic: true,
        isSensor: true,
        label: "exit",
        render: {
          fillStyle: "rgba(250,204,21,0.24)",
        },
      }
    );

    Matter.Composite.add(engine.world, [
      ...pins,
      ...bumpers,
      funnelLeft,
      funnelRight,
      bottomLeftWall,
      bottomRightWall,
      exitSensor,
    ]);

    const balls = finishOrder.map((color: string, index: number) => {
      const isFinal = color === finalColor;

      const ball = Matter.Bodies.circle(140 + index * 110, 70, 22, {
        label: `ball:${color}`,
        restitution: 0.52,
        friction: 0.01,
        frictionAir: isFinal ? 0.013 : 0.005 + index * 0.001,
        density: isFinal ? 0.001 : 0.00135,
        render: {
          fillStyle: COLOR_HEX[color],
          strokeStyle: "#ffffff",
          lineWidth: 3,
        },
      }) as Matter.Body & { color?: string; exited?: boolean };

      ball.color = color;
      ball.exited = false;

      Matter.Body.setVelocity(ball, {
        x: (Math.random() - 0.5) * 4.5,
        y: 0,
      });

      return ball;
    });

    ballsRef.current = balls;
    Matter.Composite.add(engine.world, balls);

    Matter.Events.on(engine, "beforeUpdate", () => {
      bumpersRef.current.forEach((bumper) => {
        Matter.Body.rotate(bumper, bumper.spinSpeed || 0);
      });

      ballsRef.current.forEach((rawBall: any) => {
        const ball = rawBall as Matter.Body & { color?: string; exited?: boolean };
        if (!ball.color || ball.exited) return;

        const speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
        const key = ball.color;
        const prev = stuckRef.current[key];

        if (prev) {
          const moved = Math.abs(ball.position.x - prev.x) + Math.abs(ball.position.y - prev.y);

          if (moved < 1.5 && speed < 0.55 && ball.position.y < WORLD_HEIGHT - 260) {
            stuckRef.current[key] = {
              x: ball.position.x,
              y: ball.position.y,
              count: prev.count + 1,
            };
          } else {
            stuckRef.current[key] = {
              x: ball.position.x,
              y: ball.position.y,
              count: 0,
            };
          }
        } else {
          stuckRef.current[key] = {
            x: ball.position.x,
            y: ball.position.y,
            count: 0,
          };
        }

        if (stuckRef.current[key].count > 35) {
          Matter.Body.applyForce(ball, ball.position, {
            x: (Math.random() - 0.5) * 0.018,
            y: 0.025,
          });

          Matter.Body.setVelocity(ball, {
            x: (Math.random() - 0.5) * 8,
            y: Math.max(ball.velocity.y, 5),
          });

          stuckRef.current[key].count = 0;
        }

        if (speed < 0.35 && ball.position.y < WORLD_HEIGHT - 260) {
          Matter.Body.applyForce(ball, ball.position, {
            x: (Math.random() - 0.5) * 0.004,
            y: 0.006,
          });
        }
      });
    });

    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const bodies = [pair.bodyA, pair.bodyB];
        const exit = bodies.find((body) => body.label === "exit");
        const ball = bodies.find((body: any) => body.label?.startsWith("ball:")) as
          | (Matter.Body & { color?: string; exited?: boolean })
          | undefined;

        if (!exit || !ball || !ball.color || ball.exited) return;

        const isFinalBall = ball.color === expectedWinnerRef.current;
        const remainingBeforeFinal = exitOrderRef.current.length < ballCount - 1;

        if (isFinalBall && remainingBeforeFinal) {
          Matter.Body.setPosition(ball, {
            x: WORLD_WIDTH / 2 + (Math.random() > 0.5 ? 120 : -120),
            y: WORLD_HEIGHT - 520,
          });

          Matter.Body.setVelocity(ball, {
            x: Math.random() > 0.5 ? 6 : -6,
            y: -10,
          });

          return;
        }

        ball.exited = true;
        exitOrderRef.current.push(ball.color);

        Matter.Composite.remove(engine.world, ball);
        ballsRef.current = ballsRef.current.filter((b: any) => b.color !== ball.color);

        if (exitOrderRef.current.length >= ballCount) {
          finishGame(expectedWinnerRef.current);
        }
      });
    });

    Matter.Render.run(render);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    function updateCamera() {
      const activeBalls = ballsRef.current;

      if (activeBalls.length > 0) {
        const maxY = Math.max(...activeBalls.map((ball) => ball.position.y));
        const nextCamera = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, maxY - 420));
        setCameraY(nextCamera);
      }

      rafRef.current = requestAnimationFrame(updateCamera);
    }

    updateCamera();
  }

  function finishGame(color: string) {
    setWinnerColor(color);
    setShowFireworks(true);
    setMessage(`${COLOR_LABELS[color]} WIN!`);
    fetchLogs();

    setTimeout(() => {
      setShowFireworks(false);
    }, 2400);

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      {showFireworks && (
        <div className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute h-[440px] w-[440px] animate-ping rounded-full bg-yellow-400/30" />
          <div className="absolute h-[280px] w-[280px] animate-ping rounded-full bg-white/20" />
          <div
            className="z-10 text-7xl font-black drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            style={{ color: COLOR_HEX[winnerColor] || "#fff" }}
          >
            {COLOR_LABELS[winnerColor]} WIN!
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[300px_1fr_360px]">
        <section className="rounded-3xl bg-zinc-950 p-6">
          <h1 className="mb-6 text-3xl font-black text-yellow-400">
            핀볼 WIN 색 맞추기
          </h1>

          <div className="mb-5 grid grid-cols-2 gap-3">
            {[3, 5].map((count) => (
              <button
                key={count}
                onClick={() => {
                  setBallCount(count as 3 | 5);
                  setSelectedColor("");
                  setMessage("");
                  setWinnerColor("");
                  setShowFireworks(false);
                  cleanupMatter();
                }}
                disabled={loading}
                className={`rounded-2xl px-4 py-4 font-black ${
                  ballCount === count
                    ? "bg-yellow-400 text-black"
                    : "bg-zinc-800 text-white"
                }`}
              >
                {count}공
              </button>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                disabled={loading}
                className={`h-16 rounded-2xl border-4 font-black text-black ${
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
            disabled={loading}
            className="mb-4 w-full rounded-2xl bg-zinc-900 px-5 py-4 outline-none"
          />

          <button
            onClick={playGame}
            disabled={loading}
            className="w-full rounded-2xl bg-purple-600 py-4 text-xl font-black disabled:opacity-50"
          >
            {loading ? "진행중..." : "배팅하기"}
          </button>

          {message && (
            <div className="mt-6 text-center text-2xl font-black text-yellow-400">
              {message}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-zinc-950 p-5">
          <div className="relative h-[860px] overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black">
            <div
              className="absolute left-1/2 top-0"
              style={{
                width: WORLD_WIDTH,
                height: WORLD_HEIGHT,
                transform: `translateX(-50%) translateY(-${cameraY}px) scale(${CAMERA_SCALE})`,
                transformOrigin: "top center",
                transition: "transform 0.12s linear",
              }}
            >
              <div ref={sceneRef} />
              <div className="pointer-events-none absolute bottom-[12px] left-1/2 z-20 -translate-x-1/2 rounded-full border border-yellow-400 bg-yellow-400/20 px-8 py-3 text-xl font-black text-yellow-300">
                WIN HOLE
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl bg-zinc-950 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-black text-cyan-400">이전 기록</h2>
            <button
              onClick={fetchLogs}
              className="rounded-xl bg-zinc-800 px-3 py-2 text-xs font-black"
            >
              새로고침
            </button>
          </div>

          <div className="flex max-h-[960px] flex-col gap-3 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400">
                아직 기록이 없습니다.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-2xl bg-zinc-900 p-4">
                  <div className="text-sm text-zinc-400">
                    {log.ball_count}공 모드
                  </div>

                  <div className="font-black text-white">
                    선택: {COLOR_LABELS[log.selected_color]}
                  </div>

                  <div
                    className="font-black"
                    style={{ color: COLOR_HEX[log.loser_color] }}
                  >
                    WIN: {COLOR_LABELS[log.loser_color]}
                  </div>

                  <div className="text-yellow-400">
                    배팅: {Number(log.bet_amount).toLocaleString()}
                  </div>

                  <div
                    className={`mt-1 font-black ${
                      log.is_win ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {log.is_win
                      ? `적중 +${Number(log.payout_amount).toLocaleString()}`
                      : "미적중"}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}