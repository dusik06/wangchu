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
const START_ZONE_HEIGHT = 420;
const WORLD_HEIGHT = 2320;
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

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const ballsRef = useRef<NameBall[]>([]);
  const bumpersRef = useRef<RotatingBumper[]>([]);
  const rafRef = useRef<number | null>(null);
  const mapDataRef = useRef<MapObject[]>(DEFAULT_MAP);

  function getNames() {
    return namesText
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter(Boolean);
  }

  useEffect(() => {
    setupMatter([], false);
    return () => cleanupMatter();
  }, []);

  function cleanupMatter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
    }

    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
    }

    if (engineRef.current) {
      Matter.World.clear(engineRef.current.world, false);
      Matter.Engine.clear(engineRef.current);
    }

    ballsRef.current = [];
    bumpersRef.current = [];
    setCameraY(0);
  }

  function setupMatter(names: string[], shouldRun: boolean) {
    if (!sceneRef.current) return;

    cleanupMatter();

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
      const shiftedY = obj.y + START_ZONE_HEIGHT;

      if (obj.type === "wall") {
        walls.push(
          Matter.Bodies.rectangle(obj.x, shiftedY, obj.w, obj.h, {
            isStatic: true,
            angle: obj.angle,
            render: {
              fillStyle: "#ecfeff",
              strokeStyle: "#22d3ee",
              lineWidth: 3,
            },
          })
        );
      }

      if (obj.type === "pin") {
        pins.push(
          Matter.Bodies.circle(obj.x, shiftedY, obj.r, {
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
          shiftedY,
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

    bumpersRef.current = bumpers;

    Matter.Composite.add(engine.world, [...walls, ...pins, ...bumpers]);

    const namesList = [...names];

    const balls = namesList.map((nickname, index) => {
      const perRow = 5;
      const col = index % perRow;
      const row = Math.floor(index / perRow);

      const gapX = 42;
      const gapY = 42;

      const rightEdgeX = WORLD_WIDTH - 50;
      const startX = rightEdgeX - col * gapX;
      const startY = 70 + row * gapY;

      const color = BALL_COLORS[index % BALL_COLORS.length];

      const ball = Matter.Bodies.circle(startX, startY, 15, {
        label: `ball:${nickname}`,
        restitution: 0.64,
        frictionAir: 0.002,
        render: {
          fillStyle: color,
          strokeStyle: "#ffffff",
          lineWidth: 2,
        },
      }) as NameBall;

      ball.nickname = nickname;
      ball.color = color;
      ball.exited = false;

      if (shouldRun) {
        Matter.Body.setVelocity(ball, {
          x: (Math.random() - 0.5) * 5,
          y: 1,
        });
      }

      return ball;
    });

    ballsRef.current = balls;
    Matter.Composite.add(engine.world, balls);

    Matter.Events.on(engine, "beforeUpdate", () => {
      bumpersRef.current.forEach((bumper) => {
        Matter.Body.rotate(bumper, bumper.spinSpeed || 0);
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

  function shuffleStart() {
    const names = getNames();

    if (names.length < 2) {
      alert("닉네임 2명 이상 입력");
      return;
    }

    setMessage("섞기 완료");
    setupMatter(names, false);
  }

  function startGame() {
    const names = getNames();

    if (names.length < 2) {
      alert("닉네임 2명 이상 입력");
      return;
    }

    setRunning(true);
    setMessage("추첨 진행중...");
    setupMatter(names, true);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[320px_1fr]">
        <section className="rounded-3xl bg-zinc-950 p-6">
          <textarea
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            className="mb-4 h-52 w-full rounded-2xl bg-zinc-900 px-4 py-4"
          />

          <button
            onClick={shuffleStart}
            className="mb-3 w-full rounded-2xl bg-cyan-400 py-4 font-black text-black"
          >
            섞기
          </button>

          <button
            onClick={startGame}
            className="w-full rounded-2xl bg-purple-600 py-4 font-black"
          >
            시작하기
          </button>

          <div className="mt-6 text-center text-2xl font-black text-yellow-400">
            {message}
          </div>
        </section>

        <section className="rounded-3xl bg-zinc-950 p-5">
          <div className="relative h-[1000px] overflow-hidden rounded-3xl border border-cyan-400/40 bg-black">
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
      </div>
    </main>
  );
}