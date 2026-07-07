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
  );
}