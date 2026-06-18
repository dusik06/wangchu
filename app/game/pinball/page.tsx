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

const WORLD_WIDTH = 560;
const WORLD_HEIGHT = 1120;

export default function PinballPage() {
  const [ballCount, setBallCount] = useState<3 | 5>(3);
  const [selectedColor, setSelectedColor] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [winnerColor, setWinnerColor] = useState("");
  const [showFireworks, setShowFireworks] = useState(false);
  const [logs, setLogs] = useState<LogType[]>([]);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const bumpersRef = useRef<RotatingBumper[]>([]);
  const exitOrderRef = useRef<string[]>([]);
  const expectedWinnerRef = useRef("");
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
    return () => cleanupMatter();
  }, []);

  function cleanupMatter() {
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
      headers: { "Content-Type": "application/json" },
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

  function addWall(
    bodies: Matter.Body[],
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number
  ) {
    bodies.push(
      Matter.Bodies.rectangle(x, y, w, h, {
        isStatic: true,
        angle,
        restitution: 0.26,
        friction: 0,
        render: {
          fillStyle: "#ecfeff",
          strokeStyle: "#22d3ee",
          lineWidth: 3,
        },
      })
    );
  }

  function addPin(bodies: Matter.Body[], x: number, y: number, r = 8) {
    bodies.push(
      Matter.Bodies.circle(x, y, r, {
        isStatic: true,
        restitution: 0.72,
        friction: 0,
        render: {
          fillStyle: "#f4f4f5",
          strokeStyle: "#ffffff",
          lineWidth: 2,
        },
      })
    );
  }

  function addBumper(
    bodies: RotatingBumper[],
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    spinSpeed: number
  ) {
    const bumper = Matter.Bodies.rectangle(x, y, w, h, {
      isStatic: true,
      angle,
      restitution: 0.95,
      friction: 0,
      render: {
        fillStyle: "#facc15",
        strokeStyle: "#fde047",
        lineWidth: 4,
      },
    }) as RotatingBumper;

    bumper.spinSpeed = spinSpeed;
    bodies.push(bumper);
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

    const wallStyle = {
      fillStyle: "#ecfeff",
      strokeStyle: "#22d3ee",
      lineWidth: 3,
    };

    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(-18, WORLD_HEIGHT / 2, 36, WORLD_HEIGHT, {
        isStatic: true,
        restitution: 0.15,
        friction: 0,
        render: wallStyle,
      }),
      Matter.Bodies.rectangle(WORLD_WIDTH + 18, WORLD_HEIGHT / 2, 36, WORLD_HEIGHT, {
        isStatic: true,
        restitution: 0.15,
        friction: 0,
        render: wallStyle,
      }),
      Matter.Bodies.rectangle(WORLD_WIDTH / 2, -20, WORLD_WIDTH, 40, {
        isStatic: true,
        render: wallStyle,
      }),
    ]);

    const walls: Matter.Body[] = [];

    addWall(walls, 145, 88, 165, 15, 0.92);
    addWall(walls, 415, 88, 165, 15, -0.92);

    addWall(walls, 95, 210, 120, 13, 0.52);
    addWall(walls, 465, 215, 120, 13, -0.52);
    addWall(walls, 210, 300, 105, 13, 0.58);
    addWall(walls, 390, 332, 100, 13, -0.54);

    addWall(walls, 95, 405, 120, 13, -0.5);
    addWall(walls, 465, 435, 120, 13, 0.5);
    addWall(walls, 230, 510, 105, 13, -0.56);
    addWall(walls, 380, 535, 105, 13, 0.55);

    addWall(walls, 95, 615, 120, 13, 0.5);
    addWall(walls, 465, 650, 120, 13, -0.5);
    addWall(walls, 220, 715, 95, 13, 0.55);
    addWall(walls, 385, 748, 95, 13, -0.55);

    addWall(walls, 95, 815, 120, 13, -0.48);
    addWall(walls, 465, 825, 120, 13, 0.48);

    addWall(walls, 138, 950, 255, 17, 0.95);
    addWall(walls, 422, 950, 255, 17, -0.95);

    addWall(walls, 245, 1050, 140, 18, 1.57);
    addWall(walls, 315, 1050, 140, 18, 1.57);

    Matter.Composite.add(engine.world, walls);

    const pins: Matter.Body[] = [];
    const pinRows = [
      [220, [105, 165, 225, 285, 345, 405, 465]],
      [275, [135, 195, 255, 315, 375, 435]],
      [350, [105, 165, 225, 285, 345, 405, 465]],
      [425, [135, 195, 255, 315, 375, 435]],
      [500, [105, 165, 225, 285, 345, 405, 465]],
      [575, [135, 195, 255, 315, 375, 435]],
      [650, [105, 165, 225, 285, 345, 405, 465]],
      [725, [135, 195, 255, 315, 375, 435]],
      [800, [105, 165, 225, 285, 345, 405, 465]],
      [875, [135, 195, 255, 315, 375, 435]],
      [940, [180, 240, 320, 380]],
      [995, [220, 280, 340]],
    ];

    pinRows.forEach(([y, xs]) => {
      (xs as number[]).forEach((x) => addPin(pins, x, y as number));
    });

    Matter.Composite.add(engine.world, pins);

    const bumpers: RotatingBumper[] = [];

    addBumper(bumpers, 280, 145, 260, 18, -0.08, 0.052);
    addBumper(bumpers, 330, 335, 210, 18, 0.22, -0.048);
    addBumper(bumpers, 180, 525, 190, 18, -0.22, 0.05);
    addBumper(bumpers, 360, 695, 210, 18, 0.15, -0.05);
    addBumper(bumpers, 185, 835, 190, 18, 0.18, 0.052);

    addBumper(bumpers, 420, 1010, 270, 20, -1.05, 0.065);

    bumpersRef.current = bumpers;
    Matter.Composite.add(engine.world, bumpers);

    const exitSensor = Matter.Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 24, 62, 70, {
      isStatic: true,
      isSensor: true,
      label: "exit",
      render: { fillStyle: "rgba(34,211,238,0.08)" },
    });

    Matter.Composite.add(engine.world, exitSensor);

    const balls = finishOrder.map((color: string, index: number) => {
      const isFinal = color === finalColor;
      const gap = ballCount === 3 ? 75 : 55;
      const startX = WORLD_WIDTH / 2 - ((finishOrder.length - 1) * gap) / 2 + index * gap;

      const ball = Matter.Bodies.circle(startX, 55, 21, {
        label: `ball:${color}`,
        restitution: 0.52,
        friction: 0.004,
        frictionAir: isFinal ? 0.011 : 0.004 + index * 0.001,
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
        x: (Math.random() - 0.5) * 5,
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

        const speed = Math.sqrt(
          ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y
        );

        const key = ball.color;
        const prev = stuckRef.current[key];

        if (prev) {
          const moved = Math.abs(ball.position.x - prev.x) + Math.abs(ball.position.y - prev.y);

          if (moved < 1.35 && speed < 0.58 && ball.position.y < WORLD_HEIGHT - 60) {
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

        if (stuckRef.current[key].count > 13) {
          Matter.Body.applyForce(ball, ball.position, {
            x: (Math.random() - 0.5) * 0.034,
            y: 0.038,
          });

          Matter.Body.setVelocity(ball, {
            x: (Math.random() - 0.5) * 9,
            y: Math.max(ball.velocity.y, 7),
          });

          stuckRef.current[key].count = 0;
        }

        if (speed < 0.32 && ball.position.y < WORLD_HEIGHT - 60) {
          Matter.Body.applyForce(ball, ball.position, {
            x: (Math.random() - 0.5) * 0.007,
            y: 0.01,
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
            x: WORLD_WIDTH / 2 + (Math.random() > 0.5 ? 78 : -78),
            y: WORLD_HEIGHT - 185,
          });

          Matter.Body.setVelocity(ball, {
            x: Math.random() > 0.5 ? 7 : -7,
            y: -11,
          });

          return;
        }

        ball.exited = true;
        exitOrderRef.current.push(ball.color);

        Matter.Composite.remove(engine.world, ball);
        ballsRef.current = ballsRef.current.filter((b: any) => b !== ball);

        if (exitOrderRef.current.length >= ballCount) {
          finishGame(expectedWinnerRef.current);
        }
      });
    });

    Matter.Render.run(render);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
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
                  ballCount === count ? "bg-yellow-400 text-black" : "bg-zinc-800 text-white"
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
          <div className="relative h-[1120px] overflow-hidden rounded-3xl border border-cyan-400/40 bg-black shadow-[0_0_35px_rgba(34,211,238,0.25)]">
            <div
              className="absolute left-1/2 top-0"
              style={{
                width: WORLD_WIDTH,
                height: WORLD_HEIGHT,
                transform: "translateX(-50%)",
                transformOrigin: "top center",
              }}
            >
              <div ref={sceneRef} />
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
                  <div className="text-sm text-zinc-400">{log.ball_count}공 모드</div>

                  <div className="font-black text-white">
                    선택: {COLOR_LABELS[log.selected_color]}
                  </div>

                  <div className="font-black" style={{ color: COLOR_HEX[log.loser_color] }}>
                    WIN: {COLOR_LABELS[log.loser_color]}
                  </div>

                  <div className="text-yellow-400">
                    배팅: {Number(log.bet_amount).toLocaleString()}
                  </div>

                  <div className={`mt-1 font-black ${log.is_win ? "text-emerald-400" : "text-red-400"}`}>
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