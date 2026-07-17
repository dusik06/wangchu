"use client";

import { useState } from "react";

type Stock = {
  id: number; stock_name: string; current_price: number; is_listed: number;
  normal_down_min?: number; normal_down_max?: number; normal_up_min?: number; normal_up_max?: number;
  special_chance: number; special_up_min?: number; special_up_max?: number;
};

export default function StockAdminActions({ stock }: { stock: Stock }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    stockName: stock.stock_name,
    currentPrice: String(stock.current_price),
    normalDownMin: String(stock.normal_down_min ?? 1),
    normalDownMax: String(stock.normal_down_max ?? 3),
    normalUpMin: String(stock.normal_up_min ?? 1),
    normalUpMax: String(stock.normal_up_max ?? 5),
    specialChance: String(stock.special_chance ?? 5),
    specialUpMin: String(stock.special_up_min ?? 10),
    specialUpMax: String(stock.special_up_max ?? 25),
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: key === "stockName" ? value : value.replace(/[^0-9.]/g, "") }));
  }

  async function request(url: string, body: object) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "처리에 실패했습니다.");
    return data;
  }

  async function update() {
    if (loading) return;
    if (Number(form.normalDownMin) > Number(form.normalDownMax)) return alert("하락 최소값이 최대값보다 큽니다.");
    if (Number(form.normalUpMin) > Number(form.normalUpMax)) return alert("상승 최소값이 최대값보다 큽니다.");
    if (Number(form.specialUpMin) > Number(form.specialUpMax)) return alert("호재 최소값이 최대값보다 큽니다.");
    setLoading("update");
    try {
      const data = await request("/api/admin/stocks/update", {
        stockId: stock.id,
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === "stockName" ? v.trim() : Number(v)])),
      });
      alert(data.message); location.reload();
    } catch (e) { alert(e instanceof Error ? e.message : "수정 실패"); }
    finally { setLoading(null); }
  }

  async function delist() {
    if (!confirm(`${stock.stock_name}을 상장폐지할까요?`)) return;
    setLoading("delist");
    try { const data = await request("/api/admin/stocks/delist", { stockId: stock.id }); alert(data.message); location.reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "처리 실패"); }
    finally { setLoading(null); }
  }

  async function remove() {
    if (!confirm(`${stock.stock_name}과 관련 기록을 완전히 삭제할까요?`)) return;
    const name = prompt("삭제할 종목명을 정확히 입력해주세요.");
    if (name !== stock.stock_name) return alert("종목명이 일치하지 않습니다.");
    setLoading("delete");
    try { const data = await request("/api/admin/stocks/delete", { stockId: stock.id, stockName: name }); alert(data.message); location.reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "삭제 실패"); }
    finally { setLoading(null); }
  }

  return <div className="mt-4 space-y-2">
    <button onClick={() => setOpen(!open)} className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-black">{open ? "수정창 닫기" : "수정하기"}</button>
    {open && <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
      <Field label="주식 이름" value={form.stockName} onChange={(v) => set("stockName", v)} />
      <Field label="현재 가격" value={form.currentPrice} onChange={(v) => set("currentPrice", v)} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="하락 최소 %" value={form.normalDownMin} onChange={(v) => set("normalDownMin", v)} />
        <Field label="하락 최대 %" value={form.normalDownMax} onChange={(v) => set("normalDownMax", v)} />
        <Field label="상승 최소 %" value={form.normalUpMin} onChange={(v) => set("normalUpMin", v)} />
        <Field label="상승 최대 %" value={form.normalUpMax} onChange={(v) => set("normalUpMax", v)} />
      </div>
      <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3">
        <p className="mb-3 text-sm font-black text-yellow-300">자동 호재 설정</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="확률 %" value={form.specialChance} onChange={(v) => set("specialChance", v)} />
          <Field label="상승 최소 %" value={form.specialUpMin} onChange={(v) => set("specialUpMin", v)} />
          <Field label="상승 최대 %" value={form.specialUpMax} onChange={(v) => set("specialUpMax", v)} />
        </div>
      </div>
      <button onClick={update} disabled={!!loading} className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-black disabled:opacity-50">{loading === "update" ? "저장 중..." : "저장"}</button>
    </div>}
    {Number(stock.is_listed) === 1 && <button onClick={delist} disabled={!!loading} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black">상장폐지</button>}
    <button onClick={remove} disabled={!!loading} className="w-full rounded-xl bg-red-500 px-4 py-3 font-black">완전 삭제</button>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-bold text-zinc-400">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white" /></label>;
}
