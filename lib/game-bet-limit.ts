export const GAME_BET_MAX = 10000;

type QueryConnection = {
  query: (sql: string, values?: any[]) => Promise<any>;
};

export async function validateGameBet(
  _connection: QueryConnection,
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

  return { ok: true };
}
