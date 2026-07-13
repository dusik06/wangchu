"use client";

import { useMemo, useState } from "react";

type SeasonForm = {
  id?: number;
  seasonNo?: number;
  title: string;
  status?: string;
  startsAt: string;
  endsAt: string;
  currencyName: string;
  entryFeeDotori: number;
  startingMoney: number;
  basePrize: number;
  entryFeePrize?: number;
  feePrize?: number;
  includeEntryFeeInPrize: boolean;
  tradeFeeRate: number;
  minTradeCount: number;
  firstPrizeRate: number;
  secondPrizeRate: number;
  thirdPrizeRate: number;
  marketOpenTime: string;
  marketCloseTime: string;
  priceIntervalMinutes: number;
  virtualTraderEnabled: boolean;
  virtualTraderCount: number;
  noVirtualTradeChance: number;
  virtualMaxPressureRate: number;
  realUserMaxPressureRate: number;
  totalMaxPressureRate: number;
  finalDayEnabled: boolean;
  finalDayHours: number;
  finalDayVolatilityMultiplier: number;
};

type EndedSeason = {
  id: number;
  seasonNo: number;
  title: string;
  totalPrize: number;
  winnerNickname: string | null;
  winnerProfitRate: number | null;
  winnerPrizeAmount: number;
  settledAt: string;
};

const defaults: SeasonForm = {
  title: "주식 시즌",
  startsAt: "",
  endsAt: "",
  currencyName: "주식머니",
  entryFeeDotori: 50,
  startingMoney: 10000,
  basePrize: 5000,
  includeEntryFeeInPrize: false,
  tradeFeeRate: 2,
  minTradeCount: 5,
  firstPrizeRate: 60,
  secondPrizeRate: 30,
  thirdPrizeRate: 10,
  marketOpenTime: "10:00",
  marketCloseTime: "02:00",
  priceIntervalMinutes: 10,
  virtualTraderEnabled: true,
  virtualTraderCount: 10,
  noVirtualTradeChance: 30,
  virtualMaxPressureRate: 1.5,
  realUserMaxPressureRate: 2,
  totalMaxPressureRate: 2.5,
  finalDayEnabled: true,
  finalDayHours: 24,
  finalDayVolatilityMultiplier: 1.25,
};

function n(value: unknown) {
  return Number(value || 0).toLocaleString();
}

