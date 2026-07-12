"use client";

import { useState } from "react";

function sanitizeInteger(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function sanitizeDecimal(value: string) {
  let next = value.replace(/[^0-9.]/g, "");
  const parts = next.split(".");

  if (parts.length > 2) {
    next = `${parts[0]}.${parts.slice(1).join("")}`;
  }

  return next;
}

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString();
}

export default function StockCreateForm() {
  const [stockName, setStockName] = useState("");
  const [currentPrice, setCurrentPrice] =
    useState("1000");
  const [normalRate, setNormalRate] =
    useState("5");
  const [specialChance, setSpecialChance] =
    useState("5");
  const [specialRate, setSpecialRate] =
    useState("20");
  const [loading, setLoading] =
    useState(false);

  async function createStock() {
    if (loading) {
      return;
    }

    const trimmedName = stockName.trim();
    const parsedCurrentPrice =
      Number(currentPrice);
    const parsedNormalRate =
      Number(normalRate);
    const parsedSpecialChance =
      Number(specialChance);
    const parsedSpecialRate =
      Number(specialRate);

    if (!trimmedName) {
      alert("주식 이름을 입력해주세요.");
      return;
    }

    if (
      !Number.isFinite(parsedCurrentPrice) ||
      parsedCurrentPrice <= 0
    ) {
      alert("초기 가격은 1 이상이어야 합니다.");
      return;
    }

    if (
      !Number.isFinite(parsedNormalRate) ||
      parsedNormalRate < 0 ||
      parsedNormalRate > 100
    ) {
      alert(
        "일반 변동폭은 0% 이상 100% 이하로 입력해주세요."
      );
      return;
    }

    if (
      !Number.isFinite(parsedSpecialChance) ||
      parsedSpecialChance < 0 ||
      parsedSpecialChance > 100
    ) {
      alert(
        "특수 발생 확률은 0% 이상 100% 이하로 입력해주세요."
      );
      return;
    }

    if (
      !Number.isFinite(parsedSpecialRate) ||
      parsedSpecialRate < 0 ||
      parsedSpecialRate > 500
    ) {
      alert(
        "특수 변동폭은 0% 이상 500% 이하로 입력해주세요."
      );
      return;
    }

    const confirmed = confirm(
      [
        "새 주식을 상장할까요?",
        "",
        `종목명: ${trimmedName}`,
        `초기 가격: ${formatNumber(
          parsedCurrentPrice
        )}`,
        `일반 변동폭: ±${parsedNormalRate}%`,
        `특수 발생 확률: ${parsedSpecialChance}%`,
        `특수 변동폭: ±${parsedSpecialRate}%`,
      ].join("\n")
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/stocks/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            stockName: trimmedName,
            currentPrice:
              parsedCurrentPrice,
            normalRate:
              parsedNormalRate,
            specialChance:
              parsedSpecialChance,
            specialRate:
              parsedSpecialRate,
          }),
        }
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = {
          success: false,
          message:
            "서버 응답을 읽을 수 없습니다.",
        };
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        alert(
          data?.message ||
            "주식 생성에 실패했습니다."
        );
        return;
      }

      alert(
        data.message ||
          "신규 주식이 생성되었습니다."
      );

      window.location.reload();
    } catch {
      alert(
        "주식 생성 중 네트워크 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#101321] p-6 shadow-xl">
      <div>
        <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
          NEW STOCK
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          신규 주식 상장
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          종목별 일반 랜덤 변동폭과 특수
          이벤트 확률을 설정할 수 있습니다.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-bold text-zinc-300">
            주식 이름
          </span>

          <input
            value={stockName}
            onChange={(event) =>
              setStockName(
                event.target.value
              )
            }
            disabled={loading}
            maxLength={100}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
            placeholder="예: 왕츄전자"
          />

          <div className="mt-2 flex justify-end text-xs text-zinc-600">
            {stockName.length} / 100
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-zinc-300">
            초기 가격
          </span>

          <input
            inputMode="numeric"
            value={currentPrice}
            onChange={(event) =>
              setCurrentPrice(
                sanitizeInteger(
                  event.target.value
                )
              )
            }
            disabled={loading}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
            placeholder="1000"
          />

          <p className="mt-2 text-xs text-zinc-600">
            시즌 전용 화폐 기준 가격입니다.
          </p>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-bold text-zinc-300">
              일반 변동폭
            </span>

            <div className="relative mt-2">
              <input
                inputMode="decimal"
                value={normalRate}
                onChange={(event) =>
                  setNormalRate(
                    sanitizeDecimal(
                      event.target.value
                    )
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 pr-10 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
                placeholder="5"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">
                %
              </span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-zinc-300">
              특수 발생 확률
            </span>

            <div className="relative mt-2">
              <input
                inputMode="decimal"
                value={specialChance}
                onChange={(event) =>
                  setSpecialChance(
                    sanitizeDecimal(
                      event.target.value
                    )
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 pr-10 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
                placeholder="5"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">
                %
              </span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-zinc-300">
              특수 변동폭
            </span>

            <div className="relative mt-2">
              <input
                inputMode="decimal"
                value={specialRate}
                onChange={(event) =>
                  setSpecialRate(
                    sanitizeDecimal(
                      event.target.value
                    )
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 pr-10 text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-50"
                placeholder="20"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">
                %
              </span>
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold text-zinc-500">
            설정 미리보기
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PreviewCard
              label="종목명"
              value={
                stockName.trim() ||
                "주식 이름 미입력"
              }
            />

            <PreviewCard
              label="초기 가격"
              value={`${formatNumber(
                currentPrice
              )}`}
              highlight
            />

            <PreviewCard
              label="일반 변동"
              value={`±${Number(
                normalRate || 0
              )}%`}
            />

            <PreviewCard
              label="특수 변동"
              value={`${Number(
                specialChance || 0
              )}% 확률 / ±${Number(
                specialRate || 0
              )}%`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4 text-xs leading-6 text-zinc-400">
          신규 상장 시 초기 가격 기록이 자동
          생성됩니다. 이후 가격 갱신 때 일반
          랜덤 변동, 특수 변동, 실제 유저 거래
          압력, 가상 참가자 거래 압력과 뉴스
          이벤트가 함께 반영됩니다.
        </div>

        <button
          type="button"
          onClick={createStock}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-4 font-black text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "신규 상장 처리 중..."
            : "신규 주식 상장"}
        </button>
      </div>
    </section>
  );
}

function PreviewCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-1 font-black ${
          highlight
            ? "text-yellow-300"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}