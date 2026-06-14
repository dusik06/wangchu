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

export default async function FreeBoardDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession();
  const postId = Number(params.id);

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
      u.role
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
    `
    SELECT id, image_url
    FROM post_images
    WHERE post_id = ?
    ORDER BY id ASC
    `,
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
      u.role
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
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-400">자유게시판</h1>

          <a href="/board/free" className="bg-slate-800 px-4 py-2 rounded-lg">
            목록으로
          </a>
        </div>

        <article className="bg-slate-900 rounded-2xl p-6">
          {post.is_notice ? (
            <div className="mb-4 inline-block bg-yellow-500 text-black px-3 py-1 rounded-lg font-bold">
              공지사항
            </div>
          ) : null}

          {post.is_blind ? (
            <div className="mb-4 inline-block bg-red-600 text-white px-3 py-1 rounded-lg font-bold">
              블라인드 처리된 글
            </div>
          ) : null}

          <h2 className="text-2xl font-bold mb-4">{post.title}</h2>

          <div className="flex gap-4 text-gray-400 text-sm mb-6 flex-wrap">
            <span>
              작성자:{" "}
              {post.role === "admin" ? (
                <span className="bg-purple-600 text-white px-2 py-1 rounded-md mr-1">
                  관리자
                </span>
              ) : null}
              {post.nickname}
            </span>

            <span>조회수: {post.views}</span>
            <span>추천: {post.likes}</span>
            <span>비추천: {post.dislikes}</span>
            <span>신고: {post.reports}</span>
            <span>{String(post.created_at).slice(0, 10)}</span>
          </div>

          <div className="whitespace-pre-wrap leading-8 text-gray-100 border-t border-slate-800 pt-6">
            {post.content}
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 mt-6">
              {images.map((image: any) => (
                <div key={image.id}>
                  <img
                    src={image.image_url}
                    alt="첨부 이미지"
                    className="w-full rounded-xl"
                  />

                  {(isOwner || isAdmin) ? (
                    <ImageDeleteButton imageId={image.id} />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <VoteButtons postId={postId} />

          <div className="mt-4 flex gap-3 flex-wrap">
            <ReportButton postId={postId} />

            {(isOwner || isAdmin) ? (
              <>
                <a
                  href={`/board/free/${postId}/edit`}
                  className="bg-blue-600 px-5 py-2 rounded-lg font-bold"
                >
                  수정
                </a>

                <AdminDeleteButton postId={postId} />
              </>
            ) : null}

            {isAdmin ? (
              <BlindToggleButton postId={postId} isBlind={post.is_blind} />
            ) : null}
          </div>
        </article>

        <section className="bg-slate-900 rounded-2xl p-5 mt-6">
          <h2 className="text-xl font-bold mb-4">댓글 {comments.length}개</h2>

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
                  <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex justify-between mb-2">
                      <p className="font-bold">
                        {comment.role === "admin" ? (
                          <span className="bg-purple-600 text-white px-2 py-1 rounded-md text-xs mr-1">
                            관리자
                          </span>
                        ) : null}
                        {comment.nickname}
                      </p>

                      <p className="text-gray-500 text-sm">
                        {String(comment.created_at).slice(0, 10)}
                      </p>
                    </div>

                    <p className="text-gray-200 whitespace-pre-wrap">
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

                  {replies.length > 0 ? (
                    <div className="ml-8 mt-3 space-y-3">
                      {replies.map((reply: any) => {
                        const canManageReply =
                          currentUser &&
                          (currentUser.id === reply.user_id ||
                            currentUser.role === "admin");

                        return (
                          <div
                            key={reply.id}
                            className="bg-slate-800/70 border-l-4 border-pink-500 rounded-xl p-4"
                          >
                            <div className="flex justify-between mb-2">
                              <p className="font-bold">
                                ↳{" "}
                                {reply.role === "admin" ? (
                                  <span className="bg-purple-600 text-white px-2 py-1 rounded-md text-xs mr-1">
                                    관리자
                                  </span>
                                ) : null}
                                {reply.nickname}
                              </p>

                              <p className="text-gray-500 text-sm">
                                {String(reply.created_at).slice(0, 10)}
                              </p>
                            </div>

                            <p className="text-gray-200 whitespace-pre-wrap">
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
                  ) : null}
                </div>
              );
            })}

            {comments.length === 0 ? (
              <p className="text-gray-400">아직 댓글이 없습니다.</p>
            ) : null}
          </div>
        </section>

        <CommentForm postId={postId} />
      </div>
    </main>
  );
}