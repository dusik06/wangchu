"use client";

import { usePathname } from "next/navigation";

export default function GlobalHomeLogo({
  siteLogo,
}: {
  siteLogo: string | null;
}) {
  const pathname = usePathname();

  if (pathname === "/" || pathname.startsWith("/overlay")) {
    return null;
  }

  return (
    <>
      <a
        href="/"
        aria-label="메인으로"
        className="fixed bottom-4 left-4 z-[9999] flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-sm font-black text-white shadow-2xl backdrop-blur-md transition active:scale-95 sm:bottom-5 sm:left-5"
      >
        <span className="text-lg">⌂</span>
        <span>메인으로</span>
      </a>

      <a
        href="/"
        className="fixed left-5 top-5 z-[9998] hidden cursor-pointer items-center rounded-2xl bg-black/40 px-4 py-3 shadow-xl backdrop-blur transition hover:scale-[1.03] md:flex"
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
    </>
  );
}
