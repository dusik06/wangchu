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
        <a href="/board/free" className="bg-slate-800 px-4 py-2 rounded-lg">
          목록으로
        </a>

        <article className="bg-slate-900 rounded-2xl p-6 mt-6">
          <h2 className="text-2xl font-bold mb-4">{post.title}</h2>

          <div className="mb-6 flex gap-4 text-sm text-gray-400">
            <span>{post.nickname}</span>
            <span>조회 {post.views}</span>
            <span>추천 {post.likes}</span>
            <span>비추천 {post.dislikes}</span>
            <span>신고 {post.reports}</span>
          </div>

          <div className="whitespace-pre-wrap">{post.content}</div>

          {images.length > 0 && (
            <div className="grid grid-cols-1 gap-4 mt-6">
              {images.map((image: any) => (
                <div key={image.id}>
                  <img
                    src={image.image_url}
                    alt="첨부 이미지"
                    className="w-full rounded-xl"
                  />

                  {(isOwner || isAdmin) && (
                    <ImageDeleteButton imageId={image.id} />
                  )}
                </div>
              ))}
            </div>
          )}

          <VoteButtons postId={postId} />

          <div className="mt-4 flex gap-3 flex-wrap">
            <ReportButton postId={postId} />

            {(isOwner || isAdmin) && (
              <>
                <a
                  href={`/board/free/${postId}/edit`}
                  className="bg-blue-600 px-5 py-2 rounded-lg font-bold"
                >
                  수정
                </a>

                <AdminDeleteButton postId={postId} />
              </>
            )}

            {isAdmin && (
              <BlindToggleButton
                postId={postId}
                isBlind={post.is_blind}
              />
            )}
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
                    <p>{comment.content}</p>

                    {canManageComment && (
                      <div className="mt-3 flex gap-2">
                        <CommentEditButton
                          commentId={comment.id}
                          defaultContent={comment.content}
                        />
                        <CommentDeleteButton commentId={comment.id} />
                      </div>
                    )}

                    <CommentForm postId={postId} parentId={comment.id} />
                  </div>

                  {replies.map((reply: any) => {
                    const canManageReply =
                      currentUser &&
                      (currentUser.id === reply.user_id ||
                        currentUser.role === "admin");

                    return (
                      <div key={reply.id} className="ml-8 mt-3 bg-slate-800/70 p-4 rounded-xl">
                        <p>{reply.content}</p>

                        {canManageReply && (
                          <div className="mt-3 flex gap-2">
                            <CommentEditButton
                              commentId={reply.id}
                              defaultContent={reply.content}
                            />
                            <CommentDeleteButton commentId={reply.id} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>

        <CommentForm postId={postId} />
      </div>
    </main>
  );
}