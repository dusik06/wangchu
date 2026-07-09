"use client";

type ResultType = "win" | "lose" | null;
type RollStage = "idle" | "shake" | "throw" | "settle";

type Props = {
  dice: number | null;
  rolling: boolean;
  rollStage: RollStage;
  showResult: boolean;
  resultType: ResultType;
};

function finalTransform(dice: number | null) {
  if (dice === 1) return "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
  if (dice === 2) return "rotateX(0deg) rotateY(180deg) rotateZ(0deg)";
  if (dice === 3) return "rotateX(0deg) rotateY(-90deg) rotateZ(0deg)";
  if (dice === 4) return "rotateX(0deg) rotateY(90deg) rotateZ(0deg)";
  if (dice === 5) return "rotateX(-90deg) rotateY(0deg) rotateZ(0deg)";
  if (dice === 6) return "rotateX(90deg) rotateY(0deg) rotateZ(0deg)";
  return "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
}

export default function DiceRoller3D({
  dice,
  rolling,
  rollStage,
  showResult,
  resultType,
}: Props) {
  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top,#2b1b05,#09090f_62%,#030306)] [perspective:1200px]">
      <div className="absolute inset-x-10 bottom-12 h-28 rounded-[100%] bg-black/55 blur-2xl" />
      <div className="absolute inset-x-12 bottom-[86px] h-[2px] bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent" />

      <div
        className={[
          "absolute left-1/2 top-8 h-28 w-36 -translate-x-1/2 rounded-b-[42px] rounded-t-[22px] border border-yellow-200/30 bg-gradient-to-b from-yellow-200/25 to-yellow-900/20 shadow-[0_0_45px_rgba(250,204,21,.18)]",
          rollStage === "shake" ? "animate-[cupShake_.9s_ease-in-out_forwards]" : "opacity-0",
        ].join(" ")}
      >
        <div className="absolute left-4 right-4 top-3 h-3 rounded-full bg-white/25 blur-sm" />
      </div>

      <div
        className={[
          "absolute bottom-[92px] left-1/2 h-28 w-28 -translate-x-1/2",
          rollStage === "shake" ? "opacity-0" : "opacity-100",
        ].join(" ")}
        style={{
          transformStyle: "preserve-3d",
          animation:
            rollStage === "throw"
              ? "diceThrow 1.65s cubic-bezier(.12,.88,.18,1) forwards"
              : undefined,
          transform:
            rollStage === "settle" || rollStage === "idle"
              ? finalTransform(dice)
              : undefined,
          transition:
            rollStage === "settle"
              ? "transform 820ms cubic-bezier(.12,1,.2,1)"
              : undefined,
        }}
      >
        <DiceFace value={1} transform="translateZ(56px)" />
        <DiceFace value={2} transform="rotateY(180deg) translateZ(56px)" />
        <DiceFace value={3} transform="rotateY(90deg) translateZ(56px)" />
        <DiceFace value={4} transform="rotateY(-90deg) translateZ(56px)" />
        <DiceFace value={5} transform="rotateX(90deg) translateZ(56px)" />
        <DiceFace value={6} transform="rotateX(-90deg) translateZ(56px)" />
      </div>

      <div
        className={[
          "absolute bottom-[74px] left-1/2 h-8 w-28 -translate-x-1/2 rounded-full bg-black/70 blur-md",
          rollStage === "throw" ? "animate-[shadowThrow_1.65s_cubic-bezier(.12,.88,.18,1)_forwards]" : "",
        ].join(" ")}
      />

      {showResult && dice && (
        <div
          className={[
            "absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-black shadow-lg",
            resultType === "win"
              ? "bg-emerald-400 text-black"
              : resultType === "lose"
              ? "bg-red-500 text-white"
              : "bg-white text-black",
          ].join(" ")}
        >
          결과 {dice} · {dice % 2 === 0 ? "짝" : "홀"}
        </div>
      )}

      <style jsx>{`
        @keyframes cupShake {
          0% { transform: translateX(-50%) rotate(0deg); }
          14% { transform: translateX(calc(-50% - 24px)) rotate(-13deg); }
          28% { transform: translateX(calc(-50% + 24px)) rotate(14deg); }
          42% { transform: translateX(calc(-50% - 18px)) rotate(-10deg); }
          58% { transform: translateX(calc(-50% + 18px)) rotate(10deg); }
          74% { transform: translateX(calc(-50% - 8px)) rotate(-5deg); }
          100% { transform: translateX(-50%) rotate(0deg); opacity: 0; }
        }

        @keyframes diceThrow {
          0% {
            transform: translate3d(-250px,-125px,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          12% {
            transform: translate3d(-190px,-42px,0) rotateX(170deg) rotateY(115deg) rotateZ(36deg);
          }
          24% {
            transform: translate3d(-130px,-6px,0) rotateX(355deg) rotateY(245deg) rotateZ(82deg);
          }
          38% {
            transform: translate3d(-66px,-34px,0) rotateX(560deg) rotateY(390deg) rotateZ(138deg);
          }
          53% {
            transform: translate3d(-4px,-3px,0) rotateX(780deg) rotateY(545deg) rotateZ(196deg);
          }
          67% {
            transform: translate3d(58px,-22px,0) rotateX(965deg) rotateY(690deg) rotateZ(248deg);
          }
          79% {
            transform: translate3d(92px,-4px,0) rotateX(1115deg) rotateY(808deg) rotateZ(292deg);
          }
          89% {
            transform: translate3d(48px,-10px,0) rotateX(1230deg) rotateY(900deg) rotateZ(326deg);
          }
          96% {
            transform: translate3d(12px,-2px,0) rotateX(1300deg) rotateY(958deg) rotateZ(350deg);
          }
          100% {
            transform: translate3d(0,0,0) rotateX(1340deg) rotateY(990deg) rotateZ(360deg);
          }
        }

        @keyframes shadowThrow {
          0% { transform: translateX(-250px) scaleX(.45); opacity: .08; }
          12% { transform: translateX(-190px) scaleX(.8); opacity: .25; }
          24% { transform: translateX(-130px) scaleX(1.22); opacity: .66; }
          38% { transform: translateX(-66px) scaleX(.7); opacity: .32; }
          53% { transform: translateX(-4px) scaleX(1.25); opacity: .72; }
          67% { transform: translateX(58px) scaleX(.78); opacity: .36; }
          79% { transform: translateX(92px) scaleX(1.05); opacity: .56; }
          89% { transform: translateX(48px) scaleX(.9); opacity: .48; }
          100% { transform: translateX(0) scaleX(1); opacity: .62; }
        }
      `}</style>
    </div>
  );
}

function DiceFace({ value, transform }: { value: number; transform: string }) {
  const dots: Record<number, number[]> = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  return (
    <div
      className="absolute left-0 top-0 grid h-28 w-28 grid-cols-3 grid-rows-3 rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[inset_-10px_-10px_22px_rgba(0,0,0,.18),inset_8px_8px_18px_rgba(255,255,255,.9),0_18px_34px_rgba(0,0,0,.42)]"
      style={{ transform, backfaceVisibility: "hidden" }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const active = dots[value].includes(i + 1);

        return (
          <div key={i} className="flex items-center justify-center">
            {active && (
              <span className="h-4 w-4 rounded-full bg-zinc-950 shadow-[inset_2px_2px_4px_rgba(255,255,255,.16)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}