"use client";

type Video = {
  videoId: string;
};

export default function VideoPlayer({ videos }: { videos: Video[] }) {
  if (!videos || videos.length === 0) {
    return (
      <div className="flex h-full min-h-[540px] items-center justify-center rounded-[28px] bg-black text-zinc-400">
        영상 없음
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] bg-black">
      <iframe
        key={videos[0].videoId}
        className="h-[540px] w-full scale-[1.15] object-cover"
        src={`https://www.youtube.com/embed/${videos[0].videoId}?autoplay=1&mute=1&loop=1&playlist=${videos[0].videoId}`}
        title="왕츄 영상"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    </div>
  );
}