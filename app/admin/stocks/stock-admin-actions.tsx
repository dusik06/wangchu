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

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString();
}

function toNumericInput(value: string) {
  return value.replace(/[^0-9.]/g, "");
}

export default function StockAdminActions({
  stock,
}: {
  stock: Stock;
}) {
  const [open, setOpen] = useState(false);

  const [stockName, setStockName] = useState(
    String(stock.stock_name || "")
  );

  const [currentPrice, setCurrentPrice] = useState(
    String(stock.current_price || 0)
  );

  const [normalRate, setNormalRate] = useState(
    String(stock.normal_rate || 0)
  );

  const [specialChance, setSpecialChance] = useState(
    String(stock.special_chance || 0)
  );

  const [specialRate, setSpecialRate] = useState(
    String(stock.special_rate || 0)
  );

  const [loadingAction, setLoadingAction] = useState<
    "update" | "delist" | "delete" | "refresh" | null
  >(null);

  async function requestJson(
    url: string,
    body?: Record<string, unknown>
  ) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any = null;

    try {
      data = await response.json();
    } catch {
      data = {
        success: false,
        message: "서버 응답을 읽을 수 없습니다.",
      };
    }

    if (!response.ok || !data?.success) {
      throw new Error(
        data?.message || "요청 처리에 실패했습니다."
      );
    }

    return data;
  }

  async function updateStock() {
    if (loadingAction) return;

    const trimmedName = stockName.trim();
    const parsedCurrentPrice = Number(currentPrice);
    const parsedNormalRate = Number(normalRate);
    const parsedSpecialChance = Number(specialChance);
    const parsedSpecialRate = Number(specialRate);

    if (!trimmedName) {
      alert("주식 이름을 입력해주세요.");
      return;
    }

    if (
      !Number.isFinite(parsedCurrentPrice) ||
      parsedCurrentPrice <= 0
    ) {
      alert("현재 가격은 1 이상이어야 합니다.");
      return;
    }

    if (
      !Number.isFinite(parsedNormalRate) ||
      parsedNormalRate < 0 ||
      parsedNormalRate > 100
    ) {
      alert("일반 변동폭은 0% 이상 100% 이하로 입력해주세요.");
      return;
    }

    if (
      !Number.isFinite(parsedSpecialChance) ||
      parsedSpecialChance < 0 ||
      parsedSpecialChance > 100
    ) {
      alert("특수 확률은 0% 이상 100% 이하로 입력해주세요.");
      return;
    }

    if (
      !Number.isFinite(parsedSpecialRate) ||
      parsedSpecialRate < 0 ||
      parsedSpecialRate > 500
    ) {
      alert("특수 변동폭은 0% 이상 500% 이하로 입력해주세요.");
      return;
    }

    const confirmed = confirm(
      [
        `${stock.stock_name} 설정을 수정할까요?`,
        "",
        `이름: ${trimmedName}`,
        `현재가: ${formatNumber(parsedCurrentPrice)}`,
        `일반 변동폭: ±${parsedNormalRate}%`,
        `특수 확률: ${parsedSpecialChance}%`,
        `특수 변동폭: ±${parsedSpecialRate}%`,
        "",
        "현재가를 바꾸면 시즌 참가자 자산과 수익률도 다시 계산됩니다.",
      ].join("\n")
    );

    if (!confirmed) return;

    setLoadingAction("update");

    try {
      const data = await requestJson(
        "/api/admin/stocks/update",
        {
          stockId: stock.id,
          stockName: trimmedName,
          currentPrice: parsedCurrentPrice,
          normalRate: parsedNormalRate,
          specialChance: parsedSpecialChance,
          specialRate: parsedSpecialRate,
        }
      );

      alert(data.message || "수정이 완료되었습니다.");
      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "수정에 실패했습니다."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function refreshMarket() {
    if (loadingAction) return;

    const confirmed = confirm(
      [
        "주식시장 가격 갱신을 실행할까요?",
        "",
        "갱신 시간이 된 모든 상장 종목에 대해",
        "가상 참가자 거래, 실제 유저 거래 압력,",
        "랜덤 변동과 이벤트를 반영합니다.",
      ].join("\n")
    );

    if (!confirmed) return;

    setLoadingAction("refresh");

    try {
      const data = await requestJson(
        "/api/stock/refresh"
      );

      alert(
        [
          data.message || "가격 갱신이 완료되었습니다.",
          "",
          `가격 갱신 종목: ${formatNumber(
            data.updatedCount
          )}개`,
          `상장폐지 종목: ${formatNumber(
            data.delistedCount
          )}개`,
          `가상 거래 실행: ${formatNumber(
            data.virtualTraderExecuted
          )}건`,
        ].join("\n")
      );

      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "가격 갱신에 실패했습니다."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function delistStock() {
    if (loadingAction) return;

    const confirmed = confirm(
      [
        `${stock.stock_name}을 상장폐지할까요?`,
        "",
        "현재 가격은 0으로 변경됩니다.",
        "실제 유저와 가상 참가자의 해당 종목 보유량은 삭제됩니다.",
        "시즌 참가자 자산과 수익률도 다시 계산됩니다.",
        "",
        "이 작업은 되돌릴 수 없습니다.",
      ].join("\n")
    );

    if (!confirmed) return;

    const secondConfirmed = confirm(
      `정말로 ${stock.stock_name}을 상장폐지할까요?`
    );

    if (!secondConfirmed) return;

    setLoadingAction("delist");

    try {
      const data = await requestJson(
        "/api/admin/stocks/delist",
        {
          stockId: stock.id,
        }
      );

      alert(
        [
          data.message || "상장폐지가 완료되었습니다.",
          "",
          `삭제된 전체 보유량: ${formatNumber(
            data.deletedQuantity
          )}주`,
        ].join("\n")
      );

      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "상장폐지에 실패했습니다."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function deleteStock() {
    if (loadingAction) return;

    const confirmed = confirm(
      [
        `${stock.stock_name}을 완전히 삭제할까요?`,
        "",
        "현재 시즌 거래, 보유 기록, 차트, 이벤트,",
        "가상 참가자 기록까지 함께 삭제됩니다.",
        "",
        "종료된 시즌 기록이 있으면 삭제되지 않습니다.",
      ].join("\n")
    );

    if (!confirmed) return;

    const typedName = prompt(
      `완전 삭제하려면 주식 이름을 정확히 입력해주세요.\n\n${stock.stock_name}`
    );

    if (typedName !== stock.stock_name) {
      alert("주식 이름이 일치하지 않아 삭제를 취소했습니다.");
      return;
    }

    setLoadingAction("delete");

    try {
      const data = await requestJson(
        "/api/admin/stocks/delete",
        {
          stockId: stock.id,
        }
      );

      alert(data.message || "완전 삭제가 완료되었습니다.");
      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "완전 삭제에 실패했습니다."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  const disabled = loadingAction !== null;

  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        className="w-full rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 font-black text-cyan-300 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {open ? "수정창 닫기" : "종목 설정 수정"}
      </button>

      {open && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/25 p-4">
          <label className="block">
            <span className="text-xs font-bold text-zinc-400">
              주식 이름
            </span>

            <input
              value={stockName}
              onChange={(event) =>
                setStockName(event.target.value)
              }
              disabled={disabled}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
              placeholder="주식 이름"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-zinc-400">
              현재 가격
            </span>

            <input
              inputMode="numeric"
              value={currentPrice}
              onChange={(event) =>
                setCurrentPrice(
                  event.target.value.replace(/[^0-9]/g, "")
                )
              }
              disabled={disabled}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
              placeholder="현재 가격"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-bold text-zinc-400">
                일반 변동폭
              </span>

              <div className="relative mt-2">
                <input
                  inputMode="decimal"
                  value={normalRate}
                  onChange={(event) =>
                    setNormalRate(
                      toNumericInput(event.target.value)
                    )
                  }
                  disabled={disabled}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-9 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                  %
                </span>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-zinc-400">
                특수 발생 확률
              </span>

              <div className="relative mt-2">
                <input
                  inputMode="decimal"
                  value={specialChance}
                  onChange={(event) =>
                    setSpecialChance(
                      toNumericInput(event.target.value)
                    )
                  }
                  disabled={disabled}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-9 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                  %
                </span>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-zinc-400">
                특수 변동폭
              </span>

              <div className="relative mt-2">
                <input
                  inputMode="decimal"
                  value={specialRate}
                  onChange={(event) =>
                    setSpecialRate(
                      toNumericInput(event.target.value)
                    )
                  }
                  disabled={disabled}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-9 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                  %
                </span>
              </div>
            </label>
          </div>

          <div className="rounded-xl border border-yellow-300/10 bg-yellow-300/5 p-3 text-xs leading-6 text-zinc-400">
            현재 가격을 수정하면 가격 기록이 생성되고, 현재 시즌
            참가자의 주식 평가금과 수익률이 즉시 다시 계산됩니다.
          </div>

          <button
            type="button"
            onClick={updateStock}
            disabled={disabled}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingAction === "update"
              ? "저장 중..."
              : "설정 저장"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={refreshMarket}
        disabled={disabled}
        className="w-full rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 font-black text-violet-300 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loadingAction === "refresh"
          ? "가격 갱신 중..."
          : "시장 가격 즉시 갱신"}
      </button>

      {Number(stock.is_listed) === 1 && (
        <button
          type="button"
          onClick={delistStock}
          disabled={disabled}
          className="w-full rounded-xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 font-black text-orange-300 transition hover:bg-orange-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction === "delist"
            ? "상장폐지 처리 중..."
            : "상장폐지"}
        </button>
      )}

      <button
        type="button"
        onClick={deleteStock}
        disabled={disabled}
        className="w-full rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 font-black text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loadingAction === "delete"
          ? "완전 삭제 중..."
          : "종목 및 관련 기록 완전 삭제"}
      </button>
    </div>
  );
}