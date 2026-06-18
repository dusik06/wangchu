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

const WORLD_WIDTH = 740;
const WORLD_HEIGHT = 6800;
const VIEW_HEIGHT = 860;
const CAMERA_SCALE = 0.82;

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
    return () => cleanupMatter();
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
    angle: number,
    color = "#52525b"
  ) {
    bodies.push(
      Matter.Bodies.rectangle(x, y, w, h, {
        isStatic: true,
        angle,
        restitution: 0.28,
        friction: 0,
        render: { fillStyle: color },
      })
    );
  }

  function startMatter(finishOrder: string[], finalColor: string) {
    if (!sceneRef.current) return;

    const engine = Matter.Engine.create();
    engine.gravity.y = 0.78;
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

    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(-18, WORLD_HEIGHT / 2, 36, WORLD_HEIGHT, {
        isStatic: true,
        restitution: 0.18,
        friction: 0,
        render: wallStyle,
      }),
      Matter.Bodies.rectangle(WORLD_WIDTH + 18, WORLD_HEIGHT / 2, 36, WORLD_HEIGHT, {
        isStatic: true,
        restitution: 0.18,
        friction: 0,
        render: wallStyle,
      }),
      Matter.Bodies.rectangle(WORLD_WIDTH / 2, -20, WORLD_WIDTH, 40, {
        isStatic: true,
        render: wallStyle,
      }),
    ]);

    const mazeWalls: Matter.Body[] = [];

    addWall(mazeWalls, 185, 520, 310, 16, 0.7);
    addWall(mazeWalls, 545, 780, 310, 16, -0.68);
    addWall(mazeWalls, 210, 1120, 300, 16, -0.65);
    addWall(mazeWalls, 535, 1500, 310, 16, 0.66);
    addWall(mazeWalls, 370, 1950, 430, 16, 0.08);
    addWall(mazeWalls, 210, 2400, 300, 16, 0.7);
    addWall(mazeWalls, 535, 2850, 320, 16, -0.7);
    addWall(mazeWalls, 370, 3350, 420, 16, -0.08);
    addWall(mazeWalls, 200, 3900, 300, 16, -0.68);
    addWall(mazeWalls, 545, 4450, 310, 16, 0.68);
    addWall(mazeWalls, 370, 5050, 440, 16, 0.1);
    addWall(mazeWalls, 210, 5650, 300, 16, 0.72);
    addWall(mazeWalls, 535, 6100, 300, 16, -0.72);

    const triangleA = Matter.Bodies.polygon(370, 1280, 3, 70, {
      isStatic: true,
      angle: Math.PI / 2,
      restitution: 0.35,
      friction: 0,
      render: { fillStyle: "#3f3f46" },
    });

    const triangleB = Matter.Bodies.polygon(370, 3600, 3, 80, {
      isStatic: true,
      angle: -Math.PI / 2,
      restitution: 0.35,
      friction: 0,
      render: { fillStyle: "#3f3f46" },
    });

    Matter.Composite.add(engine.world, [...mazeWalls, triangleA, triangleB]);

    const pins: Matter.Body[] = [];
    const pinZones = [
      { yStart: 220, rows: 7, cols: 6, gapX: 90, gapY: 105 },
      { yStart: 1680, rows: 7, cols: 6, gapX: 90, gapY: 105 },
      { yStart: 3150, rows: 7, cols: 6, gapX: 90, gapY: 105 },
      { yStart: 4700, rows: 7, cols: 6, gapX: 90, gapY: 105 },
      { yStart: 5950, rows: 5, cols: 6, gapX: 90, gapY: 105 },
    ];

    pinZones.forEach((zone, zoneIndex) => {
      for (let row = 0; row < zone.rows; row++) {
        for (let col = 0; col < zone.cols; col++) {
          const baseX =
            WORLD_WIDTH / 2 -
            ((zone.cols - 1) * zone.gapX) / 2 +
            col * zone.gapX +
            (row % 2 ? zone.gapX / 2 : 0);

          const x =
            baseX +
            Math.sin((row + 1) * 23 + (col + 1) * 37 + zoneIndex * 11) * 16;

          const y =
            zone.yStart +
            row * zone.gapY +
            Math.cos((row + 1) * 17 + (col + 1) * 31 + zoneIndex * 13) * 14;

          if (x > 55 && x < WORLD_WIDTH - 55 && y < WORLD_HEIGHT - 620) {
            pins.push(
              Matter.Bodies.circle(x, y, row % 3 === 0 ? 10 : 8, {
                isStatic: true,
                restitution: 0.62,
                friction: 0,
                render: pinStyle,
              })
            );
          }
        }
      }
    });

    Matter.Composite.add(engine.world, pins);

    const bumperData = [
      { x: 220, y: 850, w: 210, h: 16, angle: 0.22, spin: 0.026 },
      { x: 520, y: 1350, w: 210, h: 16, angle: -0.24, spin: -0.028 },
      { x: 370, y: 2200, w: 250, h: 16, angle: 0.16, spin: 0.024 },
      { x: 220, y: 4100, w: 210, h: 16, angle: -0.2, spin: -0.027 },
      { x: 520, y: 5300, w: 210, h: 16, angle: 0.22, spin: 0.028 },
      { x: 370, y: 6400, w: 270, h: 16, angle: -0.12, spin: -0.022 },
    ];

    const bumpers = bumperData.map((b) => {
      const body = Matter.Bodies.rectangle(b.x, b.y, b.w, b.h, {
        isStatic: true,
        angle: b.angle,
        restitution: 0.86,
        friction: 0,
        render: bumperStyle,
      }) as RotatingBumper;

      body.spinSpeed = b.spin;
      return body;
    });

    bumpersRef.current = bumpers;
    Matter.Composite.add(engine.world, bumpers);

    const funnelY = WORLD_HEIGHT - 260;

    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(205, funnelY, 390, 24, {
        isStatic: true,
        angle: 0.86,
        restitution: 0.2,
        friction: 0,
        render: { fillStyle: "#52525b" },
      }),
      Matter.Bodies.rectangle(535, funnelY, 390, 24, {
        isStatic: true,
        angle: -0.86,
        restitution: 0.2,
        friction: 0,
        render: { fillStyle: "#52525b" },
      }),
      Matter.Bodies.rectangle(150, WORLD_HEIGHT - 42, 270, 34, {
        isStatic: true,
        render: wallStyle,
      }),
      Matter.Bodies.rectangle(590, WORLD_HEIGHT - 42, 270, 34, {
        isStatic: true,
        render: wallStyle,
      }),
    ]);

    const exitSensor = Matter.Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 28, 90, 90, {
      isStatic: true,
      isSensor: true,
      label: "exit",
      render: { fillStyle: "rgba(250,204,21,0.1)" },
    });

    Matter.Composite.add(engine.world, exitSensor);

    const balls = finishOrder.map((color: string, index: number) => {
      const isFinal = color === finalColor;

      const ball = Matter.Bodies.circle(210 + index * 80, 70, 22, {
        label: `ball:${color}`,
        restitution: 0.5,
        friction: 0.005,
        frictionAir: isFinal ? 0.012 : 0.004 + index * 0.001,
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
        x: (Math.random() - 0.5) * 4,
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
          const moved =
            Math.abs(ball.position.x - prev.x) + Math.abs(ball.position.y - prev.y);

          if (moved < 1.5 && speed < 0.55 && ball.position.y < WORLD_HEIGHT - 320) {
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

        if (stuckRef.current[key].count > 24) {
          Matter.Body.applyForce(ball, ball.position, {
            x: (Math.random() - 0.5) * 0.025,
            y: 0.035,
          });

          Matter.Body.setVelocity(ball, {
            x: (Math.random() - 0.5) * 9,
            y: Math.max(ball.velocity.y, 7),
          });

          stuckRef.current[key].count = 0;
        }

        if (speed < 0.35 && ball.position.y < WORLD_HEIGHT - 320) {
          Matter.Body.applyForce(ball, ball.position, {
            x: (Math.random() - 0.5) * 0.006,
            y: 0.008,
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
            x: WORLD_WIDTH / 2 + (Math.random() > 0.5 ? 110 : -110),
            y: WORLD_HEIGHT - 650,
          });

          Matter.Body.setVelocity(ball, {
            x: Math.random() > 0.5 ? 7 : -7,
            y: -12,
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

    function updateCamera() {
      const activeBalls = ballsRef.current;

      if (activeBalls.length > 0) {
        const leaderY = Math.max(...activeBalls.map((ball) => ball.position.y));
        const visibleWorldHeight = VIEW_HEIGHT / CAMERA_SCALE;
        const funnelStartY = WORLD_HEIGHT - 980;

        const cameraTarget =
          leaderY > funnelStartY
            ? WORLD_HEIGHT - visibleWorldHeight
            : leaderY - visibleWorldHeight * 0.42;

        const nextCamera = Math.max(
          0,
          Math.min(WORLD_HEIGHT - visibleWorldHeight, cameraTarget)
        );

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