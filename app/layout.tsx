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
        </Providers>
      </body>
    </html>
  );
}