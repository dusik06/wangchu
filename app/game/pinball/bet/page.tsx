"use client";

import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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

type MapObject =
  | { type: "wall"; x: number; y: number; w: number; h: number; angle: number }
  | { type: "pin"; x: number; y: number; r: number }
  | { type: "bumper"; x: number; y: number; w: number; h: number; angle: number; spinSpeed: number };

type RotatingBumper = Matter.Body & { spinSpeed?: number };
type ColorBall = Matter.Body & { color?: string; exited?: boolean };

const WORLD_WIDTH = 560;
const WORLD_HEIGHT = 1900;
const VIEW_HEIGHT = 1000;

const DEFAULT_MAP: MapObject[] = [];

export default function PinballBetPage() {
  const searchParams = useSearchParams();
  const mapId = searchParams.get("mapId") || "";

  const [ballCount, setBallCount] = useState<3 | 5>(3);
  const [selectedColor, setSelectedColor] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("색상을 선택하고 도토리를 배팅하세요.");
  const [winnerColor, setWinnerColor] = useState("");
  const [showFireworks, setShowFireworks] = useState(false);
  const [logs, setLogs] = useState<LogType[]>([]);
  const [cameraY, setCameraY] = useState(0);
  const [mapName, setMapName] = useState("기본맵");

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const ballsRef = useRef<ColorBall[]>([]);
  const bumpersRef = useRef<RotatingBumper[]>([]);
  const exitOrderRef = useRef<string[]>([]);
  const expectedWinnerRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const mapDataRef = useRef<MapObject[]>(DEFAULT_MAP);
  const runningRef = useRef(false);

  const colors = ballCount === 3 ? COLORS_3 : COLORS_5;
  const multiplier = ballCount === 3 ? 2.7 : 4.3;

  async function fetchLogs() {
    try {
      const res = await fetch("/api/game/pinball/logs", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setLogs(data.logs || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchMap() {
    try {
      const url = mapId ? `/api/game/pinball/map?mapId=${mapId}` : "/api/game/pinball/map";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (data.success && data.map && Array.isArray(data.map.mapData)) {
        mapDataRef.current = data.map.mapData;
        setMapName(data.map.mapName || "저장맵");
      } else {
        mapDataRef.current = DEFAULT_MAP;
        setMapName("기본맵");
      }
    } catch (error) {
      console.error(error);
      mapDataRef.current = DEFAULT_MAP;
      setMapName("기본맵");
    }
  }

  useEffect(() => {
    async function init() {
      await fetchMap();
      await fetchLogs();
      setupMatter([], false, "");
    }

    init();

    return () => cleanupMatter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, ballCount]);

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
    setCameraY(0);
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
        restitution: 0.28,
        friction: 0,
        render: {
          fillStyle: "#ecfeff",
          strokeStyle: "#22d3ee",
          lineWidth: 3,
        },
      })
    );
  }

  function addPin(bodies: Matter.Body[], x: number, y: number, r = 6) {
    bodies.push(
      Matter.Bodies.circle(x, y, r, {
        isStatic: true,
        restitution: 0.8,
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
      restitution: 0.98,
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

  function setupMatter(finishOrder: string[], shouldRun: boolean, finalColor: string) {
    if (!sceneRef.current) return;

    cleanupMatter();
    runningRef.current = shouldRun;
    setCameraY(0);

    const engine = Matter.Engine.create();
    engine.gravity.y = shouldRun ? 0.62 : 0;
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
        restitution: 0.15,
        friction: 0,
        render: { fillStyle: "transparent" },
      }),
    ]);

    const walls: Matter.Body[] = [];
    const pins: Matter.Body[] = [];
    const bumpers: RotatingBumper[] = [];

    mapDataRef.current.forEach((obj) => {
      if (obj.type === "wall") {
        addWall(walls, obj.x, obj.y, obj.w, obj.h, obj.angle);
      }

      if (obj.type === "pin") {
        addPin(pins, obj.x, obj.y, obj.r);
      }

      if (obj.type === "bumper") {
        addBumper(bumpers, obj.x, obj.y, obj.w, obj.h, obj.angle, obj.spinSpeed);
      }
    });

    Matter.Composite.add(engine.world, walls);
    Matter.Composite.add(engine.world, pins);

    bumpersRef.current = bumpers;
    Matter.Composite.add(engine.world, bumpers);

    const exitSensor = Matter.Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 24, 60, 80, {
      isStatic: true,
      isSensor: true,
      label: "exit",
      render: { fillStyle: "rgba(34,211,238,0.08)" },
    });

    Matter.Composite.add(engine.world, exitSensor);

    const startColors = finishOrder.length > 0 ? finishOrder : colors;

    const balls = startColors.map((color, index) => {
      const gap = startColors.length === 3 ? 58 : 42;
      const startX = WORLD_WIDTH / 2 - ((startColors.length - 1) * gap) / 2 + index * gap;

      const ball = Matter.Bodies.circle(startX, 55, 15, {
        label: `ball:${color}`,
        restitution: 0.64,
        friction: 0.001,
        frictionAir: color === finalColor ? 0.006 : 0.002,
        density: color === finalColor ? 0.001 : 0.0012,
        render: {
          fillStyle: COLOR_HEX[color],
          strokeStyle: "#ffffff",
          lineWidth: 2,
        },
      }) as ColorBall;

      ball.color = color;
      ball.exited = false;

      Matter.Body.setVelocity(ball, {
        x: shouldRun ? (Math.random() - 0.5) * 5 : 0,
        y: shouldRun ? 1 : 0,
      });

      return ball;
    });

    ballsRef.current = balls;
    Matter.Composite.add(engine.world, balls);

    Matter.Events.on(render, "afterRender", () => {
      const ctx = render.context;

      ballsRef.current.forEach((ball) => {
        if (!ball.color || ball.exited) return;

        ctx.save();
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.strokeText(COLOR_LABELS[ball.color], ball.position.x, ball.position.y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(COLOR_LABELS[ball.color], ball.position.x, ball.position.y);
        ctx.restore();
      });
    });

    Matter.Events.on(engine, "beforeUpdate", () => {
      bumpersRef.current.forEach((bumper) => {
        Matter.Body.rotate(bumper, bumper.spinSpeed || 0);
      });

      if (!shouldRun) return;

      ballsRef.current.forEach((ball) => {
        if (!ball.color || ball.exited) return;

        const speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);

        if (speed < 0.3 && ball.position.y < WORLD_HEIGHT - 70) {
          Matter.Body.applyForce(ball, ball.position, {
            x: (Math.random() - 0.5) * 0.006,
            y: 0.01,
          });
        }
      });
    });

    Matter.Events.on(engine, "collisionStart", (event) => {
      if (!shouldRun) return;

      event.pairs.forEach((pair) => {
        const bodies = [pair.bodyA, pair.bodyB];
        const exit = bodies.find((body) => body.label === "exit");
        const ball = bodies.find((body: any) => body.label?.startsWith("ball:")) as
          | ColorBall
          | undefined;

        if (!exit || !ball || !ball.color || ball.exited) return;

        const isFinalBall = ball.color === expectedWinnerRef.current;
        const remainingBeforeFinal = exitOrderRef.current.length < ballCount - 1;

        if (isFinalBall && remainingBeforeFinal) {
          Matter.Body.setPosition(ball, {
            x: WORLD_WIDTH / 2 + (Math.random() > 0.5 ? 70 : -70),
            y: WORLD_HEIGHT - 260,
          });

          Matter.Body.setVelocity(ball, {
            x: Math.random() > 0.5 ? 5 : -5,
            y: -7,
          });

          return;
        }

        ball.exited = true;
        exitOrderRef.current.push(ball.color);

        Matter.Composite.remove(engine.world, ball);
        ballsRef.current = ballsRef.current.filter((b) => b !== ball);

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
      if (!runningRef.current) {
        setCameraY(0);
        rafRef.current = requestAnimationFrame(updateCamera);
        return;
      }

      const activeBalls = ballsRef.current;

      if (activeBalls.length > 0) {
        const leaderY = Math.max(...activeBalls.map((ball) => ball.position.y));
        const target = leaderY - VIEW_HEIGHT * 0.42;
        const nextCamera = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, target));
        setCameraY(nextCamera);
      }

      rafRef.current = requestAnimationFrame(updateCamera);
    }

    updateCamera();
  }

  async function playGame() {
    if (!selectedColor) {
      alert("색상을 선택하세요.");
      return;
    }

    if (!betAmount || Number(betAmount) <= 0) {
      alert("배팅 금액을 입력하세요.");
      return;
    }

    await fetchMap();

    setLoading(true);
    setWinnerColor("");
    setShowFireworks(false);
    setMessage("핀볼 진행중...");

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
      alert(data.message || "오류");
      setLoading(false);
      setMessage("색상을 선택하고 도토리를 배팅하세요.");
      return;
    }

    expectedWinnerRef.current = data.winnerColor || data.loserColor;
    setupMatter(data.finishOrder || colors, true, data.winnerColor || data.loserColor);
  }

  function finishGame(color: string) {
    setWinnerColor(color);
    setShowFireworks(true);
    setLoading(false);
    runningRef.current = false;

    setMessage(
      selectedColor === color
        ? `${COLOR_LABELS[color]} WIN! 적중 성공`
        : `${COLOR_LABELS[color]} WIN! 미적중`
    );

    fetchLogs();

    setTimeout(() => {
      setShowFireworks(false);
    }, 2400);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      {showFireworks && (
        <div className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute h-[440px] w-[440px] animate-ping rounded-full bg-yellow-400/30" />
          <div className="absolute h-[280px] w-[280px] animate-ping rounded-full bg-white/20" />
          <div
            className="z-10 text-7xl font-black drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            style={{ color: COLOR_HEX[winnerColor] || "#facc15" }}
          >
            {COLOR_LABELS[winnerColor]} WIN!
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[320px_1fr_340px]">
        <section className="rounded-3xl bg-zinc-950 p-6">
          <h1 className="mb-3 text-3xl font-black text-yellow-400">
            도토리 배팅 핀볼
          </h1>

          <p className="mb-5 rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
            현재 맵: <b className="text-cyan-400">{mapName}</b>
          </p>

          <div className="mb-4 flex gap-2">
            {[3, 5].map((count) => (
              <button
                key={count}
                onClick={() => {
                  setBallCount(count as 3 | 5);
                  setSelectedColor("");
                  setMessage("색상을 선택하고 도토리를 배팅하세요.");
                }}
                disabled={loading}
                className={`flex-1 rounded-xl py-3 font-black ${
                  ballCount === count ? "bg-yellow-400 text-black" : "bg-zinc-800"
                }`}
              >
                {count}공
              </button>
            ))}
          </div>

          <div className="mb-4 text-center text-xl font-black text-yellow-400">
            배율 {multiplier.toFixed(1)}배
          </div>

          <div className="mb-4 grid gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                disabled={loading}
                className={`rounded-xl py-3 font-black ${
                  selectedColor === color ? "ring-4 ring-white" : ""
                }`}
                style={{
                  backgroundColor: COLOR_HEX[color],
                  color: "#000",
                }}
              >
                {COLOR_LABELS[color]}
              </button>
            ))}
          </div>

          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            disabled={loading}
            className="mb-4 w-full rounded-xl bg-zinc-900 px-4 py-4 outline-none"
            placeholder="배팅 금액"
          />

          <button
            onClick={playGame}
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 py-4 text-xl font-black disabled:opacity-50"
          >
            {loading ? "진행중..." : "배팅하기"}
          </button>

          <div className="mt-6 text-center text-xl font-black text-yellow-400">
            {message}
          </div>
        </section>

        <section className="rounded-3xl bg-zinc-950 p-5">
          <div className="relative h-[1000px] overflow-hidden rounded-3xl border border-cyan-400/40 bg-black shadow-[0_0_35px_rgba(34,211,238,0.25)]">
            <div
              className="absolute left-1/2 top-0"
              style={{
                width: WORLD_WIDTH,
                height: WORLD_HEIGHT,
                transform: `translateX(-50%) translateY(-${cameraY}px)`,
                transformOrigin: "top center",
                transition: loading ? "transform 0.18s linear" : "none",
              }}
            >
              <div ref={sceneRef} />
            </div>
          </div>
        </section>

        <aside className="rounded-3xl bg-zinc-950 p-6">
          <h2 className="mb-5 text-2xl font-black text-cyan-400">최근 기록</h2>

          <div className="flex max-h-[960px] flex-col gap-3 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400">
                아직 기록이 없습니다.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-xl bg-zinc-900 p-4">
                  <div>{log.ball_count}공</div>
                  <div>선택: {COLOR_LABELS[log.selected_color]}</div>
                  <div>WIN: {COLOR_LABELS[log.loser_color]}</div>
                  <div>배팅: {Number(log.bet_amount).toLocaleString()}</div>
                  <div>
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