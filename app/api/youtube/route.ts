import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

type YoutubeVideo = {
  videoId: string;
  title: string;
  thumbnail: string;
};

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

function getThumbnail(item: any) {
  return (
    item?.snippet?.thumbnails?.maxres?.url ||
    item?.snippet?.thumbnails?.high?.url ||
    item?.snippet?.thumbnails?.medium?.url ||
    item?.snippet?.thumbnails?.default?.url ||
    ""
  );
}

function parseDurationToSeconds(duration: string) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 999999;

  return (
    Number(match[1] || 0) * 3600 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0)
  );
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

async function detectCurrentLive(apiKey: string, channelId: string) {
  const liveSearchData = await fetchJson(
    `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&type=video&eventType=live&order=date&maxResults=5`
  );

  const liveItems = liveSearchData?.items || [];

  for (const liveItem of liveItems) {
    const videoId = liveItem?.id?.videoId;
    if (!videoId) continue;

    const detailData = await fetchJson(
      `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoId}&part=snippet,liveStreamingDetails,status`
    );

    const item = detailData?.items?.[0];

    if (!item) continue;

    const isPublic = item?.status?.privacyStatus === "public";
    const isEmbeddable = item?.status?.embeddable !== false;

    if (isLiveItem(item) && isPublic && isEmbeddable) {
      return true;
    }
  }

  return false;
}

async function getRecentShorts(apiKey: string, uploadsPlaylistId: string) {
  const playlistData = await fetchJson(
    `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${uploadsPlaylistId}&part=snippet&maxResults=50`
  );

  const playlistItems = playlistData?.items || [];

  const ids = playlistItems
    .map((item: any) => item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  if (ids.length === 0) return [];

  const detailData = await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${ids.join(",")}&part=snippet,contentDetails,status`
  );

  const detailItems = detailData?.items || [];

  return detailItems
    .filter((item: any) => {
      const seconds = parseDurationToSeconds(item.contentDetails?.duration || "");
      const isShortsLength = seconds > 0 && seconds <= 90;
      const isPublic = item?.status?.privacyStatus === "public";
      const isEmbeddable = item?.status?.embeddable !== false;

      return isShortsLength && isPublic && isEmbeddable;
    })
    .map((item: any): YoutubeVideo => ({
      videoId: item.id,
      title: item.snippet?.title || "왕츄 쇼츠",
      thumbnail: getThumbnail(item),
    }))
    .slice(0, 20);
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
      shorts: [],
      liveStatus: "off",
      liveForce: forceState.liveForce,
    });
  }

  const uploadsPlaylistId =
    process.env.YOUTUBE_UPLOADS_PLAYLIST_ID || channelId.replace(/^UC/, "UU");

  try {
    const [shorts, autoDetectedLive] = await Promise.all([
      getRecentShorts(apiKey, uploadsPlaylistId),
      detectCurrentLive(apiKey, channelId),
    ]);

    let finalLiveStatus: "on" | "off" = "off";

    if (forceState.liveForce === "on") {
      finalLiveStatus = "on";
    } else if (forceState.liveForce === "off") {
      finalLiveStatus = "off";
    } else {
      finalLiveStatus = autoDetectedLive ? "on" : "off";
      await saveAutoLiveStatus(finalLiveStatus);
    }

    return NextResponse.json({
      isLive: finalLiveStatus === "on",
      title: shorts[0]?.title || "표시할 쇼츠가 없습니다.",
      videos: shorts,
      shorts,
      liveStatus: finalLiveStatus,
      liveForce: forceState.liveForce,
    });
  } catch (error) {
    console.error("youtube api error:", error);

    return NextResponse.json({
      isLive: forceState.liveStatus === "on",
      title: "유튜브 정보를 불러오지 못했습니다.",
      videos: [],
      shorts: [],
      liveStatus: forceState.liveStatus,
      liveForce: forceState.liveForce,
    });
  }
}