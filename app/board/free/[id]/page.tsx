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

export const dynamic = "force-dynamic";

function formatMonthDay(date: any) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

function ProfileImage({ src }: { src?: string | null }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-700">
      {src ? (
        <img
          src={src}
          alt="프로필"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg">
          🐿️
        </div>
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

  if (!postId) {
    notFound();
  }

  let currentUser: any = null;

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT id, role FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (users.length) {
      currentUser = users[0];
    }
  }

  await db.query(
    "UPDATE community_posts SET views = views + 1 WHERE id = ?",
    [postId]
  );

  const [posts]: any = await db.query(
    `
    SELECT 
      p.id,
      p.user_id,
      p.title,
      p.content,
      p.views,
      p.likes,
      p.dislikes,
      p.reports,
      p.is_notice,
      p.is_blind,
      p.created_at,
      u.nickname,
      u.role,
      u.profile_image,
      u.image
    FROM community_posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
    LIMIT 1
    `,
    [postId]
  );

  if (!posts.length) {
    notFound();
  }

  const post = posts[0];
  const isOwner = currentUser?.id === post.user_id;
  const isAdmin = currentUser?.role === "admin";

  if (post.is_blind && !isAdmin) {
    notFound();
  }

  const [images]: any = await db.query(
    "SELECT id, image_url FROM post_images WHERE post_id = ? ORDER BY id ASC",
    [postId]
  );

  const [comments]: any = await db.query(
    `
    SELECT 
      c.id,
      c.user_id,
      c.content,
      c.parent_id,
      c.created_at,
      u.nickname,
      u.role,
      u.profile_image,
      u.image
    FROM community_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.id ASC
    `,
    [postId]
  );

  const parentComments = comments.filter((comment: any) => !comment.parent_id);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-black text-pink-400">자유게시판</h1>

          <a
            href="/board/free"
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700"
          >
            목록
          </a>
        </div>

        <article className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4 flex flex-wrap gap-2">
            {post.is_notice ? (
              <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-black text-black">
                공지사항
              </span>
            ) : null}

            {post.is_blind ? (
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                블라인드 처리됨
              </span>
            ) : null}
          </div>

          <h2 className="mb-4 text-2xl font-black leading-snug">
            {post.title}
          </h2>

          <div className="mb-6 flex flex-wrap gap-x-4 gap-y-2 border-b border-white/10 pb-5 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <ProfileImage src={post.profile_image || post.image} />

              {post.role === "admin" ? (
                <span className="rounded-md bg-purple-600 px-2 py-0.5 text-xs text-white">
                  관리자
                </span>
              ) : null}

              <span className="font-bold text-slate-200">{post.nickname}</span>
            </span>

            <span>조회수: {post.views}</span>
            <span>추천: {post.likes}</span>
            <span>비추천: {post.dislikes}</span>
            <span>신고: {post.reports}</span>
            <span>{formatMonthDay(post.created_at)}</span>
          </div>

          <div className="min-h-32 whitespace-pre-wrap rounded-2xl bg-slate-950/40 p-5 leading-8 text-slate-100">
            {post.content}
          </div>

          {images.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-4">
              {images.map((image: any) => (
                <div key={image.id}>
                  <img
                    src={image.image_url}
                    alt="첨부 이미지"
                    className="w-full rounded-2xl border border-white/10"
                  />

                  {isOwner || isAdmin ? (
                    <ImageDeleteButton imageId={image.id} />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <VoteButtons postId={postId} />
            <ReportButton postId={postId} />

            {isOwner || isAdmin ? (
              <a
                href={`/board/free/${postId}/edit`}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
              >
                수정
              </a>
            ) : null}

            {isAdmin ? (
              <>
                <AdminDeleteButton postId={postId} />
                <BlindToggleButton postId={postId} isBlind={post.is_blind} />
              </>
            ) : null}
          </div>
        </article>

        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-black">댓글 {comments.length}개</h2>

          <div className="space-y-4">
            {parentComments.map((comment: any) => {
              const replies = comments.filter(
                (reply: any) => reply.parent_id === comment.id
              );

              const canManageComment =
                currentUser &&
                (currentUser.id === comment.user_id ||
                  currentUser.role === "admin");

              return (
                <div key={comment.id}>
                  <div className="rounded-2xl bg-slate-800 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ProfileImage src={comment.profile_image || comment.image} />

                        <div>
                          <div className="flex items-center gap-2">
                            {comment.role === "admin" ? (
                              <span className="rounded-md bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">
                                관리자
                              </span>
                            ) : null}

                            <span className="font-black text-white">
                              {comment.nickname}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400">
                            {formatMonthDay(comment.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-slate-200">
                      {comment.content}
                    </p>

                    {canManageComment ? (
                      <div className="mt-3 flex gap-2">
                        <CommentEditButton
                          commentId={comment.id}
                          defaultContent={comment.content}
                        />

                        <CommentDeleteButton commentId={comment.id} />
                      </div>
                    ) : null}

                    <CommentForm postId={postId} parentId={comment.id} />
                  </div>

                  {replies.map((reply: any) => {
                    const canManageReply =
                      currentUser &&
                      (currentUser.id === reply.user_id ||
                        currentUser.role === "admin");

                    return (
                      <div
                        key={reply.id}
                        className="ml-8 mt-3 rounded-2xl border-l-4 border-pink-500 bg-slate-800/70 p-4"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <ProfileImage src={reply.profile_image || reply.image} />

                          <div>
                            <div className="flex items-center gap-2">
                              {reply.role === "admin" ? (
                                <span className="rounded-md bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">
                                  관리자
                                </span>
                              ) : null}

                              <span className="font-black text-white">
                                {reply.nickname}
                              </span>
                            </div>

                            <div className="text-xs text-slate-400">
                              {formatMonthDay(reply.created_at)}
                            </div>
                          </div>
                        </div>

                        <p className="whitespace-pre-wrap text-slate-200">
                          {reply.content}
                        </p>

                        {canManageReply ? (
                          <div className="mt-3 flex gap-2">
                            <CommentEditButton
                              commentId={reply.id}
                              defaultContent={reply.content}
                            />

                            <CommentDeleteButton commentId={reply.id} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {comments.length === 0 ? (
              <p className="text-slate-400">아직 댓글이 없습니다.</p>
            ) : null}
          </div>
        </section>

        <CommentForm postId={postId} />
      </div>
    </main>
  );
}