import db from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import CommentForm from "./comment-form";
import VoteButtons from "./vote-buttons";
import ReportButton from "./report-button";
import AdminDeleteButton from "./admin-delete-button";
import CommentDeleteButton from "./comment-delete-button";
import CommentEditButton from "./comment-edit-button";
import ImageDeleteButton from "./image-delete-button";
import BlindToggleButton from "./blind-toggle-button";
import MoveCategory from "./move-category";

export const dynamic = "force-dynamic";

const categoryMap: Record<string, string> = {
  free: "자유게시판",
  notice: "공지사항",
  suggestion: "건의사항",
  from_wangchu: "왕츄가 팬한테",
  to_wangchu: "팬이 왕츄한테",
};

function formatKst(date: any) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(/\. /g, ".")
    .replace(/\.$/, "")
    .replace(/, /, " ");
}

function ProfileImage({ src, small = false }: { src?: string | null; small?: boolean }) {
  return (
    <div className={`${small ? "h-8 w-8" : "h-10 w-10"} shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800`}>
      {src ? (
        <img src={src} alt="프로필" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-base">🐿️</div>
      )}
    </div>
  );
}

export default async function FreeBoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const session = await getServerSession();
  const postId = Number(resolvedParams.id);

  if (!postId) notFound();

  let currentUser: any = null;

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT id, role FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );
    if (users.length) currentUser = users[0];
  }

  await db.query("UPDATE community_posts SET views = views + 1 WHERE id = ?", [postId]);

  const [posts]: any = await db.query(
    `
    SELECT 
      p.id, p.user_id, p.title, p.content, p.views, p.likes, p.dislikes,
      p.reports, p.is_notice, p.is_blind, p.category, p.created_at,
      u.nickname, u.role, u.profile_image, u.image
    FROM community_posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
    LIMIT 1
    `,
    [postId]
  );

  if (!posts.length) notFound();

  const post = posts[0];
  const isOwner = currentUser?.id === post.user_id;
  const isAdmin = currentUser?.role === "admin";

  if (post.is_blind && !isAdmin) notFound();

  const [images]: any = await db.query(
    "SELECT id, image_url FROM post_images WHERE post_id = ? ORDER BY id ASC",
    [postId]
  );

  const [comments]: any = await db.query(
    `
    SELECT 
      c.id, c.user_id, c.content, c.parent_id, c.created_at,
      u.nickname, u.role, u.profile_image, u.image
    FROM community_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.id ASC
    `,
    [postId]
  );

  const parentComments = comments.filter((comment: any) => !comment.parent_id);

  return (
    <main className="min-h-screen bg-[#0b0718] text-white">
      <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
          <a
            href={`/board/free?category=${post.category}`}
            className="inline-flex items-center gap-1 text-sm font-black text-purple-300 hover:text-purple-200"
          >
            ‹ {categoryMap[post.category] || "자유게시판"}
          </a>
          <a
            href={`/board/free?category=${post.category}`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-200"
          >
            목록
          </a>
        </div>

        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#151027] shadow-2xl sm:rounded-3xl">
          <header className="border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {post.is_notice ? (
                <span className="rounded-md bg-amber-400 px-2 py-1 text-[11px] font-black text-black">공지</span>
              ) : null}
              {post.is_blind ? (
                <span className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-black text-white">블라인드</span>
              ) : null}
              <span className="text-xs font-bold text-zinc-500">{categoryMap[post.category]}</span>
            </div>

            <h1 className="break-words text-xl font-black leading-snug text-white sm:text-2xl">{post.title}</h1>

            <div className="mt-4 flex items-center gap-3">
              <ProfileImage src={post.profile_image || post.image} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  {post.role === "admin" ? (
                    <span className="shrink-0 rounded-md bg-purple-600 px-2 py-0.5 text-[11px] font-black text-white">관리자</span>
                  ) : null}
                  <span className="truncate text-sm font-black text-zinc-100">{post.nickname}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span>{formatKst(post.created_at)}</span>
                  <span>조회 {post.views}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <div className="min-h-[160px] whitespace-pre-wrap break-words text-[15px] leading-7 text-zinc-100 sm:min-h-[200px] sm:text-base sm:leading-8">
              {post.content}
            </div>

            {images.length > 0 ? (
              <div className="mt-6 space-y-4">
                {images.map((image: any) => (
                  <div key={image.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                    <img
                      src={image.image_url}
                      alt="첨부 이미지 또는 GIF"
                      className="mx-auto block h-auto max-h-[75vh] w-auto max-w-full object-contain"
                    />
                    {isOwner || isAdmin ? (
                      <div className="border-t border-white/10 p-2">
                        <ImageDeleteButton imageId={image.id} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/10 px-4 py-4 sm:px-6">
            <VoteButtons postId={postId} />
            <ReportButton postId={postId} />
            <span className="ml-auto hidden text-xs text-zinc-600 sm:inline">추천 {post.likes} · 비추천 {post.dislikes}</span>
          </div>

          {(isOwner || isAdmin) && (
            <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3 sm:px-6">
              <a
                href={`/board/free/${postId}/edit`}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-200"
              >
                수정
              </a>
              {isAdmin ? (
                <>
                  <AdminDeleteButton postId={postId} />
                  <BlindToggleButton postId={postId} isBlind={post.is_blind} />
                  <MoveCategory postId={postId} currentCategory={post.category} />
                </>
              ) : null}
            </div>
          )}
        </article>

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#151027] shadow-xl sm:mt-6 sm:rounded-3xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
            <h2 className="text-base font-black sm:text-lg">댓글 <span className="text-purple-300">{comments.length}</span></h2>
            <span className="text-xs text-zinc-500">서로 존중하는 댓글을 남겨주세요.</span>
          </div>

          <div className="divide-y divide-white/[0.07]">
            {parentComments.map((comment: any) => {
              const replies = comments.filter((reply: any) => reply.parent_id === comment.id);
              const canManageComment = currentUser && (currentUser.id === comment.user_id || currentUser.role === "admin");

              return (
                <div key={comment.id} className="px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex gap-3">
                    <ProfileImage src={comment.profile_image || comment.image} small />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-zinc-100">{comment.nickname}</span>
                        {comment.role === "admin" ? (
                          <span className="rounded bg-purple-600/90 px-1.5 py-0.5 text-[10px] font-black text-white">관리자</span>
                        ) : null}
                      </div>

                      <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-6 text-zinc-200 sm:text-[15px]">{comment.content}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                        <span className="mr-1">{formatKst(comment.created_at)}</span>
                        <CommentForm postId={postId} parentId={comment.id} />
                        {canManageComment ? (
                          <>
                            <CommentEditButton commentId={comment.id} defaultContent={comment.content} />
                            <CommentDeleteButton commentId={comment.id} />
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {replies.length > 0 ? (
                    <div className="mt-4 space-y-1 rounded-2xl bg-white/[0.035] px-3 sm:ml-11 sm:px-4">
                      {replies.map((reply: any) => {
                        const canManageReply = currentUser && (currentUser.id === reply.user_id || currentUser.role === "admin");
                        return (
                          <div key={reply.id} className="flex gap-3 border-b border-white/[0.06] py-4 last:border-b-0">
                            <span className="pt-1 text-sm text-purple-400">↳</span>
                            <ProfileImage src={reply.profile_image || reply.image} small />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-zinc-100">{reply.nickname}</span>
                                {reply.role === "admin" ? (
                                  <span className="rounded bg-purple-600/90 px-1.5 py-0.5 text-[10px] font-black text-white">관리자</span>
                                ) : null}
                              </div>
                              <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-6 text-zinc-300">{reply.content}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                                <span className="mr-1">{formatKst(reply.created_at)}</span>
                                {canManageReply ? (
                                  <>
                                    <CommentEditButton commentId={reply.id} defaultContent={reply.content} />
                                    <CommentDeleteButton commentId={reply.id} />
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {comments.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-500">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</div>
            ) : null}
          </div>

          <div className="border-t border-white/10 bg-black/10 p-3 sm:p-4">
            <CommentForm postId={postId} />
          </div>
        </section>
      </div>
    </main>
  );
}
