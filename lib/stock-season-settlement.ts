type SettlementWinner = {
  rank: number;
  userId: number;
  nickname: string;
  profitRate: number;
  prizeRate: number;
  prizeAmount: number;
};

export type StockSeasonSettlementResult = {
  settled: boolean;
  seasonId: number;
  totalPrize: number;
  participantCount: number;
  qualifiedParticipantCount: number;
  winners: SettlementWinner[];
};

function toInteger(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundRate(value: number) {
  return Number(value.toFixed(4));
}

export async function settleStockSeason(
  connection: any,
  season: any,
  now: string
): Promise<StockSeasonSettlementResult> {
  const seasonId = Number(season.id);

  const [existingRewardRows]: any = await connection.query(
    `
    SELECT COUNT(*) AS reward_count
    FROM stock_season_rewards
    WHERE season_id = ?
    `,
    [seasonId]
  );

  if (
    String(season.status) === "ended" ||
    toInteger(existingRewardRows[0]?.reward_count) > 0
  ) {
    return {
      settled: false,
      seasonId,
      totalPrize:
        toInteger(season.base_prize) +
        toInteger(season.entry_fee_prize),
      participantCount: 0,
      qualifiedParticipantCount: 0,
      winners: [],
    };
  }

  const [participantRows]: any = await connection.query(
    `
    SELECT
      p.*,
      u.nickname,
      u.role
    FROM stock_season_participants p
    INNER JOIN users u
      ON u.id = p.user_id
    WHERE p.season_id = ?
    ORDER BY p.id ASC
    FOR UPDATE
    `,
    [seasonId]
  );

  const calculatedParticipants: Array<{
    participantId: number;
    userId: number;
    nickname: string;
    tradeCount: number;
    totalAsset: number;
    profitRate: number;
    qualified: boolean;
  }> = [];

  for (const participant of participantRows) {
    const [holdingRows]: any = await connection.query(
      `
      SELECT
        h.id,
        h.quantity,
        h.total_buy_amount,
        s.current_price
      FROM stock_season_holdings h
      INNER JOIN stock_items s
        ON s.id = h.stock_id
      WHERE h.season_id = ?
        AND h.participant_id = ?
        AND h.quantity > 0
      FOR UPDATE
      `,
      [seasonId, participant.id]
    );

    let holdingValue = 0;

    for (const holding of holdingRows) {
      const quantity = toInteger(holding.quantity);
      const totalBuyAmount = toInteger(holding.total_buy_amount);
      const currentPrice = Math.max(0, toInteger(holding.current_price));

      const currentValue = quantity * currentPrice;
      const holdingProfitAmount = currentValue - totalBuyAmount;
      const holdingProfitRate =
        totalBuyAmount > 0
          ? (holdingProfitAmount / totalBuyAmount) * 100
          : 0;

      holdingValue += currentValue;

      await connection.query(
        `
        UPDATE stock_season_holdings
        SET current_value = ?,
            profit_amount = ?,
            profit_rate = ?,
            updated_at = ?
        WHERE id = ?
          AND season_id = ?
        `,
        [
          currentValue,
          holdingProfitAmount,
          holdingProfitRate,
          now,
          holding.id,
          seasonId,
        ]
      );
    }

    const startingMoney = Math.max(1, toInteger(participant.starting_money));
    const availableMoney = Math.max(0, toInteger(participant.available_money));
    const totalAsset = availableMoney + holdingValue;
    const profitAmount = totalAsset - startingMoney;
    const profitRate = (profitAmount / startingMoney) * 100;
    const tradeCount = toInteger(participant.trade_count);

    const qualified =
      tradeCount >= Math.max(0, toInteger(season.min_trade_count));

    await connection.query(
      `
      UPDATE stock_season_participants
      SET current_holding_value = ?,
          current_total_asset = ?,
          current_profit_amount = ?,
          current_profit_rate = ?,
          is_reward_qualified = ?,
          final_holding_value = ?,
          final_total_asset = ?,
          final_profit_amount = ?,
          final_profit_rate = ?,
          updated_at = ?
      WHERE id = ?
        AND season_id = ?
      `,
      [
        holdingValue,
        totalAsset,
        profitAmount,
        profitRate,
        qualified ? 1 : 0,
        holdingValue,
        totalAsset,
        profitAmount,
        profitRate,
        now,
        participant.id,
        seasonId,
      ]
    );

    calculatedParticipants.push({
      participantId: Number(participant.id),
      userId: Number(participant.user_id),
      nickname: String(
        participant.nickname_snapshot ||
          participant.nickname ||
          "닉네임없음"
      ),
      tradeCount,
      totalAsset,
      profitRate: roundRate(profitRate),
      qualified,
    });
  }

  const qualifiedRanking = calculatedParticipants
    .filter((participant) => participant.qualified)
    .sort((first, second) => {
      if (second.profitRate !== first.profitRate) {
        return second.profitRate - first.profitRate;
      }

      if (second.totalAsset !== first.totalAsset) {
        return second.totalAsset - first.totalAsset;
      }

      if (first.tradeCount !== second.tradeCount) {
        return first.tradeCount - second.tradeCount;
      }

      return first.participantId - second.participantId;
    });

  const totalPrize =
    toInteger(season.base_prize) +
    toInteger(season.entry_fee_prize);

  const prizeRates = [
    toNumber(season.first_prize_rate),
    toNumber(season.second_prize_rate),
    toNumber(season.third_prize_rate),
  ];

  const winners = qualifiedRanking.slice(0, 3).map((participant, index) => ({
    ...participant,
    rank: index + 1,
    prizeRate: prizeRates[index] || 0,
    prizeAmount: Math.floor(
      (totalPrize * (prizeRates[index] || 0)) / 100
    ),
  }));

  const distributedPrize = winners.reduce(
    (sum, winner) => sum + winner.prizeAmount,
    0
  );

  if (winners.length > 0 && totalPrize > distributedPrize) {
    winners[0].prizeAmount += totalPrize - distributedPrize;
  }

  for (let index = 0; index < qualifiedRanking.length; index++) {
    const participant = qualifiedRanking[index];
    const winner = winners.find(
      (item) => item.participantId === participant.participantId
    );

    await connection.query(
      `
      UPDATE stock_season_participants
      SET final_rank = ?,
          prize_amount = ?,
          updated_at = ?
      WHERE id = ?
        AND season_id = ?
      `,
      [
        index + 1,
        winner ? winner.prizeAmount : 0,
        now,
        participant.participantId,
        seasonId,
      ]
    );
  }

  for (const participant of calculatedParticipants) {
    if (participant.qualified) {
      continue;
    }

    await connection.query(
      `
      UPDATE stock_season_participants
      SET final_rank = NULL,
          prize_amount = 0,
          updated_at = ?
      WHERE id = ?
        AND season_id = ?
      `,
      [now, participant.participantId, seasonId]
    );
  }

  for (const winner of winners) {
    if (winner.prizeAmount > 0) {
      await connection.query(
        `
        UPDATE users
        SET dotori = dotori + ?
        WHERE id = ?
        `,
        [winner.prizeAmount, winner.userId]
      );

      await connection.query(
        `
        INSERT INTO dotori_logs
        (
          user_id,
          amount,
          reason
        )
        VALUES (?, ?, ?)
        `,
        [
          winner.userId,
          winner.prizeAmount,
          `주식 ${season.title} ${winner.rank}등 보상`,
        ]
      );
    }

    await connection.query(
      `
      INSERT INTO stock_season_rewards
      (
        season_id,
        user_id,
        nickname_snapshot,
        rank_no,
        profit_rate,
        prize_rate,
        prize_amount,
        paid_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        seasonId,
        winner.userId,
        winner.nickname,
        winner.rank,
        winner.profitRate,
        winner.prizeRate,
        winner.prizeAmount,
        now,
      ]
    );
  }

  const firstWinner = winners[0] || null;

  await connection.query(
    `
    UPDATE stock_seasons
    SET status = 'ended',
        settled_at = ?,
        winner_user_id = ?,
        winner_nickname = ?,
        winner_profit_rate = ?,
        winner_prize_amount = ?,
        updated_at = ?
    WHERE id = ?
      AND status IN ('ready', 'active')
    `,
    [
      now,
      firstWinner ? firstWinner.userId : null,
      firstWinner ? firstWinner.nickname : null,
      firstWinner ? firstWinner.profitRate : null,
      firstWinner ? firstWinner.prizeAmount : 0,
      now,
      seasonId,
    ]
  );

  await connection.query(
    `
    UPDATE stock_virtual_traders
    SET is_active = 0,
        updated_at = ?
    WHERE season_id = ?
    `,
    [now, seasonId]
  );

  return {
    settled: true,
    seasonId,
    totalPrize,
    participantCount: calculatedParticipants.length,
    qualifiedParticipantCount: qualifiedRanking.length,
    winners: winners.map((winner) => ({
      rank: winner.rank,
      userId: winner.userId,
      nickname: winner.nickname,
      profitRate: winner.profitRate,
      prizeRate: winner.prizeRate,
      prizeAmount: winner.prizeAmount,
    })),
  };
}
