"use client";

import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";

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

type NameBall = Matter.Body & {
  nickname?: string;
  color?: string;
  exited?: boolean;
};

const WORLD_WIDTH = 560;
const BASE_WORLD_HEIGHT = 1900;
const START_ZONE_HEIGHT = 420;
const WORLD_HEIGHT = BASE_WORLD_HEIGHT + START_ZONE_HEIGHT;
const VIEW_HEIGHT = 1000;

const BALL_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#facc15",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#8b5cf6",
];

const DEFAULT_NAMES = "두식\n민주\n왕츄\n워종\n아지\n새롭";

const DEFAULT_MAP: MapObject[] = [
  { type: "pin", x: 130, y: 260, r: 6 },
  { type: "pin", x: 260, y: 260, r: 6 },
  { type: "pin", x: 390, y: 260, r: 6 },
  { type: "pin", x: 190, y: 430, r: 6 },
  { type: "pin", x: 330, y: 430, r: 6 },
  { type: "pin", x: 130, y: 600, r: 6 },
  { type: "pin", x: 260, y: 600, r: 6 },
  { type: "pin", x: 390, y: 600, r: 6 },
  { type: "wall", x: 92, y: 280, w: 120, h: 12, angle: 0.52 },
  { type: "wall", x: 468, y: 335, w: 120, h: 12, angle: -0.52 },
  { type: "bumper", x: 280, y: 175, w: 250, h: 16, angle: -0.08, spinSpeed: 0.045 },
  { type: "bumper", x: 330, y: 565, w: 210, h: 16, angle: 0.22, spinSpeed: -0.04 },
  { type: "wall", x: 125, y: 1610, w: 500, h: 18, angle: 1.02 },
  { type: "wall", x: 435, y: 1610, w: 500, h: 18, angle: -1.02 },
  { type: "wall", x: 252, y: 1805, w: 165, h: 18, angle: 1.57 },
  { type: "wall", x: 308, y: 1805, w: 165, h: 18, angle: 1.57 },
  { type: "bumper", x: 432, y: 1760, w: 300, h: 18, angle: -1.23, spinSpeed: 0.05 },
];

