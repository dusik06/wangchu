import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StockSeasonManager from "./stock-season-manager";

export const dynamic = "force-dynamic";

function toLocal(value: unknown) {
  return value ? String(value).slice(0, 16).replace(" ", "T") : "";
}

export default async function AdminStockSeasonPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const [admins]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );
  if (!admins.length || admins[0].role !== "admin") redirect("/");

  const [rows]: any = await db.query(`
    SELECT *,
      DATE_FORMAT(starts_at, '%Y-%m-%d %H:%i:%s') AS starts_at_text,
      DATE_FORMAT(ends_at, '%Y-%m-%d %H:%i:%s') AS ends_at_text,
      DATE_FORMAT(settled_at, '%Y-%m-%d %H:%i:%s') AS settled_at_text
    FROM stock_seasons
    ORDER BY id DESC
    LIMIT 30
  `);

  const current = rows.find((row: any) =>
    ["ready", "active"].includes(String(row.status))
  ) || null;

  const currentSeason = current ? {
    id: Number(current.id),
    seasonNo: Number(current.season_no),
    title: String(current.title || ""),
    status: String(current.status || "ready"),
    startsAt: toLocal(current.starts_at_text),
    endsAt: toLocal(current.ends_at_text),
    currencyName: String(current.currency_name || "주식머니"),
    entryFeeDotori: Number(current.entry_fee_dotori || 0),
    startingMoney: Number(current.starting_money || 0),
    basePrize: Number(current.base_prize || 0),
    entryFeePrize: Number(current.entry_fee_prize || 0),
    includeEntryFeeInPrize: Number(current.include_entry_fee_in_prize || 0) === 1,
    minTradeCount: Number(current.min_trade_count || 0),
    firstPrizeRate: Number(current.first_prize_rate || 0),
    secondPrizeRate: Number(current.second_prize_rate || 0),
    thirdPrizeRate: Number(current.third_prize_rate || 0),
    marketOpenTime: String(current.market_open_time || "10:00:00").slice(0, 5),
    marketCloseTime: String(current.market_close_time || "02:00:00").slice(0, 5),
    priceIntervalMinutes: Number(current.price_interval_minutes || 10),
    virtualTraderEnabled: Number(current.virtual_trader_enabled || 0) === 1,
    virtualTraderCount: Number(current.virtual_trader_count || 0),
    noVirtualTradeChance: Number(current.no_virtual_trade_chance || 0),
    virtualMaxPressureRate: Number(current.virtual_max_pressure_rate || 0),
    realUserMaxPressureRate: Number(current.real_user_max_pressure_rate || 0),
    totalMaxPressureRate: Number(current.total_max_pressure_rate || 0),
    finalDayEnabled: Number(current.final_day_enabled || 0) === 1,
    finalDayHours: Number(current.final_day_hours || 24),
    finalDayVolatilityMultiplier: Number(current.final_day_volatility_multiplier || 1.25),
  } : null;

  const endedSeasons = rows
    .filter((row: any) => String(row.status) === "ended")
    .map((row: any) => ({
      id: Number(row.id),
      seasonNo: Number(row.season_no),
      title: String(row.title || ""),
      totalPrize:
        Number(row.base_prize || 0) +
        Number(row.entry_fee_prize || 0) +
        Number(row.fee_prize || 0),
      winnerNickname: row.winner_nickname ? String(row.winner_nickname) : null,
      winnerProfitRate:
        row.winner_profit_rate === null ? null : Number(row.winner_profit_rate),
      winnerPrizeAmount: Number(row.winner_prize_amount || 0),
      settledAt: String(row.settled_at_text || ""),
    }));

  return (
    <StockSeasonManager
      currentSeason={currentSeason}
      endedSeasons={endedSeasons}
    />
  );
}