export default function StockSeasonManager({
  currentSeason,
  endedSeasons,
}: {
  currentSeason: SeasonForm | null;
  endedSeasons: EndedSeason[];
}) {
  const [form, setForm] = useState<SeasonForm>(currentSeason || defaults);
  const [loading, setLoading] = useState<string | null>(null);
  const totalRate = useMemo(
    () =>
      Number(form.firstPrizeRate) +
      Number(form.secondPrizeRate) +
      Number(form.thirdPrizeRate),
    [form.firstPrizeRate, form.secondPrizeRate, form.thirdPrizeRate]
  );
  const totalPrize =
    Number(form.basePrize || 0) +
    Number(form.entryFeePrize || 0) +
    Number(form.feePrize || 0);

  function set<K extends keyof SeasonForm>(key: K, value: SeasonForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function post(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({
      success: false,
      message: "서버 응답을 읽을 수 없습니다.",
    }));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "처리 실패");
    }
    return data;
  }

  function payload() {
    return {
      seasonId: form.id,
      title: form.title.trim(),
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      currencyName: form.currencyName.trim(),
      entryFeeDotori: Number(form.entryFeeDotori),
      startingMoney: Number(form.startingMoney),
      basePrize: Number(form.basePrize),
      includeEntryFeeInPrize: form.includeEntryFeeInPrize,
      tradeFeeRate: Number(form.tradeFeeRate),
      minTradeCount: Number(form.minTradeCount),
      firstPrizeRate: Number(form.firstPrizeRate),
      secondPrizeRate: Number(form.secondPrizeRate),
      thirdPrizeRate: Number(form.thirdPrizeRate),
      marketOpenTime: form.marketOpenTime,
      marketCloseTime: form.marketCloseTime,
      priceIntervalMinutes: Number(form.priceIntervalMinutes),
      virtualTraderEnabled: form.virtualTraderEnabled,
      virtualTraderCount: Number(form.virtualTraderCount),
      noVirtualTradeChance: Number(form.noVirtualTradeChance),
      virtualMaxPressureRate: Number(form.virtualMaxPressureRate),
      realUserMaxPressureRate: Number(form.realUserMaxPressureRate),
      totalMaxPressureRate: Number(form.totalMaxPressureRate),
      finalDayEnabled: form.finalDayEnabled,
      finalDayHours: Number(form.finalDayHours),
      finalDayVolatilityMultiplier: Number(form.finalDayVolatilityMultiplier),
    };
  }

  function valid() {
    if (!form.title.trim() || !form.startsAt || !form.endsAt) {
      alert("시즌명과 기간을 입력해주세요.");
      return false;
    }
    if (Number(totalRate.toFixed(3)) !== 100) {
      alert("1~3등 상금 비율 합계는 100%여야 합니다.");
      return false;
    }
    return true;
  }

  async function save() {
    if (loading || !valid()) return;
    setLoading(currentSeason ? "update" : "create");
    try {
      const data = await post(
        currentSeason
          ? "/api/admin/stock/season/update"
          : "/api/admin/stock/season/start",
        payload()
      );
      alert(data.message);
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setLoading(null);
    }
  }

  async function endSeason() {
    if (!form.id || loading) return;
    if (!confirm("현재 시즌을 종료하고 보상을 지급할까요?")) return;
    if (!confirm("되돌릴 수 없습니다. 정말 종료할까요?")) return;
    setLoading("end");
    try {
      const data = await post("/api/admin/stock/season/end", {
        seasonId: form.id,
      });
      alert(data.message);
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "종료 실패");
    } finally {
      setLoading(null);
    }
  }

  async function deleteSeason() {
    if (!form.id || form.status !== "ready" || loading) return;
    if (!confirm("시작 전 시즌을 삭제할까요?")) return;
    setLoading("delete");
    try {
      const data = await post("/api/admin/stock/season/delete", {
        seasonId: form.id,
      });
      alert(data.message);
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "삭제 실패");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#070914] px-4 py-8 text-white">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-yellow-300">
              STOCK SEASON ADMIN
            </p>
            <h1 className="mt-2 text-3xl font-black">주식 시즌 관리</h1>
          </div>
          <div className="flex gap-2">
            <a href="/admin/stocks" className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-black">
              종목 관리
            </a>
            <a href="/stock" className="rounded-xl bg-yellow-300 px-4 py-3 text-sm font-black text-black">
              사용자 화면
            </a>
          </div>
        </header>

        {currentSeason && (
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <Summary label="현재 시즌" value={`시즌 ${form.seasonNo} · ${form.status}`} />
            <Summary label="총상금" value={`${n(totalPrize)} 도토리`} accent />
            <Summary label="수수료 누적" value={`${n(form.feePrize)} 도토리`} />
            <Summary label="상금 비율 합계" value={`${totalRate}%`} danger={totalRate !== 100} />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="space-y-5">
            <Panel title="기본 설정">
              <div className="grid gap-4 md:grid-cols-2">
                <Text label="시즌명" value={form.title} onChange={(v) => set("title", v)} />
                <Text label="전용 화폐명" value={form.currencyName} onChange={(v) => set("currencyName", v)} />
                <Text label="시작일시" type="datetime-local" value={form.startsAt} onChange={(v) => set("startsAt", v)} />
                <Text label="종료일시" type="datetime-local" value={form.endsAt} onChange={(v) => set("endsAt", v)} />
                <NumberBox label="참가비 도토리" value={form.entryFeeDotori} onChange={(v) => set("entryFeeDotori", v)} />
                <NumberBox label="시작 자금" value={form.startingMoney} onChange={(v) => set("startingMoney", v)} />
              </div>
              <Check label="참가비를 총상금에 포함" checked={form.includeEntryFeeInPrize} onChange={(v) => set("includeEntryFeeInPrize", v)} />
            </Panel>

            <Panel title="상금·거래 조건">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberBox label="기본상금" value={form.basePrize} onChange={(v) => set("basePrize", v)} />
                <NumberBox label="수수료 %" step="0.01" value={form.tradeFeeRate} onChange={(v) => set("tradeFeeRate", v)} />
                <NumberBox label="최소 거래횟수" value={form.minTradeCount} onChange={(v) => set("minTradeCount", v)} />
                <NumberBox label="1등 %" step="0.01" value={form.firstPrizeRate} onChange={(v) => set("firstPrizeRate", v)} />
                <NumberBox label="2등 %" step="0.01" value={form.secondPrizeRate} onChange={(v) => set("secondPrizeRate", v)} />
                <NumberBox label="3등 %" step="0.01" value={form.thirdPrizeRate} onChange={(v) => set("thirdPrizeRate", v)} />
              </div>
            </Panel>

            <Panel title="시장 운영">
              <div className="grid gap-4 md:grid-cols-3">
                <Text label="장 시작" type="time" value={form.marketOpenTime} onChange={(v) => set("marketOpenTime", v)} />
                <Text label="장 종료" type="time" value={form.marketCloseTime} onChange={(v) => set("marketCloseTime", v)} />
                <NumberBox label="가격 갱신 주기(분)" value={form.priceIntervalMinutes} onChange={(v) => set("priceIntervalMinutes", v)} />
              </div>
            </Panel>

            <Panel title="가상 참가자·시장 영향">
              <Check label="가상 참가자 사용" checked={form.virtualTraderEnabled} onChange={(v) => set("virtualTraderEnabled", v)} />
              <div className="grid gap-4 md:grid-cols-3">
                <NumberBox label="가상 참가자 수" value={form.virtualTraderCount} onChange={(v) => set("virtualTraderCount", v)} />
                <NumberBox label="가상 거래 없음 확률 %" step="0.01" value={form.noVirtualTradeChance} onChange={(v) => set("noVirtualTradeChance", v)} />
                <NumberBox label="가상 최대 영향 %" step="0.01" value={form.virtualMaxPressureRate} onChange={(v) => set("virtualMaxPressureRate", v)} />
                <NumberBox label="실제 유저 최대 영향 %" step="0.01" value={form.realUserMaxPressureRate} onChange={(v) => set("realUserMaxPressureRate", v)} />
                <NumberBox label="전체 최대 영향 %" step="0.01" value={form.totalMaxPressureRate} onChange={(v) => set("totalMaxPressureRate", v)} />
              </div>
            </Panel>

            <Panel title="시즌 막판 변동성">
              <Check label="종료 전 변동성 강화" checked={form.finalDayEnabled} onChange={(v) => set("finalDayEnabled", v)} />
              <div className="grid gap-4 md:grid-cols-2">
                <NumberBox label="적용 시간(시간)" value={form.finalDayHours} onChange={(v) => set("finalDayHours", v)} />
                <NumberBox label="변동성 배율" step="0.01" value={form.finalDayVolatilityMultiplier} onChange={(v) => set("finalDayVolatilityMultiplier", v)} />
              </div>
            </Panel>

            <button
              onClick={save}
              disabled={!!loading}
              className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-black disabled:opacity-50"
            >
              {loading === "create" || loading === "update"
                ? "저장 중..."
                : currentSeason
                ? "현재 시즌 설정 저장"
                : "새 시즌 생성"}
            </button>

            {currentSeason && (
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  onClick={endSeason}
                  disabled={!!loading}
                  className="rounded-2xl bg-red-500 px-5 py-4 font-black disabled:opacity-50"
                >
                  {loading === "end" ? "정산 중..." : "시즌 종료·정산"}
                </button>

                {form.status === "ready" && (
                  <button
                    onClick={deleteSeason}
                    disabled={!!loading}
                    className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 font-black text-red-300 disabled:opacity-50"
                  >
                    {loading === "delete" ? "삭제 중..." : "시작 전 시즌 삭제"}
                  </button>
                )}
              </div>
            )}
          </div>

          <aside>
            <Panel title="지난 시즌">
              {endedSeasons.length === 0 ? (
                <p className="text-sm text-zinc-500">종료된 시즌이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {endedSeasons.slice(0, 8).map((season) => (
                    <div key={season.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-black text-yellow-300">시즌 {season.seasonNo}</p>
                      <p className="mt-1 font-black">{season.title}</p>
                      <div className="mt-3 flex justify-between text-xs">
                        <span className="text-zinc-500">우승자</span>
                        <strong>{season.winnerNickname || "수상자 없음"}</strong>
                      </div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-zinc-500">총상금</span>
                        <strong className="text-yellow-300">{n(season.totalPrize)} 도토리</strong>
                      </div>
                    </div>
                  ))}
                  <a href="/stock/history" className="block rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-black">
                    전체 시즌 기록
                  </a>
                </div>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#101321] p-6">
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Text({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-400">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
    </label>
  );
}

function NumberBox({ label, value, step = "1", onChange }: { label: string; value: number; step?: string; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-400">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
      <span className="font-bold">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-yellow-300" />
    </label>
  );
}

function Summary({ label, value, accent = false, danger = false }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101321] p-5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-2 text-lg font-black ${danger ? "text-red-400" : accent ? "text-yellow-300" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
