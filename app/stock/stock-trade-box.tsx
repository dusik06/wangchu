"use client";

import { useMemo, useState } from "react";

type TradeType = "buy" | "sell";

type Props = {
  stockId: number;
  currentPrice: number;
  currencyName: string;
  availableMoney: number;
  myQuantity: number;
  myAvgPrice: number;
  myBuyAmount: number;
  myEvalAmount: number;
  myProfit: number;
  myProfitRate: number;
  buyableQuantity: number;
  feeRate: number;
  canTrade: boolean;
  disabledMessage: string;
};

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function profitClass(value: number) {
  if (value > 0) return "text-red-400";
  if (value < 0) return "text-blue-400";

  return "text-zinc-400";
}

function calculateFee(grossAmount: number, feeRate: number) {
  if (grossAmount <= 0 || feeRate <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil((grossAmount * feeRate) / 100));
}

export default function StockTradeBox({
  stockId,
  currentPrice,
  currencyName,
  availableMoney,
  myQuantity,
  myAvgPrice,
  myBuyAmount,
  myEvalAmount,
  myProfit,
  myProfitRate,
  buyableQuantity,
  feeRate,
  canTrade,
  disabledMessage,
}: Props) {
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [modalType, setModalType] = useState<TradeType | null>(null);

  const tradeQuantity = useMemo(() => {
    return Math.max(0, Math.floor(Number(quantity || 0)));
  }, [quantity]);

  const grossAmount = currentPrice * tradeQuantity;
  const feeAmount = calculateFee(grossAmount, feeRate);

  const buyFinalCost = grossAmount + feeAmount;
  const buyAfterMoney = availableMoney - buyFinalCost;

  const sellReceiveAmount = Math.max(0, grossAmount - feeAmount);
  const sellBuyCost =
    myQuantity > 0
      ? Math.floor((myBuyAmount * tradeQuantity) / myQuantity)
      : 0;

  const sellProfit = sellReceiveAmount - sellBuyCost;
  const sellAfterQuantity = myQuantity - tradeQuantity;

  const canBuy =
    canTrade &&
    tradeQuantity > 0 &&
    grossAmount > 0 &&
    availableMoney >= buyFinalCost;

  const canSell =
    canTrade &&
    tradeQuantity > 0 &&
    myQuantity >= tradeQuantity;

  function setPresetQuantity(value: number) {
    setQuantity(String(Math.max(1, Math.floor(value))));
  }

  function openConfirm(type: TradeType) {
    if (!canTrade) {
      alert(disabledMessage);
      return;
    }

    if (tradeQuantity <= 0) {
      alert("거래 수량을 입력해주세요.");
      return;
    }

    setModalType(type);
  }

  async function trade(type: TradeType) {
    if (loading || !canTrade) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/stock/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId,
          quantity: tradeQuantity,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "거래에 실패했습니다.");
        return;
      }

      alert(
        [
          data.message,
          "",
          `거래금액: ${formatNumber(data.grossAmount)} ${currencyName}`,
          `수수료: ${formatNumber(data.feeAmount)} ${currencyName}`,
          type === "buy"
            ? `최종 차감: ${formatNumber(data.finalCost)} ${currencyName}`
            : `실제 수령: ${formatNumber(
                data.receiveAmount
              )} ${currencyName}`,
        ].join("\n")
      );

      window.location.reload();
    } catch {
      alert("거래 중 네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setModalType(null);
    }
  }

  return (
    <>
      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info
              label={`보유 ${currencyName}`}
              value={`${formatNumber(availableMoney)}`}
              highlight
            />

            <Info
              label="현재가"
              value={`${formatNumber(currentPrice)}`}
            />

            <Info
              label="보유 수량"
              value={`${formatNumber(myQuantity)}주`}
            />

            <Info
              label="평균 매수가"
              value={`${formatNumber(myAvgPrice)}`}
            />

            <Info
              label="총 매수금"
              value={`${formatNumber(myBuyAmount)}`}
            />

            <Info
              label="현재 평가금"
              value={`${formatNumber(myEvalAmount)}`}
            />
          </div>

          <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-3">
            <p className="text-xs text-zinc-500">종목 평가손익</p>

            <p
              className={`mt-1 text-lg font-black ${profitClass(
                myProfit
              )}`}
            >
              {myProfit > 0 ? "+" : ""}
              {formatNumber(myProfit)} {currencyName}
              <span className="ml-2 text-sm">
                ({myProfitRate > 0 ? "+" : ""}
                {Number(myProfitRate).toFixed(2)}%)
              </span>
            </p>
          </div>
        </div>

        {!canTrade && (
          <div className="rounded-2xl border border-zinc-500/20 bg-zinc-500/10 p-4 text-sm font-bold text-zinc-300">
            {disabledMessage}
          </div>
        )}

        <div>
          <label className="text-sm font-bold text-zinc-300">
            거래 수량
          </label>

          <input
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value.replace(/[^0-9]/g, ""))
            }
            disabled={!canTrade}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-yellow-300/60 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="수량 입력"
          />

          <div className="mt-2 grid grid-cols-4 gap-2">
            <PresetButton
              label="1주"
              onClick={() => setPresetQuantity(1)}
              disabled={!canTrade}
            />

            <PresetButton
              label="10주"
              onClick={() => setPresetQuantity(10)}
              disabled={!canTrade}
            />

            <PresetButton
              label="매수 50%"
              onClick={() =>
                setPresetQuantity(Math.max(1, Math.floor(buyableQuantity / 2)))
              }
              disabled={!canTrade || buyableQuantity <= 0}
            />

            <PresetButton
              label="최대"
              onClick={() =>
                setPresetQuantity(
                  myQuantity > 0 ? myQuantity : buyableQuantity
                )
              }
              disabled={
                !canTrade &&
                myQuantity <= 0 &&
                buyableQuantity <= 0
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 text-sm">
          <Row
            label="예상 거래금액"
            value={`${formatNumber(grossAmount)} ${currencyName}`}
          />

          <Row
            label={`거래 수수료 ${feeRate}%`}
            value={`${formatNumber(feeAmount)} ${currencyName}`}
          />

          <div className="my-3 h-px bg-white/10" />

          <Row
            label="매수 시 최종 차감"
            value={`${formatNumber(buyFinalCost)} ${currencyName}`}
            emphasize
          />

          <Row
            label="매도 시 실제 수령"
            value={`${formatNumber(sellReceiveAmount)} ${currencyName}`}
            emphasize
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-xs text-zinc-500">매수 가능</p>
              <p className="mt-1 font-black">
                {formatNumber(buyableQuantity)}주
              </p>
            </div>

            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-xs text-zinc-500">매도 가능</p>
              <p className="mt-1 font-black">
                {formatNumber(myQuantity)}주
              </p>
            </div>
          </div>

          {canTrade &&
            tradeQuantity > 0 &&
            availableMoney < buyFinalCost && (
              <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">
                {currencyName}이{" "}
                {formatNumber(buyFinalCost - availableMoney)} 부족합니다.
              </p>
            )}

          {canTrade &&
            tradeQuantity > 0 &&
            myQuantity < tradeQuantity && (
              <p className="mt-3 rounded-xl bg-blue-500/10 p-3 text-xs font-bold text-blue-300">
                보유 수량보다{" "}
                {formatNumber(tradeQuantity - myQuantity)}주 많습니다.
              </p>
            )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openConfirm("buy")}
            disabled={loading || !canTrade}
            className="rounded-xl bg-red-500 px-4 py-3 font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            매수
          </button>

          <button
            type="button"
            onClick={() => openConfirm("sell")}
            disabled={loading || !canTrade}
            className="rounded-xl bg-blue-500 px-4 py-3 font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            매도
          </button>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1220] p-6 shadow-2xl">
            <h3
              className={`text-2xl font-black ${
                modalType === "buy"
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {modalType === "buy" ? "매수 확인" : "매도 확인"}
            </h3>

            <div className="mt-5 space-y-3 text-sm">
              <ModalRow
                label="거래 수량"
                value={`${formatNumber(tradeQuantity)}주`}
              />

              <ModalRow
                label="거래 금액"
                value={`${formatNumber(grossAmount)} ${currencyName}`}
              />

              <ModalRow
                label={`수수료 ${feeRate}%`}
                value={`${formatNumber(feeAmount)} ${currencyName}`}
              />

              {modalType === "buy" ? (
                <>
                  <ModalRow
                    label="최종 차감"
                    value={`${formatNumber(buyFinalCost)} ${currencyName}`}
                    highlight
                  />

                  <ModalRow
                    label="거래 후 잔액"
                    value={`${formatNumber(
                      Math.max(0, buyAfterMoney)
                    )} ${currencyName}`}
                  />

                  {!canBuy && (
                    <Warning>
                      보유한 {currencyName}이 부족해 매수할 수 없습니다.
                    </Warning>
                  )}
                </>
              ) : (
                <>
                  <ModalRow
                    label="실제 수령"
                    value={`${formatNumber(
                      sellReceiveAmount
                    )} ${currencyName}`}
                    highlight
                  />

                  <ModalRow
                    label="판매 후 보유량"
                    value={`${formatNumber(
                      Math.max(0, sellAfterQuantity)
                    )}주`}
                  />

                  <ModalRow
                    label="예상 실현손익"
                    value={`${
                      sellProfit > 0 ? "+" : ""
                    }${formatNumber(sellProfit)} ${currencyName}`}
                  />

                  {!canSell && (
                    <Warning>
                      보유한 주식 수량이 부족해 매도할 수 없습니다.
                    </Warning>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                disabled={loading}
                className="rounded-xl bg-zinc-800 px-4 py-3 font-black transition hover:bg-zinc-700 disabled:opacity-40"
              >
                취소
              </button>

              <button
                type="button"
                onClick={() => trade(modalType)}
                disabled={
                  loading ||
                  (modalType === "buy" && !canBuy) ||
                  (modalType === "sell" && !canSell)
                }
                className={`rounded-xl px-4 py-3 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  modalType === "buy"
                    ? "bg-red-500 hover:bg-red-400"
                    : "bg-blue-500 hover:bg-blue-400"
                }`}
              >
                {loading
                  ? "처리 중..."
                  : modalType === "buy"
                  ? "매수 확정"
                  : "매도 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Info({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-black ${
          highlight ? "text-yellow-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <span className="text-zinc-400">{label}</span>
      <span
        className={
          emphasize
            ? "font-black text-yellow-300"
            : "font-black text-white"
        }
      >
        {value}
      </span>
    </div>
  );
}

function ModalRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-black/25 p-3">
      <span className="text-zinc-400">{label}</span>
      <strong
        className={highlight ? "text-yellow-300" : "text-white"}
      >
        {value}
      </strong>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 font-bold text-red-300">
      {children}
    </div>
  );
}

function PresetButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {label}
    </button>
  );
}