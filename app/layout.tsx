import "./globals.css";
import Providers from "./providers";
import OnlineTracker from "./online-tracker";
import db from "@/lib/db";

async function getSiteLogo() {
  try {
    const [rows]: any = await db.query(
      "SELECT site_logo FROM site_settings LIMIT 1"
    );

    return rows[0]?.site_logo || null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteLogo = await getSiteLogo();

  return (
    <html lang="ko">
      <body>
        <Providers>
          <OnlineTracker />

          <a
            href="/"
            className="fixed left-5 top-5 z-[9999] flex cursor-pointer items-center rounded-2xl bg-black/40 px-4 py-3 shadow-xl backdrop-blur transition hover:scale-[1.03]"
          >
            {siteLogo ? (
              <img
                src={siteLogo}
                alt="왕츄 로고"
                className="h-9 max-w-[150px] object-contain"
              />
            ) : (
              <span className="text-xl font-black text-pink-400">왕츄</span>
            )}
          </a>

          {children}

          <footer className="bg-[#07070c] px-4 py-8 text-center text-xs leading-6 text-zinc-500">
            <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
              <p className="font-bold text-zinc-400">비환금성 포인트 안내</p>
              <p className="mt-2">
                본 사이트의 도토리는 팬 커뮤니티 활동용 비환금성 포인트이며
                현금 가치가 없고 환전, 양도, 거래가 불가능합니다.
              </p>
              <p>
                모든 게임 및 커뮤니티 콘텐츠는 단순 오락과 팬 활동용이며
                실물 보상 및 금전적 가치와 무관합니다.
              </p>
              <p>
                도토리는 운영 정책에 따라 지급, 조정 또는 회수될 수 있습니다.
              </p>

              <div className="mt-3">
                <a
                  href="/terms"
                  className="font-bold text-zinc-300 underline underline-offset-4 hover:text-white"
                >
                  이용약관 및 운영정책 보기
                </a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}