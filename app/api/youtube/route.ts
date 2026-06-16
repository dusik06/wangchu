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
    // 라이브 검색
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
            },
          ],
          liveStatus:
            forceState.liveForce === "on" ? "on" : "on",
          liveForce: forceState.liveForce,
        });
      }
    }

    // 라이브 없으면 OFF
    if (forceState.liveForce === "auto") {
      await saveAutoLiveStatus("off");
    }

    // 최근 업로드 영상
    const playlistData = await fetchJson(
      `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${uploadsPlaylistId}&part=snippet&maxResults=10`
    );

    const videos =
      playlistData?.items
        ?.map((item: any) => ({
          videoId: item.snippet?.resourceId?.videoId,
          title: item.snippet?.title,
        }))
        .filter((video: any) => video.videoId) || [];

    return NextResponse.json({
      isLive: forceState.liveStatus === "on",
      title: videos[0]?.title || "표시할 영상이 없습니다.",
      videos,
      liveStatus: forceState.liveStatus,
      liveForce: forceState.liveForce,
    });
  } catch (error: any) {
    return NextResponse.json({
      isLive: forceState.liveStatus === "on",
      title: "유튜브 정보를 불러오지 못했습니다.",
      videos: [],
      liveStatus: forceState.liveStatus,
      liveForce: forceState.liveForce,
    });
  }
}