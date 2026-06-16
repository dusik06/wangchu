import { NextResponse } from "next/server";
import db from "@/lib/db";

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

function isLiveItem(item: any) {
  const liveBroadcastContent = item?.snippet?.liveBroadcastContent;
  const actualStartTime = item?.liveStreamingDetails?.actualStartTime;
  const actualEndTime = item?.liveStreamingDetails?.actualEndTime;

  return liveBroadcastContent === "live" || (!!actualStartTime && !actualEndTime);
}

async function getLiveForce() {
  const [rows]: any = await db.query(
    "SELECT live_status, live_force FROM site_settings LIMIT 1"
  );

  return {
    liveStatus: rows[0]?.live_status || "off",
    liveForce: rows[0]?.live_force || "auto",
  };
}

async function saveAutoLiveStatus(status: "on" | "off") {
  await db.query(
    "UPDATE site_settings SET live_status = ? WHERE live_force = 'auto' LIMIT 1",
    [status]
  );
}

export async function GET() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const apiKey = process.env.YOUTUBE_API_KEY;

  const forceState = await getLiveForce();

  if (!channelId || !apiKey) {
    return NextResponse.json({
      isLive: false,
      title: "유튜브 설정이 없습니다.",
      videos: [],
      liveStatus: "off",
      liveForce: "auto",
    });
  }

  const uploadsPlaylistId =
    process.env.YOUTUBE_UPLOADS_PLAYLIST_ID || channelId.replace(/^UC/, "UU");

  try {
    const liveSearchData = await fetchJson(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&type=video&eventType=live&order=date&maxResults=5`
    );

    const liveItems = liveSearchData?.items || [];

    for (const liveItem of liveItems) {
      if (!liveItem?.id?.videoId) continue;

      const liveDetail = await fetchJson(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${liveItem.id.videoId}&part=snippet,liveStreamingDetails,status`
      );

      const item = liveDetail?.items?.[0];

      if (item && isLiveItem(item)) {
        if (forceState.liveForce === "auto") {
          await saveAutoLiveStatus("on");
        }

        return NextResponse.json({
          isLive: true,
          title: item.snippet?.title || "실시간 방송 중",
          videos: [
            {
              videoId: liveItem.id.videoId,
              title: item.snippet?.title || "실시간 방송 중",
              thumbnail:
                item.snippet?.thumbnails?.maxres?.url ||
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.default?.url ||
                "",
            },
          ],
          liveStatus: "on",
          liveForce: forceState.liveForce,
        });
      }
    }

    if (forceState.liveForce === "auto") {
      await saveAutoLiveStatus("off");
    }

    const playlistData = await fetchJson(
      `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${uploadsPlaylistId}&part=snippet&maxResults=10`
    );

    const videos =
      playlistData?.items
        ?.map((item: any) => ({
          videoId: item.snippet?.resourceId?.videoId,
          title: item.snippet?.title,
          thumbnail:
            item.snippet?.thumbnails?.maxres?.url ||
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            "",
        }))
        .filter((video: any) => video.videoId) || [];

    return NextResponse.json({
      isLive: forceState.liveStatus === "on",
      title: videos[0]?.title || "표시할 영상이 없습니다.",
      videos,
      liveStatus: forceState.liveStatus,
      liveForce: forceState.liveForce,
    });
  } catch {
    return NextResponse.json({
      isLive: forceState.liveStatus === "on",
      title: "유튜브 정보를 불러오지 못했습니다.",
      videos: [],
      liveStatus: forceState.liveStatus,
      liveForce: forceState.liveForce,
    });
  }
}

D:\wangchu\frontend\components\home\ShortsSlider.tsx

"use client";

import { useMemo, useState } from "react";

type ShortVideo = {
  videoId: string;
  title: string;
  thumbnail?: string;
};

export default function ShortsSlider({ videos }: { videos: ShortVideo[] }) {
  const shorts = useMemo(() => videos.slice(0, 10), [videos]);
  const [start, setStart] = useState(0);

  const visible = shorts.slice(start, start + 3);

  function prev() {
    setStart((value) => Math.max(0, value - 1));
  }

  function next() {
    setStart((value) => Math.min(Math.max(shorts.length - 3, 0), value + 1));
  }

  if (shorts.length === 0) {
    return (
      <div className="rounded-2xl border border-[#3b321f] bg-[#11131b] p-5 text-sm text-zinc-400">
        최근 쇼츠를 불러오는 중입니다.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#3b321f] bg-[#0d1018] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-black text-[#f7d36b]">최근 쇼츠</h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={start === 0}
            className="h-8 w-8 rounded-full border border-[#4b3d24] bg-[#151925] text-[#f7d36b] disabled:opacity-30"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={next}
            disabled={start + 3 >= shorts.length}
            className="h-8 w-8 rounded-full border border-[#4b3d24] bg-[#151925] text-[#f7d36b] disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {visible.map((item) => (
          <a
            key={item.videoId}
            href={`https://www.youtube.com/watch?v=${item.videoId}`}
            target="_blank"
            className="group overflow-hidden rounded-2xl border border-[#2c2f3a] bg-[#151925]"
          >
            <div className="aspect-[9/16] bg-black">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl">
                  ▶
                </div>
              )}
            </div>

            <p className="line-clamp-2 min-h-[42px] px-3 py-2 text-xs font-bold text-zinc-200">
              {item.title}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}