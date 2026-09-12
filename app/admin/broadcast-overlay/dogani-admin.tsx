"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DoganiPlayer = {
  id: number;
  name: string;
  amount: number;
  displayOrder: number;
};

type DraftPlayer = {
  key: string;
  name: string;
  amount: string;
};

function onlyDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export default function DoganiAdmin() {
  const [players, setPlayers] = useState<DoganiPlayer[]>([]);
  const [drafts, setDrafts] = useState<DraftPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const overlayUrl = useMemo(() => {
    if (typeof window === "undefined") return "/overlay/dogani-game";
    return `${window.location.origin}/overlay/dogani-game`;
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/dogani-game?t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "불러오지 못했습니다.");
      setPlayers(json.players || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  function addDraft() {
    setDrafts((current) => [
      ...current,
      { key: `${Date.now()}-${Math.random()}`, name: "", amount: "" },
    ]);
  }

  function updateDraft(key: string, patch: Partial<DraftPlayer>) {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft))
    );
  }

  function removeDraft(key: string) {
    setDrafts((current) => current.filter((draft) => draft.key !== key));
  }

  async function saveDraft(draft: DraftPlayer) {
    const name = draft.name.trim();
    const amount = Number(onlyDigits(draft.amount));

    if (!name) {
      setMessage("이름을 입력해주세요.");
      return;
    }
    if (!amount || amount < 0) {
      setMessage("금액을 입력해주세요.");
      return;
    }

    setSavingKey(draft.key);
    setMessage("");
    try {
      const res = await fetch("/api/admin/dogani-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", name, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "등록하지 못했습니다.");
      removeDraft(draft.key);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setSavingKey(null);
    }
  }


  function startEdit(player: DoganiPlayer) {
    setEditingId(player.id);
    setEditingName(player.name);
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveName(player: DoganiPlayer) {
    const name = editingName.trim();
    if (!name) {
      setMessage("이름을 입력해주세요.");
      return;
    }

    setWorkingId(player.id);
    setMessage("");
    try {
      const res = await fetch("/api/admin/dogani-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit_name", id: player.id, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "수정하지 못했습니다.");
      setPlayers((current) =>
        current.map((item) => (item.id === player.id ? { ...item, name } : item))
      );
      cancelEdit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setWorkingId(null);
    }
  }

  async function success(player: DoganiPlayer) {
    setWorkingId(player.id);
    setMessage("");
    try {
      const res = await fetch("/api/admin/dogani-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "success", id: player.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "처리하지 못했습니다.");
      setPlayers((current) => current.filter((item) => item.id !== player.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setWorkingId(null);
    }
  }

  async function copyOverlayUrl() {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setMessage("주소 복사가 안 되면 아래 주소를 길게 눌러 복사해주세요.");
    }
  }

  return (
    <main className="min-h-screen bg-[#090613] px-3 py-5 text-white md:px-6 md:py-7">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-rose-400">도가니게임</p>
            <h1 className="mt-1 text-2xl font-black md:text-3xl">도가니게임 관리</h1>
            <p className="mt-2 text-sm leading-6 text-white/55">
              이름과 받아야 할 금액을 등록하면 방송 화면에 바로 표시됩니다. 금액을 받으면 성공을 눌러 화면에서 내립니다.
            </p>
          </div>
          <button
            type="button"
            onClick={addDraft}
            className="min-h-12 rounded-xl bg-rose-600 px-5 py-3 text-base font-black active:scale-[.99] md:text-sm"
          >
            + 사람 추가
          </button>
        </header>

        {message && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {message}
          </div>
        )}

        <section className="mb-5 rounded-2xl border border-white/10 bg-[#151027] p-4 md:p-5">
          <div className="mb-3 font-black">PRISM Live 방송 화면 주소</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={overlayUrl}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#090613] px-3 py-3 text-sm text-white/70"
            />
            <button
              type="button"
              onClick={copyOverlayUrl}
              className="min-h-12 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black"
            >
              {copied ? "복사됨" : "주소 복사"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/45">
            갤럭시 PRISM Live 웹 소스에서도 바깥 배경이 생기지 않도록 오버레이 페이지 자체를 완전 투명으로 처리했습니다.
          </p>
        </section>

        {drafts.length > 0 && (
          <section className="mb-5 space-y-3 rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4 md:p-5">
            <div className="font-black">추가할 사람</div>
            {drafts.map((draft) => (
              <div
                key={draft.key}
                className="grid gap-2 rounded-xl border border-white/10 bg-[#0d0918] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
              >
                <input
                  value={draft.name}
                  onChange={(e) => updateDraft(draft.key, { name: e.target.value })}
                  placeholder="이름 예: 왕츄"
                  className="min-h-12 min-w-0 rounded-xl border border-white/10 bg-[#090613] px-4 text-base font-bold outline-none focus:border-rose-400"
                />
                <div className="relative">
                  <input
                    inputMode="numeric"
                    value={draft.amount ? Number(draft.amount).toLocaleString("ko-KR") : ""}
                    onChange={(e) => updateDraft(draft.key, { amount: onlyDigits(e.target.value) })}
                    placeholder="금액 예: 120000"
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-[#090613] px-4 pr-10 text-base font-bold outline-none focus:border-rose-400"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-white/45">원</span>
                </div>
                <button
                  type="button"
                  disabled={savingKey === draft.key}
                  onClick={() => saveDraft(draft)}
                  className="min-h-12 rounded-xl bg-rose-600 px-5 font-black disabled:opacity-50"
                >
                  {savingKey === draft.key ? "등록 중" : "화면에 띄우기"}
                </button>
                <button
                  type="button"
                  onClick={() => removeDraft(draft.key)}
                  className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 font-black text-white/65"
                >
                  취소
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#151027] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">현재 화면에 표시 중</h2>
              <p className="mt-1 text-xs text-white/45">성공을 누르면 즉시 방송 화면에서 사라집니다.</p>
            </div>
            <div className="rounded-full bg-white/5 px-3 py-1.5 text-sm font-black text-white/60">
              {players.length}명
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-white/45">불러오는 중...</div>
          ) : players.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-white/40">
              현재 등록된 사람이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-[#0d0918] p-3"
                >
                  <div className="min-w-0 flex-1">
                    {editingId === player.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName(player);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="min-h-12 w-full rounded-xl border border-rose-400/50 bg-[#090613] px-3 text-base font-black outline-none focus:border-rose-400"
                      />
                    ) : (
                      <div className="truncate text-base font-black">{player.name}</div>
                    )}
                    <div className="mt-1 text-lg font-black text-amber-300 tabular-nums">
                      {player.amount.toLocaleString("ko-KR")}원
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {editingId === player.id ? (
                      <>
                        <button
                          type="button"
                          disabled={workingId === player.id}
                          onClick={() => saveName(player)}
                          className="min-h-12 rounded-xl bg-rose-600 px-4 text-sm font-black active:scale-[.98] disabled:opacity-50"
                        >
                          {workingId === player.id ? "저장 중" : "저장"}
                        </button>
                        <button
                          type="button"
                          disabled={workingId === player.id}
                          onClick={cancelEdit}
                          className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-black text-white/65 disabled:opacity-50"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(player)}
                        className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white/80 active:scale-[.98]"
                      >
                        이름 수정
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={workingId === player.id}
                      onClick={() => success(player)}
                      className="min-h-12 rounded-xl bg-emerald-600 px-5 text-base font-black active:scale-[.98] disabled:opacity-50"
                    >
                      {workingId === player.id ? "처리 중" : "성공"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
