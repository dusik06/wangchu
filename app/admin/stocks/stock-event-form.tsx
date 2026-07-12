"use client";

import { useMemo, useState } from "react";

type Stock = {
  id: number;
  stock_name: string;
  is_listed: number;
};

type EventType = "up" | "down";

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString();
}

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

export default function StockEventForm({
  stocks,
}: {
  stocks: Stock[];
}) {
  const listedStocks = useMemo(
    () =>
      stocks.filter(
        (stock) => Number(stock.is_listed) === 1
      ),
    [stocks]
  );

  const [stockId, setStockId] = useState(
    listedStocks.length > 0
      ? String(listedStocks[0].id)
      : ""
  );

  const [eventTitle, setEventTitle] =
    useState("");

  const [eventType, setEventType] =
    useState<EventType>("up");

  const [eventRate, setEventRate] =
    useState("10");

  const [durationMinutes, setDurationMinutes] =
    useState("30");

  const [loading, setLoading] =
    useState(false);

  const selectedStock = listedStocks.find(
    (stock) =>
      Number(stock.id) === Number(stockId)
  );

  async function createEvent() {
    if (loading) {
      return;
    }

    const parsedStockId = Number(stockId);
    const parsedEventRate =
      Number(eventRate);
    const parsedDuration =
      Number(durationMinutes);

    if (!parsedStockId) {
      alert("이벤트를 적용할 종목을 선택해주세요.");
      return;
    }

    if (!eventTitle.trim()) {
      alert("이벤트 제목을 입력해주세요.");
      return;
    }

    if (
      !Number.isFinite(parsedEventRate) ||
      parsedEventRate <= 0 ||
      parsedEventRate > 300
    ) {
      alert(
        "이벤트 변동률은 0% 초과 300% 이하로 입력해주세요."
      );
      return;
    }

    if (
      !Number.isFinite(parsedDuration) ||
      parsedDuration < 1 ||
      parsedDuration > 10080
    ) {
      alert(
        "지속시간은 1분 이상 10,080분 이하로 입력해주세요."
      );
      return;
    }

    const confirmed = confirm(
      [
        "주식 이벤트를 등록할까요?",
        "",
        `종목: ${
          selectedStock?.stock_name ||
          "선택된 종목"
        }`,
        `제목: ${eventTitle.trim()}`,
        `유형: ${
          eventType === "up"
            ? "호재"
            : "악재"
        }`,
        `변동률: ${
          eventType === "up" ? "+" : "-"
        }${parsedEventRate}%`,
        `지속시간: ${formatNumber(
          parsedDuration
        )}분`,
        "",
        "이벤트 진행 중 가격 갱신이 실행되면 설정한 변동률이 추가 반영됩니다.",
      ].join("\n")
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/stocks/event",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            stockId: parsedStockId,
            eventTitle:
              eventTitle.trim(),
            eventType,
            eventRate:
              parsedEventRate,
            durationMinutes:
              parsedDuration,
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
            "이벤트 등록에 실패했습니다."
        );
        return;
      }

      alert(
        data.message ||
          "주식 이벤트가 등록되었습니다."
      );

      window.location.reload();
    } catch {
      alert(
        "이벤트 등록 중 네트워크 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#101321] p-6 shadow-xl">
      <div>
        <p className="text-xs font-black tracking-[0.2em] text-violet-300">
          STOCK EVENT
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          주식 뉴스 이벤트 등록
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          가격 갱신 시 기본 랜덤 변동과 거래
          압력에 이벤트 변동률이 추가로
          반영됩니다.
        </p>
      </div>

      {listedStocks.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
          이벤트를 등록할 수 있는 상장
          종목이 없습니다.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-zinc-300">
              적용 종목
            </span>

            <select
              value={stockId}
              onChange={(event) =>
                setStockId(
                  event.target.value
                )
              }
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-300/50 disabled:opacity-50"
            >
              {listedStocks.map(
                (stock) => (
                  <option
                    key={stock.id}
                    value={stock.id}
                    className="bg-[#101321]"
                  >
                    {stock.stock_name}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-zinc-300">
              이벤트 제목
            </span>

            <input
              value={eventTitle}
              onChange={(event) =>
                setEventTitle(
                  event.target.value
                )
              }
              disabled={loading}
              maxLength={150}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-300/50 disabled:opacity-50"
              placeholder="예: 왕츄전자 신제품 대성공"
            />

            <div className="mt-2 flex justify-end text-xs text-zinc-600">
              {eventTitle.length} / 150
            </div>
          </label>

          <div>
            <span className="text-sm font-bold text-zinc-300">
              이벤트 유형
            </span>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setEventType("up")
                }
                disabled={loading}
                className={`rounded-xl border px-4 py-4 font-black transition disabled:opacity-50 ${
                  eventType === "up"
                    ? "border-red-400/40 bg-red-400/15 text-red-300"
                    : "border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5"
                }`}
              >
                호재
                <span className="mt-1 block text-xs font-normal">
                  가격 상승 효과
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setEventType("down")
                }
                disabled={loading}
                className={`rounded-xl border px-4 py-4 font-black transition disabled:opacity-50 ${
                  eventType === "down"
                    ? "border-blue-400/40 bg-blue-400/15 text-blue-300"
                    : "border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5"
                }`}
              >
                악재
                <span className="mt-1 block text-xs font-normal">
                  가격 하락 효과
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-zinc-300">
                이벤트 변동률
              </span>

              <div className="relative mt-2">
                <input
                  inputMode="decimal"
                  value={eventRate}
                  onChange={(event) =>
                    setEventRate(
                      sanitizeDecimal(
                        event.target.value
                      )
                    )
                  }
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 pr-10 text-white outline-none transition focus:border-violet-300/50 disabled:opacity-50"
                  placeholder="10"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">
                  %
                </span>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-300">
                지속시간
              </span>

              <div className="relative mt-2">
                <input
                  inputMode="numeric"
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(
                      sanitizeInteger(
                        event.target.value
                      )
                    )
                  }
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 pr-12 text-white outline-none transition focus:border-violet-300/50 disabled:opacity-50"
                  placeholder="30"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-500">
                  분
                </span>
              </div>
            </label>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              eventType === "up"
                ? "border-red-400/20 bg-red-400/10"
                : "border-blue-400/20 bg-blue-400/10"
            }`}
          >
            <p className="text-xs font-bold text-zinc-400">
              적용 미리보기
            </p>

            <p
              className={`mt-2 text-lg font-black ${
                eventType === "up"
                  ? "text-red-300"
                  : "text-blue-300"
              }`}
            >
              {selectedStock?.stock_name ||
                "선택된 종목"}{" "}
              {eventType === "up"
                ? "+"
                : "-"}
              {Number(
                eventRate || 0
              ).toLocaleString()}
              %
            </p>

            <p className="mt-2 text-xs leading-6 text-zinc-500">
              이벤트가 활성화된 동안 가격 갱신
              회차마다 설정한 변동률이 추가로
              반영됩니다.
            </p>
          </div>

          <button
            type="button"
            onClick={createEvent}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 px-4 py-4 font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "이벤트 등록 중..."
              : "이벤트 등록"}
          </button>
        </div>
      )}
    </section>
  );
}