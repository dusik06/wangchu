"use client";

import { usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

export default function FloatingHeaderButtons({
  siteLogo,
}: {
  siteLogo: string | null;
}) {
  const pathname = usePathname();

  if (
    pathname.startsWith("/overlay") ||
    pathname === "/admin/overlay-control"
  ) {
    return null;
  }

  return (
    <div className="fixed left-5 top-5 z-[9999] flex items-center gap-3">
      <a
        href="/"
        className="flex cursor-pointer items-center rounded-2xl bg-black/40 px-4 py-3 shadow-xl backdrop-blur transition hover:scale-[1.03]"
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

      <NotificationBell />
    </div>
  );
}