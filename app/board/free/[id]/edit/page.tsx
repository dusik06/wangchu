import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import EditForm from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const postId = Number(resolvedParams.id);
  if (!postId) notFound();

  const session = await getServerSession();
  let isAdmin = false;

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT role FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );
    isAdmin = users[0]?.role === "admin";
  }

  const [posts]: any = await db.query(
    "SELECT id, title, content FROM community_posts WHERE id = ? LIMIT 1",
    [postId]
  );
  if (!posts.length) notFound();

  const [images]: any = await db.query(
    "SELECT id, image_url FROM post_images WHERE post_id = ? ORDER BY id ASC",
    [postId]
  );

  let isMainPost = false;
  if (isAdmin) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS community_main_posts (
        post_id INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (post_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    const [mainRows]: any = await db.query(
      "SELECT post_id FROM community_main_posts WHERE post_id = ? LIMIT 1",
      [postId]
    );
    isMainPost = mainRows.length > 0;
  }

  const post = posts[0];

  return (
    <main className="min-h-screen bg-[#0b0718] text-white">
      <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <div>
            <p className="text-xs font-bold text-purple-300">왕츄 카페</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">게시글 수정</h1>
          </div>
          <a
            href={`/board/free/${postId}`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-200"
          >
            돌아가기
          </a>
        </div>

        <EditForm
          postId={post.id}
          defaultTitle={post.title}
          defaultContent={post.content}
          defaultImages={images}
          isAdmin={isAdmin}
          defaultIsMainPost={isMainPost}
        />
      </div>
    </main>
  );
}
