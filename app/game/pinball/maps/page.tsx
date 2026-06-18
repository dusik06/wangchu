import Link from "next/link";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

type PinballMap = {
  id: number;
  map_name: string;
  created_by: string;
  creator_nickname?: string | null;
  created_at: string;
  play_count?: number | null;
};

function formatDate(date: any) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${month}/${day}`;
}

async function getMaps() {
  const [rows]: any = await db.query(
    `
    SELECT id, map_name, created_by, creator_nickname, created_at, play_count
    FROM pinball_maps
    ORDER BY id DESC
    LIMIT 100
    `
  );

  return rows as PinballMap[];
}

export default async function PinballMapsPage() {
  const maps = await getMaps();

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-[1300px]">
        <div className="mb-8 rounded-3xl border border-emerald-400/30 bg-zinc-950 p-8 shadow-[0_0_35px_rgba(52,211,153,0.12)]">
          <p className="mb-3 text-sm font-black text-emerald-400">
            WANGCHU PINBALL MAPS
          </p>
          <h1 className="text-4xl font-black">핀볼 공유맵</h1>
          <p className="mt-4 text-zinc-400">
            저장된 핀볼 맵을 확인하고 원하는 맵을 선택해서 사용할 수 있습니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/game/pinball"
              className="rounded-2xl bg-zinc-800 px-5 py-3 font-black"
            >
              핀볼 메인
            </Link>

            <Link
              href="/admin/pinball-map"
              className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black"
            >
              맵 만들기
            </Link>
          </div>
        </div>

        {maps.length === 0 ? (
          <div className="rounded-3xl bg-zinc-950 p-10 text-center text-zinc-400">
            아직 저장된 맵이 없습니다.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {maps.map((map) => (
              <div
                key={map.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-emerald-400/50 hover:shadow-[0_0_30px_rgba(52,211,153,0.12)]"
              >
                <div className="mb-5 flex h-44 items-center justify-center rounded-2xl border border-dashed border-emerald-400/30 bg-black text-sm text-zinc-500">
                  미리보기 준비중
                </div>

                <div className="mb-2 text-xs font-black text-emerald-400">
                  MAP #{map.id}
                </div>

                <h2 className="mb-3 text-2xl font-black text-white">
                  {map.map_name}
                </h2>

                <div className="space-y-1 text-sm text-zinc-400">
                  <p>
                    제작자:{" "}
                    <span className="text-zinc-200">
                      {map.creator_nickname || map.created_by || "알 수 없음"}
                    </span>
                  </p>
                  <p>저장일: {formatDate(map.created_at)}</p>
                  <p>사용 횟수: {Number(map.play_count || 0).toLocaleString()}</p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Link
                    href={`/game/pinball/draw?mapId=${map.id}`}
                    className="rounded-2xl bg-cyan-400 px-4 py-3 text-center font-black text-black"
                  >
                    추첨 사용
                  </Link>

                  <Link
                    href={`/game/pinball/bet?mapId=${map.id}`}
                    className="rounded-2xl bg-purple-600 px-4 py-3 text-center font-black text-white"
                  >
                    배팅 사용
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}