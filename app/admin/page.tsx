import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { redirect } from "next/navigation";

async function getSiteLogo() {
  const [rows]: any = await db.query(
    "SELECT site_logo FROM site_settings LIMIT 1"
  );

  return rows[0]?.site_logo || null;
}

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const [rows]: any = await db.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!rows.length || rows[0].role !== "admin") {
    redirect("/");
  }

  const siteLogo = await getSiteLogo();

  const [userCountRows]: any = await db.query(
    "SELECT COUNT(*) AS count FROM users"
  );

  const [couponRows]: any = await db.query(
    "SELECT COUNT(*) AS count FROM coupons"
  );

  const [attendanceRows]: any = await db.query(
    "SELECT COUNT(*) AS count FROM attendance WHERE attendance_date = CURDATE()"
  );

  const [dotoriRows]: any = await db.query(
    "SELECT IFNULL(SUM(amount), 0) AS total FROM dotori_logs"
  );

  const [diceRows]: any = await db.query(
    "SELECT COUNT(*) AS count FROM dice_game_logs"
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-8 flex items-center justify-between">
          <a href="/" className="cursor-pointer flex items-center gap-3">
            {siteLogo ? (
              <img
                src={siteLogo}
                alt="왕츄 로고"
                className="h-10 max-w-[170px] object-contain"
              />
            ) : (
              <span className="text-2xl font-black text-pink-400">
                왕츄 관리자
              </span>
            )}
          </a>

          <a
            href="/"
            className="cursor-pointer rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold transition hover:bg-slate-700"
          >
            메인 홈페이지로 이동
          </a>
        </header>

        <div className="mb-8 grid gap-5 md:grid-cols-5">
          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-gray-400">전체 회원</p>
            <h2 className="mt-2 text-3xl font-bold">{userCountRows[0].count}명</h2>
          </div>

          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-gray-400">오늘 출석</p>
            <h2 className="mt-2 text-3xl font-bold">{attendanceRows[0].count}명</h2>
          </div>

          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-gray-400">쿠폰 수</p>
            <h2 className="mt-2 text-3xl font-bold">{couponRows[0].count}개</h2>
          </div>

          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-gray-400">총 도토리 지급</p>
            <h2 className="mt-2 text-3xl font-bold">
              {Number(dotoriRows[0].total).toLocaleString()}개
            </h2>
          </div>

          <div className="rounded-xl bg-slate-800 p-5">
            <p className="text-gray-400">주사위 게임</p>
            <h2 className="mt-2 text-3xl font-bold">{diceRows[0].count}건</h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <a className="cursor-pointer rounded-xl bg-purple-600 p-6 font-bold hover:bg-purple-500" href="/admin/users">
            회원 관리
          </a>

          <a className="cursor-pointer rounded-xl bg-pink-500 p-6 font-bold hover:bg-pink-400" href="/admin/dotori">
            도토리 지급
          </a>

          <a className="cursor-pointer rounded-xl bg-cyan-500 p-6 font-bold text-slate-950 hover:bg-cyan-400" href="/admin/shop">
            🛒 아이템 생성
          </a>

          <a className="cursor-pointer rounded-xl bg-green-500 p-6 font-bold text-slate-950 hover:bg-green-400" href="/admin/live-status">
            🔴 라이브 상태 관리
          </a>

          <a className="cursor-pointer rounded-xl bg-yellow-500 p-6 font-bold text-slate-950 hover:bg-yellow-400" href="/admin/game">
            🎲 게임 기록 관리
          </a>

          <a className="cursor-pointer rounded-xl bg-indigo-500 p-6 font-bold hover:bg-indigo-400" href="/admin/prediction">
            📊 승패 예측 생성
          </a>

          <a className="cursor-pointer rounded-xl bg-orange-500 p-6 font-bold hover:bg-orange-400" href="/admin/prediction/settle">
            💰 예측 결과 정산
          </a>

          <a className="cursor-pointer rounded-xl bg-emerald-500 p-6 font-bold text-slate-950 hover:bg-emerald-400" href="/admin/site-logo">
            🖼️ 사이트 로고 설정
          </a>

          <a className="cursor-pointer rounded-xl bg-slate-800 p-6 font-bold hover:bg-slate-700" href="/admin/coupons">
            쿠폰 관리
          </a>
        </div>
      </div>
    </main>
  );
}