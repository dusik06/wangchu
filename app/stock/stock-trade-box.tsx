"use client";

import { useMemo, useState } from "react";

type TradeType = "buy" | "sell";

type Props = {
  stockId: number;
  currentPrice?: number;
  userDotori?: number;
  myQuantity?: number;
  myAvgPrice?: number;
  myBuyAmount?: number;
  myEvalAmount?: number;
  myProfit?: number;
  myProfitRate?: number;
  buyableQuantity?: number;
};

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function profitClass(value: number) {
  if (value > 0) return "text-red-400";
  if (value < 0) return "text-blue-400";
  return "text-zinc-400";
}

export default function StockTradeBox({
  stockId,
  currentPrice = 0,
  userDotori = 0,
  myQuantity = 0,
  myAvgPrice = 0,
  myBuyAmount = 0,
  myEvalAmount = 0,
  myProfit = 0,
  myProfitRate = 0,
  buyableQuantity = 0,
}: Props) {
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [modalType, setModalType] = useState<TradeType | null>(null);

  const q = useMemo(() => {
    return Math.max(0, Math.floor(Number(quantity || 0)));
  }, [quantity]);

  const totalAmount = currentPrice * q;
  const afterDotori = userDotori - totalAmount;
  const lackDotori = Math.max(0, totalAmount - userDotori);

  const sellReceiveAmount = currentPrice * q;
  const sellCostAmount =
    myQuantity > 0 ? Math.floor((myBuyAmount * q) / myQuantity) : 0;
  const sellProfit = sellReceiveAmount - sellCostAmount;
  const afterQuantity = myQuantity - q;

  const canBuy = q > 0 && totalAmount > 0 && userDotori >= totalAmount;
  const canSell = q > 0 && myQuantity >= q;

  function openConfirm(type: TradeType) {
    if (!q || q <= 0) {
      alert("수량을 입력해주세요.");
      return;
    }

    setModalType(type);
  }

  async function trade(type: TradeType) {
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/stock/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId,
          quantity: q,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "거래 실패");
        return;
      }

      alert(data.message);
      location.reload();
    } catch {
      alert("거래 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setModalType(null);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-500">내 도토리</p>
              <p className="mt-1 font-black text-yellow-300">
                {formatNumber(userDotori)}개
              </p>
            </div>

            <div>
              <p className="text-zinc-500">현재가</p>
              <p className="mt-1 font-black">
                {formatNumber(currentPrice)}개
              </p>
            </div>

            <div>
              <p className="text-zinc-500">보유량</p>
              <p className="mt-1 font-black">{formatNumber(myQuantity)}주</p>
            </div>

            <div>
              <p className="text-zinc-500">평단가</p>
              <p className="mt-1 font-black">{formatNumber(myAvgPrice)}개</p>
            </div>

            <div>
              <p className="text-zinc-500">총 투자금</p>
              <p className="mt-1 font-black">{formatNumber(myBuyAmount)}개</p>
            </div>

            <div>
              <p className="text-zinc-500">평가금</p>
              <p className="mt-1 font-black">{formatNumber(myEvalAmount)}개</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-900 p-3">
            <p className="text-xs text-zinc-500">평가손익</p>
            <p className={`mt-1 text-xl font-black ${profitClass(myProfit)}`}>
              {myProfit > 0 ? "+" : ""}
              {formatNumber(myProfit)}개 ({myProfitRate > 0 ? "+" : ""}
              {myProfitRate}%)
            </p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-400">
            거래 수량
          </label>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#f7d36b]"
            placeholder="수량"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-800 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">예상 거래금액</span>
            <span className="font-black text-[#f7d36b]">
              {formatNumber(totalAmount)}개
            </span>
          </div>

          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">매수 가능</span>
            <span className="font-black">{formatNumber(buyableQuantity)}주</span>
          </div>

          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">매도 가능</span>
            <span className="font-black">{formatNumber(myQuantity)}주</span>
          </div>

          {q > 0 && lackDotori > 0 && (
            <p className="mt-3 rounded-xl bg-red-500/15 p-3 text-xs font-bold text-red-400">
              도토리 {formatNumber(lackDotori)}개가 부족합니다.
            </p>
          )}

          {q > 0 && myQuantity < q && (
            <p className="mt-3 rounded-xl bg-blue-500/15 p-3 text-xs font-bold text-blue-400">
              보유 수량보다 {formatNumber(q - myQuantity)}주 많습니다.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => openConfirm("buy")}
            disabled={loading}
            className="rounded-xl bg-red-500 px-4 py-3 font-black text-white hover:bg-red-400 disabled:opacity-50"
          >
            매수
          </button>

          <button
            onClick={() => openConfirm("sell")}
            disabled={loading}
            className="rounded-xl bg-blue-500 px-4 py-3 font-black text-white hover:bg-blue-400 disabled:opacity-50"
          >
            매도
          </button>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <h3
              className={`text-2xl font-black ${
                modalType === "buy" ? "text-red-400" : "text-blue-400"
              }`}
            >
              {modalType === "buy" ? "매수 확인" : "매도 확인"}
            </h3>

            {modalType === "buy" ? (
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between rounded-xl bg-slate-900 p-3">
                  <span className="text-zinc-400">수량</span>
                  <span className="font-black">{formatNumber(q)}주</span>
                </div>

                <div className="flex justify-between rounded-xl bg-slate-900 p-3">
                  <span className="text-zinc-400">예상 총 금액</span>
                  <span className="font-black text-[#f7d36b]">
                    {formatNumber(totalAmount)}개
                  </span>
                </div>

                <div className="flex justify-between rounded-xl bg-slate-900 p-3">
                  <span className="text-zinc-400">현재 도토리</span>
                  <span className="font-black">{formatNumber(userDotori)}개</span>
                </div>

                {canBuy ? (
                  <div className="flex justify-between rounded-xl bg-emerald-500/15 p-3">
                    <span className="text-emerald-300">구매 후 잔액</span>
                    <span className="font-black text-emerald-300">
                      {formatNumber(afterDotori)}개
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl bg-red-500/15 p-4 text-sm font-bold text-red-400">
                    도토리 {formatNumber(lackDotori)}개가 부족해서 매수할 수
                    없습니다.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between rounded-xl bg-slate-900 p-3">
                  <span className="text-zinc-400">수량</span>
                  <span className="font-black">{formatNumber(q)}주</span>
                </div>

                <div className="flex justify-between rounded-xl bg-slate-900 p-3">
                  <span className="text-zinc-400">예상 수령 도토리</span>
                  <span className="font-black text-[#f7d36b]">
                    {formatNumber(sellReceiveAmount)}개
                  </span>
                </div>

                <div className="flex justify-between rounded-xl bg-slate-900 p-3">
                  <span className="text-zinc-400">현재 보유량</span>
                  <span className="font-black">{formatNumber(myQuantity)}주</span>
                </div>

                {canSell ? (
                  <>
                    <div className="flex justify-between rounded-xl bg-slate-900 p-3">
                      <span className="text-zinc-400">판매 후 잔량</span>
                      <span className="font-black">
                        {formatNumber(afterQuantity)}주
                      </span>
                    </div>

                    <div className="flex justify-between rounded-xl bg-slate-900 p-3">
                      <span className="text-zinc-400">예상 손익</span>
                      <span className={`font-black ${profitClass(sellProfit)}`}>
                        {sellProfit > 0 ? "+" : ""}
                        {formatNumber(sellProfit)}개
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl bg-blue-500/15 p-4 text-sm font-bold text-blue-400">
                    보유 수량이 {formatNumber(q - myQuantity)}주 부족해서
                    매도할 수 없습니다.
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                onClick={() => setModalType(null)}
                disabled={loading}
                className="rounded-xl bg-slate-800 px-4 py-3 font-black hover:bg-slate-700 disabled:opacity-50"
              >
                취소
              </button>

              <button
                onClick={() => trade(modalType)}
                disabled={
                  loading ||
                  (modalType === "buy" && !canBuy) ||
                  (modalType === "sell" && !canSell)
                }
                className={`rounded-xl px-4 py-3 font-black text-white disabled:opacity-40 ${
                  modalType === "buy"
                    ? "bg-red-500 hover:bg-red-400"
                    : "bg-blue-500 hover:bg-blue-400"
                }`}
              >
                {loading
                  ? "처리중..."
                  : modalType === "buy"
                  ? "매수하기"
                  : "매도하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}