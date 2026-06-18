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
  | {
      type: "wall";
      x: number;
      y: number;
      w: number;
      h: number;
      angle: number;
    }
  | {
      type: "pin";
      x: number;
      y: number;
      r: number;
    }
  | {
      type: "bumper";
      x: number;
      y: number;
      w: number;
      h: number;
      angle: number;
      spinSpeed: number;
    };

type RotatingBumper = Matter.Body & {
  spinSpeed?: number;
};

type ColorBall = Matter.Body & {
  color?: string;
  exited?: boolean;
};

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
    const res = await fetch("/api/game/pinball/logs", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setLogs(data.logs || []);
    }
  }

  async function fetchMap() {
    const url = mapId
      ? `/api/game/pinball/map?mapId=${mapId}`
      : "/api/game/pinball/map";

    const res = await fetch(url, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success && data.map) {
      mapDataRef.current = data.map.mapData || [];
      setMapName(data.map.mapName || "저장맵");
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
  }, [mapId]);

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

  function setupMatter(
    finishOrder: string[],
    shouldRun: boolean,
    finalColor: string
  ) {
    if (!sceneRef.current) return;

    cleanupMatter();
    runningRef.current = shouldRun;

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

    const walls: Matter.Body[] = [];
    const pins: Matter.Body[] = [];
    const bumpers: RotatingBumper[] = [];

    mapDataRef.current.forEach((obj) => {
      if (obj.type === "wall") {
        walls.push(
          Matter.Bodies.rectangle(obj.x, obj.y, obj.w, obj.h, {
            isStatic: true,
            angle: obj.angle,
            render: {
              fillStyle: "#ecfeff",
            },
          })
        );
      }

      if (obj.type === "pin") {
        pins.push(
          Matter.Bodies.circle(obj.x, obj.y, obj.r, {
            isStatic: true,
            render: {
              fillStyle: "#ffffff",
            },
          })
        );
      }

      if (obj.type === "bumper") {
        const bumper = Matter.Bodies.rectangle(
          obj.x,
          obj.y,
          obj.w,
          obj.h,
          {
            isStatic: true,
            angle: obj.angle,
            render: {
              fillStyle: "#facc15",
            },
          }
        ) as RotatingBumper;

        bumper.spinSpeed = obj.spinSpeed;
        bumpers.push(bumper);
      }
    });

    Matter.Composite.add(engine.world, [...walls, ...pins, ...bumpers]);

    const exitSensor = Matter.Bodies.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT - 30,
      60,
      60,
      {
        isStatic: true,
        isSensor: true,
        label: "exit",
      }
    );

    Matter.Composite.add(engine.world, exitSensor);

    const startColors = finishOrder.length > 0 ? finishOrder : colors;

    const balls = startColors.map((color, index) => {
      const gap = startColors.length === 3 ? 60 : 42;
      const startX =
        WORLD_WIDTH / 2 -
        ((startColors.length - 1) * gap) / 2 +
        index * gap;

      const ball = Matter.Bodies.circle(startX, 60, 15, {
        label: `ball:${color}`,
        restitution: 0.64,
        frictionAir: color === finalColor ? 0.006 : 0.002,
        density: color === finalColor ? 0.001 : 0.0012,
        render: {
          fillStyle: COLOR_HEX[color],
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

    Matter.Events.on(engine, "beforeUpdate", () => {
      bumpersRef.current.forEach((bumper) => {
        Matter.Body.rotate(bumper, bumper.spinSpeed || 0);
      });
    });

    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const bodies = [pair.bodyA, pair.bodyB];
        const exit = bodies.find((body) => body.label === "exit");
        const ball = bodies.find((body: any) =>
          body.label?.startsWith("ball:")
        ) as ColorBall;

        if (!exit || !ball || !ball.color || ball.exited) return;

        const isFinalBall = ball.color === expectedWinnerRef.current;
        const remainingBeforeFinal = exitOrderRef.current.length < ballCount - 1;

        if (isFinalBall && remainingBeforeFinal) {
          Matter.Body.setPosition(ball, {
            x: WORLD_WIDTH / 2,
            y: WORLD_HEIGHT - 250,
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
        const leaderY = Math.max(
          ...activeBalls.map((ball) => ball.position.y)
        );

        const target = leaderY - VIEW_HEIGHT * 0.42;
        const nextCamera = Math.max(
          0,
          Math.min(WORLD_HEIGHT - VIEW_HEIGHT, target)
        );

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

    setLoading(true);

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
      return;
    }

    expectedWinnerRef.current = data.winnerColor;
    setupMatter(data.finishOrder, true, data.winnerColor);
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
                onClick={() => setBallCount(count as 3 | 5)}
                className={`flex-1 rounded-xl py-3 font-black ${
                  ballCount === count
                    ? "bg-yellow-400 text-black"
                    : "bg-zinc-800"
                }`}
              >
                {count}공
              </button>
            ))}
          </div>

          <div className="mb-4 text-center text-xl font-black text-yellow-400">
            배율 {multiplier}배
          </div>

          <div className="mb-4 grid gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
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
            className="mb-4 w-full rounded-xl bg-zinc-900 px-4 py-4"
            placeholder="배팅 금액"
          />

          <button
            onClick={playGame}
            disabled={loading}
            className="w-full rounded-xl bg-purple-600 py-4 text-xl font-black"
          >
            {loading ? "진행중..." : "배팅하기"}
          </button>

          <div className="mt-6 text-center text-xl font-black text-yellow-400">
            {message}
          </div>
        </section>

        <section className="rounded-3xl bg-zinc-950 p-5">
          <div className="relative h-[1000px] overflow-hidden rounded-3xl bg-black">
            <div
              className="absolute left-1/2 top-0"
              style={{
                width: WORLD_WIDTH,
                height: WORLD_HEIGHT,
                transform: `translateX(-50%) translateY(-${cameraY}px)`,
              }}
            >
              <div ref={sceneRef} />
            </div>
          </div>
        </section>

        <aside className="rounded-3xl bg-zinc-950 p-6">
          <h2 className="mb-5 text-2xl font-black text-cyan-400">
            최근 기록
          </h2>

          <div className="flex flex-col gap-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl bg-zinc-900 p-4">
                <div>{log.ball_count}공</div>
                <div>선택: {COLOR_LABELS[log.selected_color]}</div>
                <div>WIN: {COLOR_LABELS[log.loser_color]}</div>
                <div>배팅: {log.bet_amount.toLocaleString()}</div>
                <div>
                  {log.is_win
                    ? `적중 +${log.payout_amount.toLocaleString()}`
                    : "미적중"}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}