export default function PinballDrawPage() {
  const [namesText, setNamesText] = useState(DEFAULT_NAMES);
  const [message, setMessage] = useState("참여 닉네임을 입력하고 섞기를 눌러주세요.");
  const [winnerName, setWinnerName] = useState("");
  const [running, setRunning] = useState(false);
  const [cameraY, setCameraY] = useState(0);
  const [mapName, setMapName] = useState("기본맵");
  const [startSeed, setStartSeed] = useState<number[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [showFireworks, setShowFireworks] = useState(false);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const ballsRef = useRef<NameBall[]>([]);
  const bumpersRef = useRef<RotatingBumper[]>([]);
  const exitOrderRef = useRef<string[]>([]);
  const rafRef = useRef<number | null>(null);
  const mapDataRef = useRef<MapObject[]>(DEFAULT_MAP);
  const runningRef = useRef(false);

  function getNames() {
    return namesText
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter(Boolean);
  }

  async function fetchMap() {
    try {
      const res = await fetch("/api/game/pinball/map", { cache: "no-store" });
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
      setupMatter([], [], false);
    }

    init();

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
      Matter.Bodies.rectangle(x, y + START_ZONE_HEIGHT, w, h, {
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
      Matter.Bodies.circle(x, y + START_ZONE_HEIGHT, r, {
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
    const bumper = Matter.Bodies.rectangle(x, y + START_ZONE_HEIGHT, w, h, {
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

  function setupMatter(names: string[], seed: number[], shouldRun: boolean) {
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
        render: wallStyle,
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

    const exitSensor = Matter.Bodies.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT - 24,
      60,
      80,
      {
        isStatic: true,
        isSensor: true,
        label: "exit",
        render: { fillStyle: "rgba(34,211,238,0.08)" },
      }
    );

    Matter.Composite.add(engine.world, exitSensor);

    const sortedNames = [...names]
      .map((nickname, index) => ({
        nickname,
        seed: seed[index] ?? Math.random(),
        index,
      }))
      .sort((a, b) => a.seed - b.seed);

    const balls = sortedNames.map((item, orderIndex) => {
      const perRow = 5;
      const col = orderIndex % perRow;
      const row = Math.floor(orderIndex / perRow);

      const gapX = 42;
      const gapY = 42;

      const rightEdgeX = WORLD_WIDTH - 50;
      const startX = rightEdgeX - col * gapX;
      const startY = 22 + row * gapY;

      const color = BALL_COLORS[item.index % BALL_COLORS.length];

      const ball = Matter.Bodies.circle(startX, startY, 15, {
        label: `ball:${item.nickname}`,
        restitution: 0.64,
        friction: 0.001,
        frictionAir: 0.002,
        density: 0.0012,
        render: {
          fillStyle: color,
          strokeStyle: "#ffffff",
          lineWidth: 2,
        },
      }) as NameBall;

      ball.nickname = item.nickname;
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
        if (!ball.nickname || ball.exited) return;

        ctx.save();
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.strokeText(ball.nickname, ball.position.x, ball.position.y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(ball.nickname, ball.position.x, ball.position.y);
        ctx.restore();
      });
    });

    Matter.Events.on(engine, "beforeUpdate", () => {
      bumpersRef.current.forEach((bumper) => {
        Matter.Body.rotate(bumper, bumper.spinSpeed || 0);
      });

      if (!shouldRun) return;

      ballsRef.current.forEach((ball) => {
        if (!ball.nickname || ball.exited) return;

        const speed = Math.sqrt(
          ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y
        );

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
          | NameBall
          | undefined;

        if (!exit || !ball || !ball.nickname || ball.exited) return;

        ball.exited = true;
        exitOrderRef.current.push(ball.nickname);

        Matter.Composite.remove(engine.world, ball);
        ballsRef.current = ballsRef.current.filter((b) => b !== ball);

        if (exitOrderRef.current.length >= names.length) {
          finishGame(ball.nickname);
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

  async function shuffleStart() {
    const names = getNames();

    if (names.length < 2) {
      alert("닉네임을 2명 이상 입력하세요.");
      return;
    }

    await fetchMap();

    const seed = names.map(() => Math.random());
    setStartSeed(seed);
    setWinnerName("");
    setShowFireworks(false);
    setRunning(false);
    runningRef.current = false;
    setCameraY(0);
    setMessage("시작 위치가 섞였습니다. 시작하기를 누르세요.");
    setupMatter(names, seed, false);
  }

  async function startGame() {
    const names = getNames();

    if (names.length < 2) {
      alert("닉네임을 2명 이상 입력하세요.");
      return;
    }

    await fetchMap();

    const seed = startSeed.length === names.length ? startSeed : names.map(() => Math.random());

    setRunning(true);
    runningRef.current = true;
    setWinnerName("");
    setShowFireworks(false);
    setCameraY(0);
    setMessage("추첨 진행중...");
    setupMatter(names, seed, true);
  }

  async function resetPreview() {
    await fetchMap();

    setRunning(false);
    runningRef.current = false;
    setWinnerName("");
    setShowFireworks(false);
    setCameraY(0);
    setMessage("맵 미리보기 상태입니다.");
    setupMatter([], [], false);
  }

  function finishGame(name: string) {
    setWinnerName(name);
    setMessage(`${name} WIN!`);
    setShowFireworks(true);
    setRunning(false);
    runningRef.current = false;
    setHistory((prev) => [name, ...prev].slice(0, 20));

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
          <div className="z-10 text-7xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
            {winnerName} WIN!
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[320px_1fr_340px]">
        <section className="rounded-3xl bg-zinc-950 p-6">
          <h1 className="mb-3 text-3xl font-black text-yellow-400">
            핀볼 추첨
          </h1>

          <p className="mb-5 rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
            현재 맵: <b className="text-cyan-400">{mapName}</b>
          </p>

          <textarea
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            disabled={running}
            className="mb-4 h-52 w-full resize-none rounded-2xl bg-zinc-900 px-4 py-4 text-white outline-none"
            placeholder={"참여 닉네임 입력\n두식\n민주\n왕츄"}
          />

          <button
            onClick={shuffleStart}
            disabled={running}
            className="mb-3 w-full rounded-2xl bg-cyan-400 py-4 text-xl font-black text-black disabled:opacity-50"
          >
            섞기
          </button>

          <button
            onClick={startGame}
            disabled={running}
            className="mb-3 w-full rounded-2xl bg-purple-600 py-4 text-xl font-black disabled:opacity-50"
          >
            {running ? "진행중..." : "시작하기"}
          </button>

          <button
            onClick={resetPreview}
            disabled={running}
            className="w-full rounded-2xl bg-zinc-800 py-4 font-black disabled:opacity-50"
          >
            맵 미리보기
          </button>

          {message && (
            <div className="mt-6 text-center text-2xl font-black text-yellow-400">
              {message}
            </div>
          )}
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
                transition: running ? "transform 0.18s linear" : "none",
              }}
            >
              <div ref={sceneRef} />
            </div>
          </div>
        </section>

        <aside className="rounded-3xl bg-zinc-950 p-6">
          <h2 className="mb-5 text-2xl font-black text-cyan-400">추첨 기록</h2>

          <div className="mb-6 rounded-2xl bg-zinc-900 p-4">
            <div className="text-sm text-zinc-400">참여 인원</div>
            <div className="text-3xl font-black text-yellow-400">
              {getNames().length}명
            </div>
          </div>

          <div className="flex max-h-[760px] flex-col gap-3 overflow-y-auto">
            {history.length === 0 ? (
              <p className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400">
                아직 추첨 기록이 없습니다.
              </p>
            ) : (
              history.map((name, index) => (
                <div key={`${name}-${index}`} className="rounded-2xl bg-zinc-900 p-4">
                  <div className="text-sm text-zinc-400">WIN</div>
                  <div className="text-xl font-black text-yellow-400">{name}</div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}