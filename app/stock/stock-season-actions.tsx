"use client";

import { useEffect, useMemo, useState } from "react";
import { parseKoreanDate } from "@/lib/korean-time";

type Props = {
  seasonTitle: string;
  endsAt: string | null;
  canJoin: boolean;
  alreadyJoined: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  seasonRunning: boolean;
  entryFeeDotori: number;
  startingMoney: number;
  currencyName: string;
  seasonStateMessage: string;
};

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString();
}

function parseKstDate(value: string | null) {
  return parseKoreanDate(value);
}

function getRemainingText(target: Date | null) {
  if (!target) {
    return "종료시간 확인 불가";
  }

  const difference = target.getTime() - Date.now();

  if (difference <= 0) {
    return "시즌 종료";
  }

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}일 ${String(hours).padStart(2, "0")}시간 ${String(
    minutes
  ).padStart(2, "0")}분 ${String(seconds).padStart(2, "0")}초`;
}

export default function StockSeasonActions({
  seasonTitle,
  endsAt,
  canJoin,
  alreadyJoined,
  isLoggedIn,
  isAdmin,
  seasonRunning,
  entryFeeDotori,
  startingMoney,
  currencyName,
  seasonStateMessage,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [remainingText, setRemainingText] = useState("");

  const targetDate = useMemo(() => parseKstDate(endsAt), [endsAt]);

  useEffect(() => {
    function updateRemainingTime() {
      setRemainingText(getRemainingText(targetDate));
    }

    updateRemainingTime();

    const timer = window.setInterval(updateRemainingTime, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [targetDate]);

  async function joinSeason() {
    if (loading || !canJoin) return;

    const confirmed = confirm(
      [
        `${seasonTitle}에 참가할까요?`,
        "",
        `참가비: ${formatNumber(entryFeeDotori)} 도토리`,
        `지급: ${formatNumber(startingMoney)} ${currencyName}`,
        "",
        "참가비를 내면 취소하거나 환불할 수 없습니다.",
      ].join("\n")
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch("/api/stock/join", {
        method: "POST",
      });

      const data = await response.json();

      alert(data.message || "시즌 참가 요청이 처리되었습니다.");

      if (response.ok && data.success) {
        window.location.reload();
      }
    } catch {
      alert("시즌 참가 중 네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <p className="text-xs font-bold text-zinc-500">
          시즌 종료까지
        </p>

        <p className="mt-2 text-2xl font-black text-white">
          {remainingText || "계산 중..."}
        </p>

        <p className="mt-2 text-xs text-zinc-500">
          모든 시간은 한국시간 기준입니다.
        </p>
      </div>

      {alreadyJoined ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
          <p className="text-sm font-black text-emerald-300">
            시즌 참가 완료
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-300">
            현재 시즌 전용 화폐로 종목을 거래할 수 있습니다.
          </p>
        </div>
      ) : isAdmin ? (
        <div className="rounded-2xl border border-zinc-500/20 bg-zinc-500/10 p-5">
          <p className="text-sm font-black text-zinc-300">
            관리자 계정
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            관리자 계정은 시즌 랭킹의 공정성을 위해 참가할 수
            없습니다.
          </p>
        </div>
      ) : !isLoggedIn ? (
        <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-5">
          <p className="text-sm font-black text-yellow-200">
            로그인이 필요합니다
          </p>

          <p className="mt-2 text-sm text-zinc-300">
            로그인 후 시즌에 참가할 수 있습니다.
          </p>
        </div>
      ) : !seasonRunning ? (
        <div className="rounded-2xl border border-zinc-500/20 bg-zinc-500/10 p-5">
          <p className="text-sm font-black text-zinc-300">
            현재 참가 불가
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            {seasonStateMessage}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={joinSeason}
          disabled={loading || !canJoin}
          className="w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 px-5 py-4 text-base font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? "참가 처리 중..."
            : `${formatNumber(entryFeeDotori)} 도토리로 시즌 참가`}
        </button>
      )}

      {!alreadyJoined && !isAdmin && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400">참가비</span>
            <strong className="text-yellow-300">
              {formatNumber(entryFeeDotori)} 도토리
            </strong>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-zinc-400">시작 자금</span>
            <strong className="text-white">
              {formatNumber(startingMoney)} {currencyName}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}