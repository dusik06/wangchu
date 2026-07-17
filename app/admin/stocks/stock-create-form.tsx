"use client";

import { useState } from "react";

function clean(value: string) {
  const next = value.replace(/[^0-9.]/g, "");
  const [head, ...tail] = next.split(".");
  return tail.length ? `${head}.${tail.join("")}` : head;
}

export default function StockCreateForm() {
  const [form, setForm] = useState({
    stockName: "",
    currentPrice: "1000",
    normalDownMin: "1",
    normalDownMax: "3",
    normalUpMin: "1",
    normalUpMax: "5",
    specialChance: "5",
    specialUpMin: "10",
    specialUpMax: "25",
  });
  const [loading, setLoading] = useState(false);

  function change(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: key === "stockName" ? value : clean(value) }));
  }

  async function submit() {
    if (loading) return;
    const values = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, key === "stockName" ? value.trim() : Number(value)])
    );

    if (!form.stockName.trim()) return alert("주식 이름을 입력해주세요.");
    if (Number(form.currentPrice) <= 0) return alert("초기 가격은 1 이상이어야 합니다.");
    if (Number(form.normalDownMin) > Number(form.normalDownMax)) return alert("일반 하락 최소값은 최대값보다 클 수 없습니다.");
    if (Number(form.normalUpMin) > Number(form.normalUpMax)) return alert("일반 상승 최소값은 최대값보다 클 수 없습니다.");
    if (Number(form.specialUpMin) > Number(form.specialUpMax)) return alert("자동 호재 최소값은 최대값보다 클 수 없습니다.");

    setLoading(true);
    try {
      const res = await fetch("/api/admin/stocks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "등록에 실패했습니다.");
      alert(data.message);
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#101321] p-6">
      <h2 className="text-2xl font-black">새 주식 등록</h2>
      <p className="mt-2 text-sm text-zinc-400">하락·상승 범위와 자동 호재만 정하면 나머지는 시장이 자동으로 움직입니다.</p>

      <div className="mt-5 space-y-4">
        <Field label="주식 이름" value={form.stockName} onChange={(v) => change("stockName", v)} />
        <Field label="초기 가격" value={form.currentPrice} onChange={(v) => change("currentPrice", v)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="일반 하락 최소 %" value={form.normalDownMin} onChange={(v) => change("normalDownMin", v)} />
          <Field label="일반 하락 최대 %" value={form.normalDownMax} onChange={(v) => change("normalDownMax", v)} />
          <Field label="일반 상승 최소 %" value={form.normalUpMin} onChange={(v) => change("normalUpMin", v)} />
          <Field label="일반 상승 최대 %" value={form.normalUpMax} onChange={(v) => change("normalUpMax", v)} />
        </div>

        <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/5 p-4">
          <p className="font-black text-yellow-300">자동 호재</p>
          <p className="mt-1 text-xs text-zinc-400">설정한 확률로 자동 발생하며 모든 유저에게 시장 속보가 표시됩니다.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="발생 확률 %" value={form.specialChance} onChange={(v) => change("specialChance", v)} />
            <Field label="상승 최소 %" value={form.specialUpMin} onChange={(v) => change("specialUpMin", v)} />
            <Field label="상승 최대 %" value={form.specialUpMax} onChange={(v) => change("specialUpMax", v)} />
          </div>
        </div>

        <button onClick={submit} disabled={loading} className="w-full rounded-xl bg-cyan-400 px-4 py-4 font-black text-black disabled:opacity-50">
          {loading ? "등록 중..." : "신규 주식 상장"}
        </button>
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-zinc-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-400/60" />
    </label>
  );
}
