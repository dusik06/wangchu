import { NextResponse } from "next/server";

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const apiKey = process.env.YOUTUBE_API_KEY;
  const liveVideoId = process.env.YOUTUBE_LIVE_VIDEO_ID;

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
    // 0순위: 고정 라이브 영상이 실제 라이브 중인지 확인
    if (liveVideoId) {
      const liveDetail = await fetchJson(
        `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${liveVideoId}&part=snippet,liveStreamingDetails,status`
      );

      const item = liveDetail?.items?.[0];

      const isActuallyLive =
        item?.snippet?.liveBroadcastContent === "live";

      if (item && isActuallyLive) {
        return NextResponse.json({
          isLive: true,
          title: item.snippet?.title || "실시간 방송 중",
          videos: [
            {
              videoId: liveVideoId,
              title: item.snippet?.title || "실시간 방송 중",
            },
          ],
        });
      }
    }

    // 1순위: 현재 실제 라이브 검색
    const liveSearchData = await fetchJson(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&type=video&eventType=live&order=date&maxResults=5`
    );

    const liveItem = liveSearchData?.items?.[0];

    if (liveItem?.id?.videoId) {
      return NextResponse.json({
        isLive: true,
        title: liveItem.snippet?.title || "실시간 방송 중",
        videos: [
          {
            videoId: liveItem.id.videoId,
            title: liveItem.snippet?.title || "실시간 방송 중",
          },
        ],
      });
    }

    // 2순위: 최신 업로드 영상
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