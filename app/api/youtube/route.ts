import { NextResponse } from "next/server";
import db from "@/lib/db";

const FALLBACK_LIVE_VIDEO_ID = "P9fMwfGrucU";

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

async function getVideoDetail(apiKey: string, videoId: string) {
  const data = await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoId}&part=snippet,liveStreamingDetails,status,contentDetails`
  );

  const item = data?.items?.[0];

  if (!item) {
    return {
      videoId,
      title: "박왕츄 공식 방송",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    };
  }

  return {
    videoId,
    title: item.snippet?.title || "박왕츄 공식 방송",
    thumbnail: getThumbnail(item),
  };
}

async function getCurrentLiveVideo(apiKey: string, channelId: string) {
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
      return {
        videoId: liveItem.id.videoId,
        title: item.snippet?.title || "실시간 방송 중",
        thumbnail: getThumbnail(item),
      };
    }
  }

  return null;
}

async function getRecentShorts(apiKey: string, uploadsPlaylistId: string) {
  const playlistData = await fetchJson(
    `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${uploadsPlaylistId}&part=snippet&maxResults=30`
  );

  const playlistItems = playlistData?.items || [];
  const ids = playlistItems
    .map((item: any) => item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  if (ids.length === 0) return [];

  const detailData = await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${ids.join(",")}&part=snippet,contentDetails`
  );

  const detailItems = detailData?.items || [];

  return detailItems
    .filter((item: any) => {
      const seconds = parseDurationToSeconds(item.contentDetails?.duration || "");
      return seconds <= 90;
    })
    .map((item: any) => ({
      videoId: item.id,
      title: item.snippet?.title || "왕츄 쇼츠",
      thumbnail: getThumbnail(item),
    }))
    .slice(0, 10);
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
    const shorts = await getRecentShorts(apiKey, uploadsPlaylistId);

    if (forceState.liveForce === "off") {
      return NextResponse.json({
        isLive: false,
        title: shorts[0]?.title || "표시할 쇼츠가 없습니다.",
        videos: shorts,
        shorts,
        liveStatus: "off",
        liveForce: "off",
      });
    }

    const detectedLiveVideo = await getCurrentLiveVideo(apiKey, channelId);

    if (forceState.liveForce === "on") {
      const liveVideo =
        detectedLiveVideo || (await getVideoDetail(apiKey, FALLBACK_LIVE_VIDEO_ID));

      return NextResponse.json({
        isLive: true,
        title: liveVideo.title,
        videos: [liveVideo],
        shorts,
        liveStatus: "on",
        liveForce: "on",
      });
    }

    if (detectedLiveVideo) {
      await saveAutoLiveStatus("on");

      return NextResponse.json({
        isLive: true,
        title: detectedLiveVideo.title,
        videos: [detectedLiveVideo],
        shorts,
        liveStatus: "on",
        liveForce: "auto",
      });
    }

    await saveAutoLiveStatus("off");

    return NextResponse.json({
      isLive: false,
      title: shorts[0]?.title || "표시할 쇼츠가 없습니다.",
      videos: shorts,
      shorts,
      liveStatus: "off",
      liveForce: "auto",
    });
  } catch {
    return NextResponse.json({
      isLive: false,
      title: "유튜브 정보를 불러오지 못했습니다.",
      videos: [],
      shorts: [],
      liveStatus: forceState.liveStatus,
      liveForce: forceState.liveForce,
    });
  }
}