"use client";

import { useMemo, useState } from "react";

type ActiveSeason = {
  id: number;
  season_no: number;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  currency_name: string;
  entry_fee_dotori: number;
  starting_money: number;
  base_prize: number;
  entry_fee_prize: number;
  fee_prize: number;
  trade_fee_rate: number;
  min_trade_count: number;
  first_prize_rate: number;
  second_prize_rate: number;
  third_prize_rate: number;
  market_open_time: string;
  market_close_time: string;
  price_interval_minutes: number;
  virtual_trader_enabled: number;
  virtual_trader_count: number;
};

type Props = {
  activeSeason: ActiveSeason | null;
  participantCount: number;
  qualifiedCount: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDatetimeLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultStart() {
  return toDatetimeLocal(new Date());
}

function getDefaultEnd() {
  const date = new Date();
  date.setDate(date.getDate() + 7);

  return toDatetimeLocal(date);
}

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value: any) {
  if (!value) return "-";

  return String(value).slice(0, 16).replace("T", " ");
}

function inputClassName() {
  return "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-yellow-300/60";
}

export default function StockSeasonManager({
  activeSeason,
  participantCount,
  qualifiedCount,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "시즌1",
    startsAt: getDefaultStart(),
    endsAt: getDefaultEnd(),

    currencyName: "투자금",
    entryFeeDotori: "50",
    startingMoney: "10000",

    basePrize: "5000",
    includeEntryFeeInPrize: true,

    tradeFeeRate: "0",
    minTradeCount: "5",

    firstPrizeRate: "50",
    secondPrizeRate: "30",
    thirdPrizeRate: "20",

    marketOpenTime: "10:00",
    marketCloseTime: "02:00",
    priceIntervalMinutes: "10",

    virtualTraderEnabled: true,
    virtualTraderCount: "6",
    noVirtualTradeChance: "30",

    virtualMaxPressureRate: "1.5",
    realUserMaxPressureRate: "2",
    totalMaxPressureRate: "2.5",

    finalDayEnabled: true,
    finalDayHours: "24",
    finalDayVolatilityMultiplier: "1.25",
  });

  const totalRate = useMemo(() => {
    return (
      Number(form.firstPrizeRate || 0) +
      Number(form.secondPrizeRate || 0) +
      Number(form.thirdPrizeRate || 0)
    );
  }, [
    form.firstPrizeRate,
    form.secondPrizeRate,
    form.thirdPrizeRate,
  ]);

  const currentTotalPrize = activeSeason
    ? Number(activeSeason.base_prize || 0) +
      Number(activeSeason.entry_fee_prize || 0) +
      Number(activeSeason.fee_prize || 0)
    : 0;

  function changeField(name: keyof typeof form, value: any) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function startSeason() {
    if (loading || activeSeason) return;

    if (Number(totalRate.toFixed(3)) !== 100) {
      alert("1등, 2등, 3등 상금 비율의 합계는 100%여야 합니다.");
      return;
    }

    const confirmed = confirm(
      [
        `${form.title}을 시작할까요?`,
        "",
        `전용 화폐: ${form.currencyName}`,
        `참가비: ${formatNumber(form.entryFeeDotori)} 도토리`,
        `시작 자금: ${formatNumber(form.startingMoney)} ${form.currencyName}`,
        `기본상금: ${formatNumber(form.basePrize)} 도토리`,
        `시장: ${form.marketOpenTime} ~ ${form.marketCloseTime}`,
        `가상 참가자: ${
          form.virtualTraderEnabled
            ? `${form.virtualTraderCount}명`
            : "사용 안 함"
        }`,
      ].join("\n")
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/stock/season/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,

            entryFeeDotori: Number(form.entryFeeDotori),
            startingMoney: Number(form.startingMoney),
            basePrize: Number(form.basePrize),

            tradeFeeRate: 0,
            minTradeCount: Number(form.minTradeCount),

            firstPrizeRate: Number(form.firstPrizeRate),
            secondPrizeRate: Number(form.secondPrizeRate),
            thirdPrizeRate: Number(form.thirdPrizeRate),

            priceIntervalMinutes: Number(
              form.priceIntervalMinutes
            ),

            virtualTraderCount: Number(
              form.virtualTraderCount
            ),
            noVirtualTradeChance: Number(
              form.noVirtualTradeChance
            ),

            virtualMaxPressureRate: Number(
              form.virtualMaxPressureRate
            ),
            realUserMaxPressureRate: Number(
              form.realUserMaxPressureRate
            ),
            totalMaxPressureRate: Number(
              form.totalMaxPressureRate
            ),

            finalDayHours: Number(form.finalDayHours),
            finalDayVolatilityMultiplier: Number(
              form.finalDayVolatilityMultiplier
            ),
          }),
        }
      );

      const data = await response.json();

      alert(data.message || "시즌 시작 요청이 처리되었습니다.");

      if (response.ok && data.success) {
        window.location.reload();
      }
    } catch {
      alert("시즌 시작 중 네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function endSeason() {
    if (loading || !activeSeason) return;

    const confirmed = confirm(
      [
        `${activeSeason.title}을 지금 종료할까요?`,
        "",
        "거래 5회 등 현재 시즌의 참가 조건을 기준으로",
        "최종 수익률 순위를 확정하고 1~3등 도토리를 지급합니다.",
        "",
        "이 작업은 되돌릴 수 없습니다.",
      ].join("\n")
    );

    if (!confirmed) return;

    const secondConfirmed = confirm(
      "정말로 시즌을 종료하고 보상을 지급할까요?"
    );

    if (!secondConfirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/stock/season/end",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            seasonId: activeSeason.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "시즌 종료에 실패했습니다.");
        return;
      }

      const winnerText = Array.isArray(data.winners)
        ? data.winners
            .map(
              (winner: any) =>
                `${winner.rank}등 ${winner.nickname} / ${
                  winner.profitRate >= 0 ? "+" : ""
                }${winner.profitRate}% / ${formatNumber(
                  winner.prizeAmount
                )} 도토리`
            )
            .join("\n")
        : "";

      alert(
        [
          data.message,
          "",
          winnerText || "보상 조건을 충족한 참가자가 없습니다.",
          "",
          `총상금: ${formatNumber(data.totalPrize)} 도토리`,
          `실제 지급: ${formatNumber(
            data.paidPrizeTotal
          )} 도토리`,
        ].join("\n")
      );

      window.location.reload();
    } catch {
      alert("시즌 종료 중 네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (activeSeason) {
    return (
      <section className="rounded-3xl border border-yellow-300/20 bg-gradient-to-br from-[#141022] via-[#101525] to-[#0b1220] p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                {activeSeason.status === "ready"
                  ? "시작 대기"
                  : "진행 중"}
              </span>

              <span className="text-xs font-bold text-zinc-400">
                SEASON {activeSeason.season_no}
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-black text-white">
              {activeSeason.title}
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              한국시간 {formatDate(activeSeason.starts_at)} ~{" "}
              {formatDate(activeSeason.ends_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={endSeason}
            disabled={loading}
            className="rounded-2xl border border-red-400/30 bg-red-500/15 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
          >
            {loading ? "정산 처리 중..." : "시즌 종료 및 보상 지급"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <InfoCard
            label="참가자"
            value={`${formatNumber(participantCount)}명`}
          />

          <InfoCard
            label="현재 보상 대상"
            value={`${formatNumber(qualifiedCount)}명`}
          />

          <InfoCard
            label="기본상금"
            value={`${formatNumber(activeSeason.base_prize)} 도토리`}
          />

          <InfoCard
            label="참가비 적립"
            value={`${formatNumber(
              activeSeason.entry_fee_prize
            )} 도토리`}
          />

        </div>

        <div className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-5">
          <p className="text-xs font-bold text-yellow-200">
            현재 총상금
          </p>

          <p className="mt-2 text-3xl font-black text-yellow-300">
            {formatNumber(currentTotalPrize)} 도토리
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <PrizePreview
              rank="1등"
              amount={Math.floor(
                (currentTotalPrize *
                  Number(activeSeason.first_prize_rate)) /
                  100
              )}
            />

            <PrizePreview
              rank="2등"
              amount={Math.floor(
                (currentTotalPrize *
                  Number(activeSeason.second_prize_rate)) /
                  100
              )}
            />

            <PrizePreview
              rank="3등"
              amount={Math.floor(
                (currentTotalPrize *
                  Number(activeSeason.third_prize_rate)) /
                  100
              )}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoCard
            label="시즌 전용 화폐"
            value={activeSeason.currency_name}
          />

          <InfoCard
            label="참가비 / 시작 자금"
            value={`${formatNumber(
              activeSeason.entry_fee_dotori
            )} 도토리 / ${formatNumber(
              activeSeason.starting_money
            )} ${activeSeason.currency_name}`}
          />

          <InfoCard
            label="시장 운영"
            value={`${String(activeSeason.market_open_time).slice(
              0,
              5
            )} ~ ${String(
              activeSeason.market_close_time
            ).slice(0, 5)} · ${activeSeason.price_interval_minutes}분`}
          />

          <InfoCard
            label="최소 거래"
            value={`${activeSeason.min_trade_count}회`}
          />

          <InfoCard
            label="가상 참가자"
            value={
              Number(activeSeason.virtual_trader_enabled)
                ? `${activeSeason.virtual_trader_count}명`
                : "사용 안 함"
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#101321] p-6 shadow-2xl">
      <div>
        <p className="text-xs font-black tracking-[0.2em] text-yellow-300">
          NEW STOCK SEASON
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          새 시즌 설정
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          모든 시간은 한국시간 기준입니다. 가상 참가자는 시장
          거래량과 가격 변동에만 영향을 주며 실제 참가자 랭킹과
          상금에는 포함되지 않습니다.
        </p>
      </div>

      <FormSection title="시즌 기본 설정">
        <Field label="시즌명">
          <input
            value={form.title}
            onChange={(event) =>
              changeField("title", event.target.value)
            }
            className={inputClassName()}
            placeholder="예: 시즌1"
          />
        </Field>

        <Field label="시작일시 · 한국시간">
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) =>
              changeField("startsAt", event.target.value)
            }
            className={inputClassName()}
          />
        </Field>

        <Field label="종료일시 · 한국시간">
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) =>
              changeField("endsAt", event.target.value)
            }
            className={inputClassName()}
          />
        </Field>
      </FormSection>

      <FormSection title="참가 및 전용 화폐">
        <Field label="시즌 전용 화폐명">
          <input
            value={form.currencyName}
            onChange={(event) =>
              changeField("currencyName", event.target.value)
            }
            className={inputClassName()}
            placeholder="원하는 이름 입력"
          />
        </Field>

        <Field label="참가비 도토리">
          <NumberInput
            value={form.entryFeeDotori}
            onChange={(value) =>
              changeField("entryFeeDotori", value)
            }
          />
        </Field>

        <Field label="참가 시 지급할 전용 화폐">
          <NumberInput
            value={form.startingMoney}
            onChange={(value) =>
              changeField("startingMoney", value)
            }
          />
        </Field>

        <CheckboxField
          checked={form.includeEntryFeeInPrize}
          onChange={(checked) =>
            changeField("includeEntryFeeInPrize", checked)
          }
          title="참가비를 시즌 상금에 포함"
          description="참가자가 낸 도토리 참가비를 총상금에 추가합니다."
        />
      </FormSection>

      <FormSection title="상금 및 참가 조건">
        <Field label="기본상금">
          <NumberInput
            value={form.basePrize}
            onChange={(value) =>
              changeField("basePrize", value)
            }
          />
        </Field>

        <Field label="최소 거래 횟수">
          <NumberInput
            value={form.minTradeCount}
            onChange={(value) =>
              changeField("minTradeCount", value)
            }
          />
        </Field>

        <Field label="1등 비율 (%)">
          <DecimalInput
            value={form.firstPrizeRate}
            onChange={(value) =>
              changeField("firstPrizeRate", value)
            }
          />
        </Field>

        <Field label="2등 비율 (%)">
          <DecimalInput
            value={form.secondPrizeRate}
            onChange={(value) =>
              changeField("secondPrizeRate", value)
            }
          />
        </Field>

        <Field label="3등 비율 (%)">
          <DecimalInput
            value={form.thirdPrizeRate}
            onChange={(value) =>
              changeField("thirdPrizeRate", value)
            }
          />
        </Field>

        <div
          className={`rounded-2xl border p-4 md:col-span-3 ${
            Number(totalRate.toFixed(3)) === 100
              ? "border-emerald-400/20 bg-emerald-400/10"
              : "border-red-400/20 bg-red-400/10"
          }`}
        >
          <p className="text-xs text-zinc-400">비율 합계</p>
          <p className="mt-1 text-xl font-black">
            {totalRate}%
          </p>
        </div>
      </FormSection>

      <FormSection title="한국시간 시장 운영">
        <Field label="시장 개장시간">
          <input
            type="time"
            value={form.marketOpenTime}
            onChange={(event) =>
              changeField("marketOpenTime", event.target.value)
            }
            className={inputClassName()}
          />
        </Field>

        <Field label="시장 마감시간">
          <input
            type="time"
            value={form.marketCloseTime}
            onChange={(event) =>
              changeField("marketCloseTime", event.target.value)
            }
            className={inputClassName()}
          />
        </Field>

        <Field label="가격 갱신 주기 · 분">
          <NumberInput
            value={form.priceIntervalMinutes}
            onChange={(value) =>
              changeField("priceIntervalMinutes", value)
            }
          />
        </Field>
      </FormSection>

      <FormSection title="가상 참가자 및 가격 영향">
        <CheckboxField
          checked={form.virtualTraderEnabled}
          onChange={(checked) =>
            changeField("virtualTraderEnabled", checked)
          }
          title="가상 참가자 사용"
          description="가상 참가자는 시장만 움직이며 실제 랭킹에는 나타나지 않습니다."
        />

        <Field label="가상 참가자 수">
          <NumberInput
            value={form.virtualTraderCount}
            onChange={(value) =>
              changeField("virtualTraderCount", value)
            }
          />
        </Field>

        <Field label="가상 거래가 없는 회차 확률 (%)">
          <DecimalInput
            value={form.noVirtualTradeChance}
            onChange={(value) =>
              changeField("noVirtualTradeChance", value)
            }
          />
        </Field>

        <Field label="가상 참가자 최대 영향 (%)">
          <DecimalInput
            value={form.virtualMaxPressureRate}
            onChange={(value) =>
              changeField("virtualMaxPressureRate", value)
            }
          />
        </Field>

        <Field label="실제 유저 최대 영향 (%)">
          <DecimalInput
            value={form.realUserMaxPressureRate}
            onChange={(value) =>
              changeField("realUserMaxPressureRate", value)
            }
          />
        </Field>

        <Field label="전체 거래 최대 영향 (%)">
          <DecimalInput
            value={form.totalMaxPressureRate}
            onChange={(value) =>
              changeField("totalMaxPressureRate", value)
            }
          />
        </Field>
      </FormSection>

      <FormSection title="시즌 마지막 구간">
        <CheckboxField
          checked={form.finalDayEnabled}
          onChange={(checked) =>
            changeField("finalDayEnabled", checked)
          }
          title="마지막 구간 변동성 적용"
          description="시즌 종료가 가까워지면 랜덤 변동폭이 설정한 배율만큼 증가합니다."
        />

        <Field label="종료 전 적용 시간">
          <NumberInput
            value={form.finalDayHours}
            onChange={(value) =>
              changeField("finalDayHours", value)
            }
          />
        </Field>

        <Field label="변동성 배율">
          <DecimalInput
            value={form.finalDayVolatilityMultiplier}
            onChange={(value) =>
              changeField(
                "finalDayVolatilityMultiplier",
                value
              )
            }
          />
        </Field>
      </FormSection>

      <button
        type="button"
        onClick={startSeason}
        disabled={
          loading ||
          Number(totalRate.toFixed(3)) !== 100
        }
        className="mt-8 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 px-5 py-4 text-lg font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "시즌 생성 중..." : "설정한 내용으로 시즌 시작"}
      </button>
    </section>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-lg font-black text-white">{title}</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={(event) =>
        onChange(event.target.value.replace(/[^0-9]/g, ""))
      }
      className={inputClassName()}
    />
  );
}

function DecimalInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(event) => {
        let next = event.target.value.replace(/[^0-9.]/g, "");

        const parts = next.split(".");

        if (parts.length > 2) {
          next = `${parts[0]}.${parts.slice(1).join("")}`;
        }

        onChange(next);
      }}
      className={inputClassName()}
    />
  );
}

function CheckboxField({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:col-span-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-yellow-300"
      />

      <span>
        <span className="block font-black text-white">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-zinc-400">
          {description}
        </span>
      </span>
    </label>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-bold text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
}

function PrizePreview({
  rank,
  amount,
}: {
  rank: string;
  amount: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-zinc-400">{rank} 예상</p>
      <p className="mt-1 font-black text-white">
        {formatNumber(amount)} 도토리
      </p>
    </div>
  );
}