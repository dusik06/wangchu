export const GAME_BET_MAX = 10000;

type QueryConnection = {
  query: (sql: string, values?: any[]) => Promise<any>;
};

export async function getMartingaleLimit(
  connection: QueryConnection,
  userId: number | string,
  userEmail: string
): Promise<number | null> {
  const [rows]: any = await connection.query(
    `
    SELECT bet_amount, is_loss
    FROM (
      SELECT bet_amount,
             CASE WHEN status IN ('LOSE', 'DOUBLE_FAIL') THEN 1 ELSE 0 END AS is_loss,
             COALESCE(completed_at, created_at) AS played_at
      FROM dice_game_logs
      WHERE user_id = ? AND status <> 'PENDING_CHOICE'

      UNION ALL

      SELECT bet_amount,
             CASE WHEN is_win = 0 THEN 1 ELSE 0 END AS is_loss,
             created_at AS played_at
      FROM ladder_game_logs
      WHERE user_id = ?

      UNION ALL

      SELECT bet_amount,
             CASE WHEN is_win = 0 THEN 1 ELSE 0 END AS is_loss,
             created_at AS played_at
      FROM pinball_game_logs
      WHERE user_email = ?

      UNION ALL

      SELECT bet_amount,
             CASE WHEN status = 'lost' THEN 1 ELSE 0 END AS is_loss,
             COALESCE(ended_at, created_at) AS played_at
      FROM updown_game_sessions
      WHERE user_id = ? AND status <> 'active'

      UNION ALL

      SELECT bet_amount,
             CASE WHEN status = 'lose' THEN 1 ELSE 0 END AS is_loss,
             settled_at AS played_at
      FROM dog_race_bets
      WHERE user_id = ?
    ) AS recent_game
    ORDER BY played_at DESC
    LIMIT 1
    `,
    [userId, userId, userEmail, userId, userId]
  );

  if (!rows?.length || Number(rows[0].is_loss) !== 1) {
    return null;
  }

  const lastLostBet = Math.floor(Number(rows[0].bet_amount || 0));
  return lastLostBet > 0 ? Math.min(lastLostBet, GAME_BET_MAX) : null;
}

export async function validateGameBet(
  connection: QueryConnection,
  params: {
    userId: number | string;
    userEmail: string;
    betAmount: number;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const betAmount = Math.floor(Number(params.betAmount));

  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    return { ok: false, message: '배팅 도토리를 정확히 입력해주세요.' };
  }

  if (betAmount > GAME_BET_MAX) {
    return {
      ok: false,
      message: `한 번에 최대 ${GAME_BET_MAX.toLocaleString()}도토리까지 배팅할 수 있습니다.`,
    };
  }

  const martingaleLimit = await getMartingaleLimit(
    connection,
    params.userId,
    params.userEmail
  );

  if (martingaleLimit !== null && betAmount > martingaleLimit) {
    return {
      ok: false,
      message: `마틴배팅 방지: 직전 패배 배팅 ${martingaleLimit.toLocaleString()}도토리보다 금액을 올릴 수 없습니다.`,
    };
  }

  return { ok: true };
}
