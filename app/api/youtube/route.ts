import { NextResponse } from "next/server";

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

function isLiveItem(item: any) {
  const liveBroadcastContent = item?.snippet?.liveBroadcastContent;
  const actualStartTime = item?.liveStreamingDetails?.actualStartTime;
  const actualEndTime = item?.liveStreamingDetails?.actualEndTime;

  return (
    liveBroadcastContent === "live" ||
    (!!actualStartTime && !actualEndTime)
  );
}

export async function GET() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!channelId || !apiKey) {
    return NextResponse.json({
      isLive: false,
      title: "유튜브 설정이 없습니다.",
      videos: [],
    });
  }

  const uploadsPlaylistId =
    process.env.YOUTUBE_UPLOADS_PLAYLIST_ID || channelId.replace(/^UC/, "UU");

  try {
    // 현재 라이브 자동 탐지
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
        return NextResponse.json({
          isLive: true,
          title: item.snippet?.title || "실시간 방송 중",
          videos: [
            {
              videoId: liveItem.id.videoId,
              title: item.snippet?.title || "실시간 방송 중",
            },
          ],
        });
      }
    }

    // 라이브 없으면 최근 업로드
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
      isLive: false,
      title: videos[0]?.title || "표시할 영상이 없습니다.",
      videos,
    });
  } catch (error: any) {
    return NextResponse.json({
      isLive: false,
      title: error.message || "유튜브 정보를 불러오지 못했습니다.",
      videos: [],
    });
  }
}