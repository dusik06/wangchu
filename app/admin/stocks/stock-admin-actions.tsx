"use client";

import { useState } from "react";

type Stock = {
  id: number;
  stock_name: string;
  current_price: number;
  normal_rate: number;
  special_chance: number;
  special_rate: number;
  is_listed: number;
};

export default function StockAdminActions({
  stock,
}: {
  stock: Stock;
}) {
  const [open, setOpen] = useState(false);
  const [stockName, setStockName] = useState(stock.stock_name);
  const [currentPrice, setCurrentPrice] = useState(
    String(stock.current_price)
  );
  const [normalRate, setNormalRate] = useState(
    String(stock.normal_rate)
  );
  const [specialChance, setSpecialChance] = useState(
    String(stock.special_chance)
  );
  const [specialRate, setSpecialRate] = useState(
    String(stock.special_rate)
  );
  const [loading, setLoading] = useState<
    "update" | "delist" | "delete" | null
  >(null);

  async function request(
    url: string,
    body: Record<string, unknown>
  ) {
    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({
      success: false,
      message: "서버 응답을 읽을 수 없습니다.",
    }));

    if (!response.ok || !data.success) {
      throw new Error(data.message || "요청 처리에 실패했습니다.");
    }

    return data;
  }

  async function updateStock() {
    if (loading) return;

    setLoading("update");

    try {
      const data = await request("/api/admin/stocks/update", {
        stockId: stock.id,
        stockName: stockName.trim(),
        currentPrice: Number(currentPrice),
        normalRate: Number(normalRate),
        specialChance: Number(specialChance),
        specialRate: Number(specialRate),
      });

      alert(data.message || "수정이 완료되었습니다.");
      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "수정에 실패했습니다."
      );
    } finally {
      setLoading(null);
    }
  }

  async function delistStock() {
    if (loading) return;

    if (
      !confirm(
        `${stock.stock_name}을 상장폐지할까요?\n상장폐지 후 유저는 거래할 수 없습니다.`
      )
    ) {
      return;
    }

    setLoading("delist");

    try {
      const data = await request("/api/admin/stocks/delist", {
        stockId: stock.id,
      });

      alert(data.message || "상장폐지가 완료되었습니다.");
      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "상장폐지에 실패했습니다."
      );
    } finally {
      setLoading(null);
    }
  }

  async function deleteStock() {
    if (loading) return;

    if (
      Number(stock.is_listed) === 1 &&
      !confirm(
        `${stock.stock_name}은 현재 상장 중입니다.\n상장폐지하지 않고 바로 완전 삭제할까요?`
      )
    ) {
      return;
    }

    if (
      !confirm(
        [
          `${stock.stock_name}을 완전히 삭제할까요?`,
          "",
          "해당 종목의 가격·이벤트·거래·보유·시장 라운드 기록도 함께 삭제됩니다.",
          "과거 시즌 우승자와 상금 기록은 유지됩니다.",
          "",
          "이 작업은 되돌릴 수 없습니다.",
        ].join("\n")
      )
    ) {
      return;
    }

    const typedName = prompt(
      `완전 삭제하려면 종목명을 정확히 입력해주세요.\n\n${stock.stock_name}`
    );

    if (typedName !== stock.stock_name) {
      alert("종목명이 일치하지 않아 삭제를 취소했습니다.");
      return;
    }

    setLoading("delete");

    try {
      const data = await request("/api/admin/stocks/delete", {
        stockId: stock.id,
        stockName: typedName,
      });

      alert(data.message || "완전 삭제가 완료되었습니다.");
      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "완전 삭제에 실패했습니다."
      );
    } finally {
      setLoading(null);
    }
  }

  const disabled = loading !== null;

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {open ? "수정창 닫기" : "수정하기"}
      </button>

      {open && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <input
            value={stockName}
            onChange={(event) => setStockName(event.target.value)}
            disabled={disabled}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white disabled:opacity-50"
            placeholder="주식 이름"
          />

          <input
            value={currentPrice}
            onChange={(event) =>
              setCurrentPrice(
                event.target.value.replace(/[^0-9]/g, "")
              )
            }
            disabled={disabled}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white disabled:opacity-50"
            placeholder="현재 가격"
          />

          <input
            value={normalRate}
            onChange={(event) =>
              setNormalRate(
                event.target.value.replace(/[^0-9.]/g, "")
              )
            }
            disabled={disabled}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white disabled:opacity-50"
            placeholder="일반 변동폭 %"
          />

          <input
            value={specialChance}
            onChange={(event) =>
              setSpecialChance(
                event.target.value.replace(/[^0-9.]/g, "")
              )
            }
            disabled={disabled}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white disabled:opacity-50"
            placeholder="특수 확률 %"
          />

          <input
            value={specialRate}
            onChange={(event) =>
              setSpecialRate(
                event.target.value.replace(/[^0-9.]/g, "")
              )
            }
            disabled={disabled}
            className="w-full rounded-xl bg-black/40 px-4 py-3 text-white disabled:opacity-50"
            placeholder="특수 변동폭 %"
          />

          <button
            type="button"
            onClick={updateStock}
            disabled={disabled}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-black text-slate-950 disabled:opacity-50"
          >
            {loading === "update" ? "저장 중..." : "저장"}
          </button>
        </div>
      )}

      {Number(stock.is_listed) === 1 && (
        <button
          type="button"
          onClick={delistStock}
          disabled={disabled}
          className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white transition hover:bg-orange-400 disabled:opacity-50"
        >
          {loading === "delist" ? "처리 중..." : "상장폐지"}
        </button>
      )}

      <button
        type="button"
        onClick={deleteStock}
        disabled={disabled}
        className="w-full rounded-xl bg-red-500 px-4 py-3 font-black text-white transition hover:bg-red-400 disabled:opacity-50"
      >
        {loading === "delete" ? "완전 삭제 중..." : "완전 삭제"}
      </button>
    </div>
  );
}
