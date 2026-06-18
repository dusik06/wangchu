"use client";

import { useState } from "react";

type Wall = {
  type: "wall";
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
};

type Pin = {
  type: "pin";
  x: number;
  y: number;
  r: number;
};

type Bumper = {
  type: "bumper";
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  spinSpeed: number;
};

type MapObject = Wall | Pin | Bumper;

const WORLD_WIDTH = 560;
const WORLD_HEIGHT = 1900;
const GRID = 10;

export default function AdminPinballMapPage() {
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [mode, setMode] = useState<"wall" | "pin" | "bumper">("wall");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mapName, setMapName] = useState("핀볼 고정맵");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  function snap(value: number) {
    return Math.round(value / GRID) * GRID;
  }

  function addObject(x: number, y: number) {
    if (mode === "wall") {
      setObjects((prev) => [
        ...prev,
        { type: "wall", x, y, w: 150, h: 14, angle: 0 },
      ]);
      setSelectedIndex(objects.length);
      return;
    }

    if (mode === "pin") {
      setObjects((prev) => [...prev, { type: "pin", x, y, r: 7 }]);
      setSelectedIndex(objects.length);
      return;
    }

    setObjects((prev) => [
      ...prev,
      { type: "bumper", x, y, w: 220, h: 18, angle: 0, spinSpeed: 0.03 },
    ]);
    setSelectedIndex(objects.length);
  }

  function updateSelected(key: string, value: number) {
    if (selectedIndex === null) return;

    setObjects((prev) =>
      prev.map((obj, index) =>
        index === selectedIndex ? ({ ...obj, [key]: value } as MapObject) : obj
      )
    );
  }

  function moveObject(index: number, x: number, y: number) {
    setObjects((prev) =>
      prev.map((obj, i) => (i === index ? ({ ...obj, x, y } as MapObject) : obj))
    );
  }

  function deleteSelected() {
    if (selectedIndex === null) return;
    setObjects((prev) => prev.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(null);
  }

  async function saveMap() {
    if (objects.length === 0) {
      alert("배치된 오브젝트가 없습니다.");
      return;
    }

    const res = await fetch("/api/admin/pinball-map/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapName, mapData: objects }),
    });

    const data = await res.json();

    if (data.success) {
      alert("저장 완료. 이제 이 맵이 고정맵입니다.");
    } else {
      alert(data.message || "저장 실패");
    }
  }

  const selected = selectedIndex !== null ? objects[selectedIndex] : null;

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto grid max-w-[1400px] gap-6 xl:grid-cols-[300px_1fr_320px]">
        <section className="rounded-3xl bg-zinc-950 p-5">
          <h1 className="mb-5 text-2xl font-black text-yellow-400">
            핀볼 맵 에디터
          </h1>

          <input
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            className="mb-4 w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none"
            placeholder="맵 이름"
          />

          <div className="mb-5 grid gap-3">
            <button
              onClick={() => setMode("wall")}
              className={`rounded-xl px-4 py-3 font-black ${
                mode === "wall" ? "bg-cyan-400 text-black" : "bg-zinc-800"
              }`}
            >
              고정벽 추가
            </button>

            <button
              onClick={() => setMode("pin")}
              className={`rounded-xl px-4 py-3 font-black ${
                mode === "pin" ? "bg-white text-black" : "bg-zinc-800"
              }`}
            >
              핀 추가
            </button>

            <button
              onClick={() => setMode("bumper")}
              className={`rounded-xl px-4 py-3 font-black ${
                mode === "bumper" ? "bg-yellow-400 text-black" : "bg-zinc-800"
              }`}
            >
              노란 회전벽 추가
            </button>
          </div>

          <div className="grid gap-3">
            <button
              onClick={saveMap}
              className="rounded-xl bg-emerald-500 px-4 py-3 font-black text-black"
            >
              이 맵 저장하기
            </button>

            <button
              onClick={deleteSelected}
              className="rounded-xl bg-red-500 px-4 py-3 font-black"
            >
              선택 삭제
            </button>

            <button
              onClick={() => {
                if (confirm("전체 초기화할까요?")) {
                  setObjects([]);
                  setSelectedIndex(null);
                }
              }}
              className="rounded-xl bg-zinc-800 px-4 py-3 font-black"
            >
              전체 초기화
            </button>
          </div>

          <p className="mt-5 text-sm leading-6 text-zinc-400">
            맵판 클릭: 추가
            <br />
            물체 드래그: 이동
            <br />
            오른쪽 설정: 회전/길이/속도 조절
            <br />
            노란 회전벽 속도는 양수 = 시계방향, 음수 = 반시계방향
          </p>
        </section>

        <section className="overflow-auto rounded-3xl bg-zinc-950 p-5">
          <div
            className="relative mx-auto bg-black"
            style={{
              width: WORLD_WIDTH,
              height: WORLD_HEIGHT,
              border: "2px solid rgba(34,211,238,0.7)",
              boxShadow: "0 0 30px rgba(34,211,238,0.25)",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
            onMouseMove={(e) => {
              if (draggingIndex === null) return;

              const rect = e.currentTarget.getBoundingClientRect();
              const x = snap(e.clientX - rect.left);
              const y = snap(e.clientY - rect.top);

              moveObject(draggingIndex, x, y);
            }}
            onMouseUp={() => setDraggingIndex(null)}
            onMouseLeave={() => setDraggingIndex(null)}
            onClick={(e) => {
              if (draggingIndex !== null) return;

              const rect = e.currentTarget.getBoundingClientRect();
              const x = snap(e.clientX - rect.left);
              const y = snap(e.clientY - rect.top);

              addObject(x, y);
            }}
          >
            <div className="absolute left-[-18px] top-0 h-full w-[36px] bg-cyan-100" />
            <div className="absolute right-[-18px] top-0 h-full w-[36px] bg-cyan-100" />

            {objects.map((obj, index) => {
              const selectedClass =
                selectedIndex === index ? "outline outline-4 outline-red-500" : "";

              if (obj.type === "pin") {
                return (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(index);
                      setDraggingIndex(index);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute rounded-full bg-white ${selectedClass}`}
                    style={{
                      left: obj.x,
                      top: obj.y,
                      width: obj.r * 2,
                      height: obj.r * 2,
                      transform: "translate(-50%, -50%)",
                      cursor: "move",
                    }}
                  />
                );
              }

              if (obj.type === "bumper") {
                return (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(index);
                      setDraggingIndex(index);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute bg-yellow-400 ${selectedClass}`}
                    style={{
                      left: obj.x,
                      top: obj.y,
                      width: obj.w,
                      height: obj.h,
                      transform: `translate(-50%, -50%) rotate(${obj.angle}rad)`,
                      transformOrigin: "center",
                      borderRadius: 999,
                      cursor: "move",
                    }}
                  />
                );
              }

              return (
                <button
                  key={index}
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(index);
                    setDraggingIndex(index);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute bg-cyan-100 ${selectedClass}`}
                  style={{
                    left: obj.x,
                    top: obj.y,
                    width: obj.w,
                    height: obj.h,
                    transform: `translate(-50%, -50%) rotate(${obj.angle}rad)`,
                    transformOrigin: "center",
                    borderRadius: 999,
                    cursor: "move",
                  }}
                />
              );
            })}
          </div>
        </section>

        <aside className="rounded-3xl bg-zinc-950 p-5">
          <h2 className="mb-4 text-xl font-black text-cyan-400">선택 설정</h2>

          {!selected ? (
            <p className="text-sm text-zinc-400">선택된 오브젝트가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-900 p-3 text-sm">
                타입: <b>{selected.type}</b>
              </div>

              <label className="block text-sm text-zinc-400">
                X
                <input
                  type="number"
                  value={selected.x}
                  onChange={(e) => updateSelected("x", Number(e.target.value))}
                  className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2 text-white outline-none"
                />
              </label>

              <label className="block text-sm text-zinc-400">
                Y
                <input
                  type="number"
                  value={selected.y}
                  onChange={(e) => updateSelected("y", Number(e.target.value))}
                  className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2 text-white outline-none"
                />
              </label>

              {selected.type !== "pin" && (
                <>
                  <label className="block text-sm text-zinc-400">
                    길이
                    <input
                      type="number"
                      value={selected.w}
                      onChange={(e) => updateSelected("w", Number(e.target.value))}
                      className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2 text-white outline-none"
                    />
                  </label>

                  <label className="block text-sm text-zinc-400">
                    두께
                    <input
                      type="number"
                      value={selected.h}
                      onChange={(e) => updateSelected("h", Number(e.target.value))}
                      className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2 text-white outline-none"
                    />
                  </label>

                  <label className="block text-sm text-zinc-400">
                    회전 각도(rad)
                    <input
                      type="number"
                      step="0.01"
                      value={selected.angle}
                      onChange={(e) =>
                        updateSelected("angle", Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2 text-white outline-none"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateSelected("angle", selected.angle - 0.1)}
                      className="rounded-xl bg-zinc-800 py-2 font-black"
                    >
                      왼쪽 회전
                    </button>
                    <button
                      onClick={() => updateSelected("angle", selected.angle + 0.1)}
                      className="rounded-xl bg-zinc-800 py-2 font-black"
                    >
                      오른쪽 회전
                    </button>
                  </div>
                </>
              )}

              {selected.type === "pin" && (
                <label className="block text-sm text-zinc-400">
                  핀 크기
                  <input
                    type="number"
                    value={selected.r}
                    onChange={(e) => updateSelected("r", Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2 text-white outline-none"
                  />
                </label>
              )}

              {selected.type === "bumper" && (
                <>
                  <label className="block text-sm text-zinc-400">
                    회전 속도
                    <input
                      type="number"
                      step="0.005"
                      value={selected.spinSpeed}
                      onChange={(e) =>
                        updateSelected("spinSpeed", Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-xl bg-zinc-900 px-3 py-2 text-white outline-none"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        updateSelected("spinSpeed", Math.abs(selected.spinSpeed || 0.03))
                      }
                      className="rounded-xl bg-yellow-400 py-2 font-black text-black"
                    >
                      시계방향
                    </button>
                    <button
                      onClick={() =>
                        updateSelected(
                          "spinSpeed",
                          -Math.abs(selected.spinSpeed || 0.03)
                        )
                      }
                      className="rounded-xl bg-yellow-400 py-2 font-black text-black"
                    >
                      반시계방향
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}